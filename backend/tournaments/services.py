"""
Service layer: write MedalRecord entries from final results.
Called by ViewSet perform_create/perform_update when is_final=True.

Design:
- match_based: winner → gold, loser → silver (for finals), draw unsupported for medals
- rank_based:  rank 1 → gold, rank 2 → silver, rank 3 → bronze
- Each (department, event) pair gets at most 1 MedalRecord (unique_together enforced).
- To correct a mistake: delete old MatchResult/PodiumResult or set is_final=False,
  then delete the MedalRecord manually; re-save with is_final=True.
"""
from .models import MedalRecord


def apply_final_match_result(match_result):
    """
    Write MedalRecord for a finalized MatchResult (gold for winner).
    Only applies when match is_final=True.
    For a championship final: winner gets gold, loser gets silver.
    For bronze/third-place matches: winner gets bronze.
    Caller decides medal type via the match's schedule event category context.
    Default for now: winner → gold, loser → silver.
    """
    if not match_result.is_final:
        return

    event = match_result.schedule.event

    if match_result.winner:
        # Winner gets gold
        MedalRecord.objects.update_or_create(
            department=match_result.winner,
            event=event,
            defaults={'medal': 'gold', 'source_match': match_result, 'source_podium': None},
        )
        # Loser gets silver
        loser = (
            match_result.away_department
            if match_result.winner == match_result.home_department
            else match_result.home_department
        )
        MedalRecord.objects.update_or_create(
            department=loser,
            event=event,
            defaults={'medal': 'silver', 'source_match': match_result, 'source_podium': None},
        )


def apply_final_podium_result(podium_result):
    """
    Write MedalRecord for a finalized PodiumResult.
    Only rank 1/2/3 with medal != 'none' get ledger entries.
    """
    if not podium_result.is_final:
        return
    if podium_result.medal == 'none':
        return

    event = podium_result.schedule.event
    MedalRecord.objects.update_or_create(
        department=podium_result.department,
        event=event,
        defaults={
            'medal': podium_result.medal,
            'source_match': None,
            'source_podium': podium_result,
        },
    )
