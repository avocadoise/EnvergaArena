from django.db import models
from core.models import Department, Venue, VenueArea
from events.models import Event


class EventSchedule(models.Model):
    """Links an Event to a specific venue, time slot, and participating departments."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='schedules')
    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True)
    venue_area = models.ForeignKey(VenueArea, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.event.name} @ {self.venue} ({self.scheduled_start})"


class Athlete(models.Model):
    """Student athlete master record for a department."""
    student_number = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='athletes')
    program_course = models.CharField(max_length=100)
    year_level = models.CharField(max_length=20)
    is_enrolled = models.BooleanField(default=True)
    medical_cleared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.student_number})"


class EventRegistration(models.Model):
    """A department's submission to compete in a specific EventSchedule."""
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('pending', 'Pending Review'),
        ('needs_revision', 'Needs Revision'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    schedule = models.ForeignKey(EventSchedule, on_delete=models.CASCADE, related_name='registrations')
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    admin_notes = models.TextField(blank=True)
    submitted_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('schedule', 'department')

    def __str__(self):
        return f"{self.department.acronym} - {self.schedule.event.name} ({self.status})"


class RosterEntry(models.Model):
    """An athlete tied to a specific EventRegistration."""
    registration = models.ForeignKey(EventRegistration, on_delete=models.CASCADE, related_name='roster')
    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE)
    is_eligible = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('registration', 'athlete')

    def __str__(self):
        return f"{self.athlete.full_name} in {self.registration}"


# ---------------------------------------------------------------------------
# match_based result family
# ---------------------------------------------------------------------------

class MatchResult(models.Model):
    """Head-to-head result for match_based events (e.g. basketball, volleyball)."""
    schedule = models.OneToOneField(EventSchedule, on_delete=models.CASCADE, related_name='match_result')
    home_department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='home_matches')
    away_department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='away_matches')
    home_score = models.IntegerField(default=0)
    away_score = models.IntegerField(default=0)
    winner = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_matches'
    )
    is_draw = models.BooleanField(default=False)
    is_final = models.BooleanField(default=False, help_text="True = determines medals")
    recorded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recorded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )

    def __str__(self):
        return (
            f"{self.schedule.event.name}: "
            f"{self.home_department.acronym} {self.home_score} - "
            f"{self.away_score} {self.away_department.acronym}"
        )


class MatchSetScore(models.Model):
    """Per-set/period breakdown for a MatchResult (optional, e.g. volleyball sets)."""
    match = models.ForeignKey(MatchResult, on_delete=models.CASCADE, related_name='sets')
    set_number = models.PositiveSmallIntegerField()
    home_score = models.IntegerField(default=0)
    away_score = models.IntegerField(default=0)

    class Meta:
        ordering = ['set_number']
        unique_together = ('match', 'set_number')

    def __str__(self):
        return f"Set {self.set_number}: {self.home_score}-{self.away_score}"


# ---------------------------------------------------------------------------
# rank_based result family
# ---------------------------------------------------------------------------

class PodiumResult(models.Model):
    """Ranked placement result for rank_based events (e.g. chess, swimming, athletics)."""
    MEDAL_CHOICES = [
        ('gold', 'Gold'),
        ('silver', 'Silver'),
        ('bronze', 'Bronze'),
        ('none', 'None'),
    ]

    schedule = models.ForeignKey(EventSchedule, on_delete=models.CASCADE, related_name='podium_results')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='podium_placements')
    rank = models.PositiveSmallIntegerField()
    medal = models.CharField(max_length=10, choices=MEDAL_CHOICES, default='none')
    points_awarded = models.IntegerField(default=0)
    is_final = models.BooleanField(default=False, help_text="True = determines medals")
    recorded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recorded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ['rank']
        unique_together = ('schedule', 'rank')

    def __str__(self):
        return f"{self.schedule.event.name} Rank {self.rank}: {self.department.acronym} ({self.medal})"


# ---------------------------------------------------------------------------
# Immutable medal ledger — written once when is_final result saved
# ---------------------------------------------------------------------------

class MedalRecord(models.Model):
    """
    Immutable ledger entry. One row per (department, event, medal_type).
    Created by post_save signal when a final result is recorded.
    Never updated; if result corrected, old record is deleted and new one created.
    """
    MEDAL_CHOICES = [
        ('gold', 'Gold'),
        ('silver', 'Silver'),
        ('bronze', 'Bronze'),
    ]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='medal_records')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='medal_records')
    medal = models.CharField(max_length=10, choices=MEDAL_CHOICES)
    source_match = models.ForeignKey(
        MatchResult, on_delete=models.SET_NULL, null=True, blank=True
    )
    source_podium = models.ForeignKey(
        PodiumResult, on_delete=models.SET_NULL, null=True, blank=True
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One medal per dept per event
        unique_together = ('department', 'event')

    def __str__(self):
        return f"{self.department.acronym} - {self.medal.upper()} - {self.event.name}"


# ---------------------------------------------------------------------------
# Computed standings (rebuilt on every final result change)
# ---------------------------------------------------------------------------

class MedalTally(models.Model):
    """
    Aggregated standing per department for display. Recomputed via signal/service
    whenever a MedalRecord is created or deleted. Not a source of truth — derived data.
    Sort order: gold DESC, silver DESC, bronze DESC, total_points DESC.
    """
    department = models.OneToOneField(Department, on_delete=models.CASCADE, related_name='medal_tally')
    gold = models.IntegerField(default=0)
    silver = models.IntegerField(default=0)
    bronze = models.IntegerField(default=0)
    total_points = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-gold', '-silver', '-bronze', '-total_points']
        verbose_name_plural = 'Medal Tallies'

    def __str__(self):
        return (
            f"{self.department.acronym}: "
            f"G{self.gold} S{self.silver} B{self.bronze} Pts{self.total_points}"
        )
