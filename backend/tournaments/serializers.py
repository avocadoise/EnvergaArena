from rest_framework import serializers
from .models import (
    EventSchedule, Athlete, EventRegistration, RosterEntry,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)
from core.models import Department


# ---------------------------------------------------------------------------
# Schedule / participants
# ---------------------------------------------------------------------------

class AthleteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Athlete
        fields = '__all__'

class RosterEntrySerializer(serializers.ModelSerializer):
    athlete_name = serializers.CharField(source='athlete.full_name', read_only=True)
    student_number = serializers.CharField(source='athlete.student_number', read_only=True)

    class Meta:
        model = RosterEntry
        fields = ['id', 'athlete', 'athlete_name', 'student_number', 'is_eligible']

class EventRegistrationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    roster = RosterEntrySerializer(many=True, read_only=True)

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'schedule', 'department', 'department_name', 'department_acronym',
            'status', 'admin_notes', 'submitted_by', 'roster', 'created_at', 'updated_at'
        ]

class EventScheduleSerializer(serializers.ModelSerializer):
    registrations = EventRegistrationSerializer(many=True, read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    result_family = serializers.CharField(source='event.result_family', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_area_name = serializers.CharField(source='venue_area.name', read_only=True)

    class Meta:
        model = EventSchedule
        fields = [
            'id', 'event', 'event_name', 'result_family',
            'venue', 'venue_name', 'venue_area', 'venue_area_name',
            'scheduled_start', 'scheduled_end', 'notes',
            'registrations',
            'created_at', 'updated_at',
        ]


# ---------------------------------------------------------------------------
# match_based results
# ---------------------------------------------------------------------------

class MatchSetScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchSetScore
        fields = ['id', 'set_number', 'home_score', 'away_score']


class MatchResultSerializer(serializers.ModelSerializer):
    sets = MatchSetScoreSerializer(many=True, read_only=True)
    home_department_name = serializers.CharField(source='home_department.name', read_only=True)
    away_department_name = serializers.CharField(source='away_department.name', read_only=True)
    winner_name = serializers.CharField(source='winner.name', read_only=True, allow_null=True)
    event_name = serializers.CharField(source='schedule.event.name', read_only=True)

    class Meta:
        model = MatchResult
        fields = [
            'id', 'schedule', 'event_name',
            'home_department', 'home_department_name',
            'away_department', 'away_department_name',
            'home_score', 'away_score',
            'winner', 'winner_name', 'is_draw',
            'is_final', 'sets',
            'recorded_at', 'updated_at',
        ]
        read_only_fields = ['recorded_at', 'updated_at']


class MatchResultWriteSerializer(serializers.ModelSerializer):
    """Write serializer — auto-derives winner from scores when not provided."""

    class Meta:
        model = MatchResult
        fields = [
            'schedule', 'home_department', 'away_department',
            'home_score', 'away_score', 'winner', 'is_draw', 'is_final',
        ]

    def validate(self, data):
        if not data.get('is_draw') and not data.get('winner'):
            if data['home_score'] > data['away_score']:
                data['winner'] = data['home_department']
            elif data['away_score'] > data['home_score']:
                data['winner'] = data['away_department']
            else:
                data['is_draw'] = True
        return data


# ---------------------------------------------------------------------------
# rank_based results
# ---------------------------------------------------------------------------

class PodiumResultSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    event_name = serializers.CharField(source='schedule.event.name', read_only=True)

    class Meta:
        model = PodiumResult
        fields = [
            'id', 'schedule', 'event_name',
            'department', 'department_name', 'department_acronym',
            'rank', 'medal', 'points_awarded', 'is_final',
            'recorded_at', 'updated_at',
        ]
        read_only_fields = ['recorded_at', 'updated_at']


# ---------------------------------------------------------------------------
# Medal ledger & tally
# ---------------------------------------------------------------------------

class MedalRecordSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = MedalRecord
        fields = [
            'id', 'department', 'department_name', 'department_acronym',
            'event', 'event_name', 'medal', 'recorded_at',
        ]


class MedalTallySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    department_color = serializers.CharField(source='department.color_code', read_only=True)

    class Meta:
        model = MedalTally
        fields = [
            'id', 'department', 'department_name', 'department_acronym', 'department_color',
            'gold', 'silver', 'bronze', 'total_points', 'last_updated',
        ]
