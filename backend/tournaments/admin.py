from django.contrib import admin
from .models import (
    EventSchedule, Athlete, EmailVerificationCode, TryoutApplication, EventRegistration, RosterEntry,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)


class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 1

class RosterEntryInline(admin.TabularInline):
    model = RosterEntry
    extra = 1

class MatchSetScoreInline(admin.TabularInline):
    model = MatchSetScore
    extra = 0

@admin.register(EventSchedule)
class EventScheduleAdmin(admin.ModelAdmin):
    list_display = ['event', 'venue', 'scheduled_start', 'scheduled_end']
    list_filter = ['event__category', 'venue']
    inlines = [EventRegistrationInline]

@admin.register(Athlete)
class AthleteAdmin(admin.ModelAdmin):
    list_display = ['student_number', 'full_name', 'department', 'program_course', 'year_level', 'is_enrolled', 'medical_cleared']
    list_filter = ['department', 'is_enrolled', 'medical_cleared']
    search_fields = ['full_name', 'student_number']


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ['email', 'student_number', 'department', 'schedule', 'expires_at', 'used_at', 'attempt_count']
    list_filter = ['department', 'schedule__event', 'used_at']
    search_fields = ['email', 'student_number']
    readonly_fields = ['code_hash', 'created_at']


@admin.register(TryoutApplication)
class TryoutApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'student_number', 'department', 'schedule', 'email_verified', 'status', 'submitted_at', 'converted_athlete']
    list_filter = ['department', 'status', 'email_verified', 'schedule__event']
    search_fields = ['full_name', 'student_number', 'school_email']


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'department', 'status', 'submitted_by', 'created_at']
    list_filter = ['status', 'department', 'schedule__event']
    inlines = [RosterEntryInline]


@admin.register(MatchResult)
class MatchResultAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'home_department', 'home_score', 'away_score', 'away_department', 'winner', 'is_final']
    list_filter = ['is_final', 'schedule__event__category']
    inlines = [MatchSetScoreInline]


@admin.register(PodiumResult)
class PodiumResultAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'department', 'rank', 'medal', 'is_final']
    list_filter = ['medal', 'is_final']


@admin.register(MedalRecord)
class MedalRecordAdmin(admin.ModelAdmin):
    list_display = ['department', 'event', 'medal', 'recorded_at']
    list_filter = ['medal']
    readonly_fields = ['recorded_at']


@admin.register(MedalTally)
class MedalTallyAdmin(admin.ModelAdmin):
    list_display = ['department', 'gold', 'silver', 'bronze', 'last_updated']
    readonly_fields = ['gold', 'silver', 'bronze', 'last_updated']
