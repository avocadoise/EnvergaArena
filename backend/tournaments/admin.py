from django.contrib import admin
from .models import (
    EventSchedule, EventParticipant,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)


class EventParticipantInline(admin.TabularInline):
    model = EventParticipant
    extra = 1


class MatchSetScoreInline(admin.TabularInline):
    model = MatchSetScore
    extra = 0


@admin.register(EventSchedule)
class EventScheduleAdmin(admin.ModelAdmin):
    list_display = ['event', 'venue', 'scheduled_start', 'scheduled_end']
    list_filter = ['event__category', 'venue']
    inlines = [EventParticipantInline]


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
    list_display = ['department', 'gold', 'silver', 'bronze', 'total_points', 'last_updated']
    readonly_fields = ['gold', 'silver', 'bronze', 'total_points', 'last_updated']
