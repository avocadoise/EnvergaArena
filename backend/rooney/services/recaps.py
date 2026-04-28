import json
import os

from django.db import transaction
from django.utils import timezone

from core.models import NewsArticle
from tournaments.models import EventSchedule, MatchResult, MedalTally, PodiumResult
from ..models import AIRecap
from .model_fallbacks import get_gemini_model_chain, is_retryable_model_error

try:
    from google import genai
    from google.genai import types
except Exception:  # pragma: no cover - optional at runtime
    genai = None
    types = None


RECAP_SCHEMA = {
    "type": "object",
    "properties": {
        "generated_title": {"type": "string"},
        "generated_summary": {"type": "string"},
        "generated_body": {"type": "string"},
    },
    "required": ["generated_title", "generated_summary", "generated_body"],
}

RECAP_PROMPT_TEMPLATE = """You are the Enverga Arena recap assistant.

Write a short official sports recap draft using only the structured snapshot below.
Rules:
1. Use only the provided facts.
2. Do not invent player names, quotes, attendance, weather, or crowd details.
3. If a fact is missing, omit it.
4. Keep the tone official and concise.
5. The output must be valid JSON matching the response schema.

SNAPSHOT:
{snapshot}
"""


def _leaderboard_snapshot(limit=3):
    tally = list(
        MedalTally.objects.select_related('department').order_by('-gold', '-silver', '-bronze', 'department__name')[:limit]
    )
    return [
        {
            'department': row.department.name,
            'acronym': row.department.acronym,
            'gold': row.gold,
            'silver': row.silver,
            'bronze': row.bronze,
        }
        for row in tally
    ]


def _schedule_context(schedule):
    return {
        'schedule_id': schedule.id,
        'event_title': schedule.event.name,
        'category': schedule.event.category.name,
        'result_mode': schedule.event.result_family,
        'scheduled_start': schedule.scheduled_start.isoformat() if schedule.scheduled_start else None,
        'venue': schedule.venue.name if schedule.venue else None,
        'venue_area': schedule.venue_area.name if schedule.venue_area else None,
    }


def build_match_recap_snapshot(match_result):
    schedule = match_result.schedule
    medal_outcomes = []
    if match_result.winner:
        medal_outcomes = [
            {'department': match_result.winner.name, 'medal': 'gold'},
            {
                'department': (
                    match_result.away_department.name
                    if match_result.winner_id == match_result.home_department_id
                    else match_result.home_department.name
                ),
                'medal': 'silver',
            },
        ]

    return {
        'trigger_type': 'event_completion',
        'generated_at': timezone.now().isoformat(),
        'schedule': _schedule_context(schedule),
        'match_result': {
            'id': match_result.id,
            'home_department': match_result.home_department.name,
            'away_department': match_result.away_department.name,
            'home_score': match_result.home_score,
            'away_score': match_result.away_score,
            'winner': match_result.winner.name if match_result.winner else None,
            'is_draw': match_result.is_draw,
            'is_final': match_result.is_final,
        },
        'medal_outcomes': medal_outcomes,
        'leaderboard_top': _leaderboard_snapshot(),
    }


def build_podium_recap_snapshot(schedule):
    final_podiums = list(
        schedule.podium_results.select_related('department').filter(is_final=True).order_by('rank')
    )
    return {
        'trigger_type': 'medal_update',
        'generated_at': timezone.now().isoformat(),
        'schedule': _schedule_context(schedule),
        'podium_results': [
            {
                'id': podium.id,
                'rank': podium.rank,
                'department': podium.department.name,
                'department_acronym': podium.department.acronym,
                'medal': podium.medal,
            }
            for podium in final_podiums
        ],
        'leaderboard_top': _leaderboard_snapshot(),
    }


def _template_copy(snapshot):
    schedule = snapshot.get('schedule', {})
    leaderboard = snapshot.get('leaderboard_top', [])
    event_title = schedule.get('event_title', 'Intramurals event')
    leader_line = ''
    if leaderboard:
        leader = leaderboard[0]
        leader_line = (
            f" The current medal-table leader remains {leader['department']} "
            f"with {leader['gold']} gold, {leader['silver']} silver, and {leader['bronze']} bronze medals."
        )

    if snapshot.get('match_result'):
        match = snapshot['match_result']
        winner = match.get('winner') or 'No winner recorded'
        title = f"{event_title}: {winner} secures the official final result"
        summary = (
            f"{winner} completed {event_title} with a final score of "
            f"{match['home_score']}-{match['away_score']}."
        )
        body = (
            f"{event_title} has been finalized in the Enverga Arena results ledger. "
            f"{match['home_department']} and {match['away_department']} completed the scheduled match, "
            f"with the official result recorded at {match['home_score']}-{match['away_score']}. "
            f"The winner on record is {winner}.{leader_line}"
        )
        return title, summary, body

    podiums = snapshot.get('podium_results', [])
    if podiums:
        title = f"{event_title}: podium recap ready after final placements"
        top = podiums[0]
        summary = f"{top['department']} claimed the top podium place in {event_title}."
        placement_text = ', '.join(
            f"Rank {podium['rank']}: {podium['department']} ({podium['medal']})"
            for podium in podiums
        )
        body = (
            f"The final placements for {event_title} are now official. "
            f"{placement_text}.{leader_line}"
        )
        return title, summary, body

    title = f"{event_title}: recap draft generated"
    summary = f"A grounded recap draft was generated for {event_title}."
    body = f"A structured recap draft is available for {event_title}.{leader_line}"
    return title, summary, body


