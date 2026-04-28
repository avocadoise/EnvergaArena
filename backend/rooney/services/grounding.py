"""
Fetch live structured data and build Rooney's grounding context.
"""
from datetime import timedelta

from django.utils import timezone

from core.models import NewsArticle
from tournaments.models import EventSchedule, MatchResult, MedalTally, PodiumResult


def build_grounding_context() -> dict:
    lines = []
    source_labels = []
    today = timezone.localdate()

    tally = list(
        MedalTally.objects.select_related('department').order_by('-gold', '-silver', '-bronze', 'department__name')[:8]
    )
    if tally:
        source_labels.append('official_medal_tally')
        lines.append("=== CURRENT MEDAL TALLY (Rank: Gold, then Silver, then Bronze) ===")
        for rank, row in enumerate(tally, 1):
            total_medals = row.gold + row.silver + row.bronze
            lines.append(
                f"  #{rank}. {row.department.name} ({row.department.acronym}): "
                f"G{row.gold} S{row.silver} B{row.bronze} | {total_medals} medals"
            )

    todays_schedules = (
        EventSchedule.objects
        .select_related('event', 'venue', 'venue_area')
        .filter(scheduled_start__date=today)
        .order_by('scheduled_start')
    )
    if todays_schedules:
        source_labels.append("Today's Schedule")
        lines.append(f"\n=== TODAY'S EVENTS ({today}) ===")
        for schedule in todays_schedules:
            venue_name = schedule.venue.name if schedule.venue else 'TBA'
            area_name = f" / {schedule.venue_area.name}" if schedule.venue_area else ''
            time_value = schedule.scheduled_start.strftime('%I:%M %p') if schedule.scheduled_start else 'TBA'
            lines.append(f"  - {schedule.event.name} at {time_value} | {venue_name}{area_name}")

    upcoming = (
        EventSchedule.objects
        .select_related('event', 'venue')
        .filter(
            scheduled_start__date__gt=today,
            scheduled_start__date__lte=today + timedelta(days=3),
        )
        .order_by('scheduled_start')[:10]
    )
    if upcoming:
        source_labels.append('Upcoming Schedule')
        lines.append("\n=== UPCOMING EVENTS (Next 3 Days) ===")
        for schedule in upcoming:
            date_value = schedule.scheduled_start.strftime('%a, %b %d') if schedule.scheduled_start else 'TBA'
            venue_name = schedule.venue.name if schedule.venue else 'TBA'
            lines.append(f"  - {schedule.event.name} on {date_value} | {venue_name}")

    recent_matches = (
        MatchResult.objects
        .select_related('schedule__event', 'home_department', 'away_department', 'winner')
        .filter(is_final=True)
        .order_by('-recorded_at')[:5]
    )
    if recent_matches:
        source_labels.append('Match Results')
        lines.append("\n=== RECENT MATCH RESULTS (Final) ===")
        for match in recent_matches:
            winner_text = f" | Winner: {match.winner.name}" if match.winner else (" | Draw" if match.is_draw else "")
            lines.append(
                f"  - {match.schedule.event.name}: "
                f"{match.home_department.acronym} {match.home_score} - "
                f"{match.away_score} {match.away_department.acronym}{winner_text}"
            )

    recent_podiums = (
        PodiumResult.objects
        .select_related('schedule__event', 'department')
        .filter(is_final=True)
        .order_by('-recorded_at')[:5]
    )
    if recent_podiums:
        source_labels.append('Podium Results')
        lines.append("\n=== RECENT RANKED RESULTS (Final) ===")
        for podium in recent_podiums:
            lines.append(
                f"  - {podium.schedule.event.name}: "
                f"Rank {podium.rank} -> {podium.department.name} ({podium.medal.upper()})"
            )

    published_news = (
        NewsArticle.objects
        .select_related('event', 'department')
        .filter(status='published')
        .order_by('-published_at', '-updated_at')[:5]
    )
    if published_news:
        source_labels.append('Published News')
        lines.append("\n=== LATEST OFFICIAL NEWS ===")
        for article in published_news:
            scope = article.event.name if article.event else (article.department.name if article.department else 'General')
            lines.append(
                f"  - {article.title} [{article.get_article_type_display()}] | Scope: {scope} | Summary: {article.summary}"
            )

    return {
        'text': "\n".join(lines) if lines else 'No live data available at this time.',
        'source_labels': source_labels,
    }
