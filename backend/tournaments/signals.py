"""
Signal handlers: recompute MedalTally whenever MedalRecord changes.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Count, Sum, Q

from .models import MedalRecord, MedalTally
from core.models import Department


def _recompute_tally(department):
    """Rebuild MedalTally for a single department from MedalRecord rows."""
    records = MedalRecord.objects.filter(department=department)
    gold   = records.filter(medal='gold').count()
    silver = records.filter(medal='silver').count()
    bronze = records.filter(medal='bronze').count()
    # Points: configurable later; default 3/2/1
    total_points = (gold * 3) + (silver * 2) + (bronze * 1)

    MedalTally.objects.update_or_create(
        department=department,
        defaults={
            'gold': gold,
            'silver': silver,
            'bronze': bronze,
            'total_points': total_points,
        }
    )


@receiver(post_save, sender=MedalRecord)
def on_medal_record_saved(sender, instance, **kwargs):
    _recompute_tally(instance.department)


@receiver(post_delete, sender=MedalRecord)
def on_medal_record_deleted(sender, instance, **kwargs):
    _recompute_tally(instance.department)
