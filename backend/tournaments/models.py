from django.db import models
from core.models import Department, Venue, VenueArea
from events.models import Event


class EventSchedule(models.Model):
    """Links an Event to a specific venue, time slot, and participating departments."""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
        ('postponed', 'Postponed'),
        ('cancelled', 'Cancelled'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='schedules')
    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True)
    venue_area = models.ForeignKey(VenueArea, on_delete=models.SET_NULL, null=True, blank=True)
    phase = models.CharField(max_length=120, blank=True)
    round_label = models.CharField(max_length=120, blank=True)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
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


class EmailVerificationCode(models.Model):
    """Hashed OTP metadata for public tryout application email verification."""
    email = models.EmailField()
    student_number = models.CharField(max_length=50)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='tryout_email_codes')
    schedule = models.ForeignKey(EventSchedule, on_delete=models.CASCADE, related_name='tryout_email_codes')
    code_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'student_number', 'department', 'schedule']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.email} - {self.schedule.event.name}"


class TryoutApplication(models.Model):
    """Verified public tryout application reviewed by one department representative."""
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('selected', 'Selected'),
        ('not_selected', 'Not Selected'),
        ('waitlisted', 'Waitlisted'),
        ('withdrawn', 'Withdrawn'),
    ]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='tryout_applications')
    schedule = models.ForeignKey(EventSchedule, on_delete=models.CASCADE, related_name='tryout_applications')
    student_number = models.CharField(max_length=50)
    full_name = models.CharField(max_length=255)
    school_email = models.EmailField()
    contact_number = models.CharField(max_length=30, blank=True)
    program_course = models.CharField(max_length=100)
    year_level = models.CharField(max_length=20)
    prior_experience = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    email_verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=12, blank=True)
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_tryout_applications',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    converted_athlete = models.OneToOneField(
        Athlete,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_tryout_application',
    )
    created_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('school_email', 'schedule')

    def __str__(self):
        return f"{self.full_name} - {self.department.acronym} {self.schedule.event.name}"


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
    Sort order: gold DESC, silver DESC, bronze DESC.
    """
    department = models.OneToOneField(Department, on_delete=models.CASCADE, related_name='medal_tally')
    gold = models.IntegerField(default=0)
    silver = models.IntegerField(default=0)
    bronze = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-gold', '-silver', '-bronze', 'department__name']
        verbose_name_plural = 'Medal Tallies'

    def __str__(self):
        return (
            f"{self.department.acronym}: "
            f"G{self.gold} S{self.silver} B{self.bronze}"
        )