def generate_recap_copy(snapshot):
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not api_key or genai is None or types is None:
        title, summary, body = _template_copy(snapshot)
        return {
            'generated_title': title,
            'generated_summary': summary,
            'generated_body': body,
            'model_name': 'template-grounded-v1',
            'prompt_version': 'recap_v1',
        }

    client = genai.Client(api_key=api_key)
    for model_name in get_gemini_model_chain():
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=RECAP_PROMPT_TEMPLATE.format(snapshot=json.dumps(snapshot, indent=2)),
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=768,
                    response_mime_type='application/json',
                    response_schema=RECAP_SCHEMA,
                ),
            )
            parsed = json.loads(response.text.strip())
            return {
                'generated_title': parsed['generated_title'],
                'generated_summary': parsed['generated_summary'],
                'generated_body': parsed['generated_body'],
                'model_name': model_name,
                'prompt_version': 'recap_v1',
            }
        except Exception as exc:
            if not is_retryable_model_error(exc):
                break

    title, summary, body = _template_copy(snapshot)
    return {
        'generated_title': title,
        'generated_summary': summary,
        'generated_body': body,
        'model_name': 'template-grounded-fallback',
        'prompt_version': 'recap_v1',
    }


def _citation_map_for_snapshot(snapshot):
    citations = {'sources': []}
    if snapshot.get('match_result'):
        citations['sources'].append('final_match_result')
    if snapshot.get('podium_results'):
        citations['sources'].append('final_podium_results')
    if snapshot.get('leaderboard_top'):
        citations['sources'].append('official_medal_tally')
    if snapshot.get('schedule'):
        citations['sources'].append('event_schedule')
    return citations


@transaction.atomic
def upsert_ai_recap(*, trigger_type, scope_type, scope_key, event=None, department=None, snapshot):
    copy = generate_recap_copy(snapshot)
    recap, _ = AIRecap.objects.update_or_create(
        scope_type=scope_type,
        scope_key=scope_key,
        defaults={
            'trigger_type': trigger_type,
            'event': event,
            'department': department,
            'input_snapshot_json': snapshot,
            'generated_title': copy['generated_title'],
            'generated_summary': copy['generated_summary'],
            'generated_body': copy['generated_body'],
            'model_name': copy['model_name'],
            'prompt_version': copy['prompt_version'],
            'citation_map_json': _citation_map_for_snapshot(snapshot),
            'status': 'generated',
            'generated_at': timezone.now(),
        },
    )
    return recap


def generate_recap_for_match_result(match_result):
    if not match_result.is_final:
        return None
    snapshot = build_match_recap_snapshot(match_result)
    return upsert_ai_recap(
        trigger_type='event_completion',
        scope_type='match_result',
        scope_key=f'match:{match_result.id}',
        event=match_result.schedule.event,
        snapshot=snapshot,
    )


def generate_recap_for_podium_schedule(schedule):
    final_podiums = schedule.podium_results.filter(is_final=True)
    if not final_podiums.exists():
        return None
    snapshot = build_podium_recap_snapshot(schedule)
    top_department = final_podiums.filter(rank=1).select_related('department').first()
    return upsert_ai_recap(
        trigger_type='medal_update',
        scope_type='podium_schedule',
        scope_key=f'podium_schedule:{schedule.id}',
        event=schedule.event,
        department=top_department.department if top_department else None,
        snapshot=snapshot,
    )


def generate_manual_recap(schedule=None, match_result=None):
    if match_result is not None:
        return generate_recap_for_match_result(match_result)
    if schedule is not None:
        if schedule.event.result_family == 'match_based':
            latest_match = MatchResult.objects.filter(schedule=schedule, is_final=True).first()
            if latest_match:
                return generate_recap_for_match_result(latest_match)
        return generate_recap_for_podium_schedule(schedule)

    latest_match = MatchResult.objects.filter(is_final=True).order_by('-updated_at').first()
    latest_podium_schedule = (
        EventSchedule.objects.filter(podium_results__is_final=True)
        .distinct()
        .order_by('-updated_at')
        .first()
    )
    if latest_match and (not latest_podium_schedule or latest_match.updated_at >= latest_podium_schedule.updated_at):
        return generate_recap_for_match_result(latest_match)
    if latest_podium_schedule:
        return generate_recap_for_podium_schedule(latest_podium_schedule)
    return None


@transaction.atomic
def publish_recap_to_news(recap, user):
    article_type = 'result_recap' if recap.trigger_type in {'event_completion', 'medal_update'} else 'highlight'
    news_defaults = {
        'title': recap.generated_title,
        'summary': recap.generated_summary,
        'body_md': recap.generated_body,
        'article_type': article_type,
        'source_label': 'AI Recap Review Desk',
        'event': recap.event,
        'department': recap.department,
        'status': 'published',
        'published_at': timezone.now(),
        'ai_generated': True,
        'reviewed_by': user,
    }
    if recap.linked_news_article_id:
        article = recap.linked_news_article
        for field, value in news_defaults.items():
            setattr(article, field, value)
        article.save()
    else:
        article = NewsArticle.objects.create(
            slug=f"{recap.scope_key.replace(':', '-')}-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            created_by=user,
            **news_defaults,
        )
        recap.linked_news_article = article

    recap.status = 'published'
    recap.reviewed_by = user
    recap.reviewed_at = timezone.now()
    recap.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'linked_news_article', 'updated_at'])
    return article
