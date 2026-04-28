from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import (
    EventSchedule, Athlete, EmailVerificationCode, TryoutApplication, EventRegistration, RosterEntry,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)
from core.models import Department
from .tryout_services import get_recent_verified_code, validate_school_email


# ---------------------------------------------------------------------------
# Schedule / participants
# ---------------------------------------------------------------------------

class AthleteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Athlete
        fields = '__all__'


class TryoutApplicationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    schedule_event_name = serializers.CharField(source='schedule.event.name', read_only=True)
    schedule_category = serializers.CharField(source='schedule.event.category.name', read_only=True)
    schedule_start = serializers.DateTimeField(source='schedule.scheduled_start', read_only=True)
    venue_name = serializers.CharField(source='schedule.venue.name', read_only=True, allow_null=True)
    converted_athlete_name = serializers.CharField(source='converted_athlete.full_name', read_only=True, allow_null=True)

    class Meta:
        model = TryoutApplication
        fields = [
            'id', 'department', 'department_name', 'department_acronym',
            'schedule', 'schedule_event_name', 'schedule_category', 'schedule_start', 'venue_name',
            'student_number', 'full_name', 'school_email', 'contact_number',
            'program_course', 'year_level', 'prior_experience', 'notes',
            'email_verified', 'verified_at', 'status', 'review_notes',
            'reviewed_by', 'reviewed_at', 'converted_athlete', 'converted_athlete_name',
            'created_ip', 'user_agent', 'submitted_at', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'email_verified', 'verified_at', 'reviewed_by', 'reviewed_at',
            'converted_athlete', 'created_ip', 'user_agent', 'submitted_at', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if user and user.is_authenticated and not (user.is_staff or user.is_superuser):
            profile = getattr(user, 'profile', None)
            profile_department = getattr(profile, 'department', None)
            if not profile_department:
                raise serializers.ValidationError({
                    'department': 'Your account is not linked to a department.'
                })
            attrs['department'] = profile_department

        department = attrs.get('department') or getattr(self.instance, 'department', None)
        schedule = attrs.get('schedule') or getattr(self.instance, 'schedule', None)

        if not department:
            raise serializers.ValidationError({'department': 'Department is required.'})
        if not schedule:
            raise serializers.ValidationError({'schedule': 'Tryout event schedule is required.'})
        if schedule.event.is_program_event:
            raise serializers.ValidationError({'schedule': 'Program events do not accept tryout applications.'})

        return attrs


class TryoutSendOtpSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    student_no = serializers.CharField(max_length=50)
    school_email = serializers.EmailField()
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    schedule = serializers.PrimaryKeyRelatedField(queryset=EventSchedule.objects.select_related('event').all())
    turnstile_token = serializers.CharField()

    def validate_school_email(self, value):
        try:
            return validate_school_email(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)

    def validate(self, attrs):
        if attrs['schedule'].event.is_program_event:
            raise serializers.ValidationError({'schedule': 'Program events do not accept tryout applications.'})
        duplicate = TryoutApplication.objects.filter(
            student_number=attrs['student_no'].strip(),
            department=attrs['department'],
            schedule=attrs['schedule'],
        ).exclude(status='withdrawn').exists()
        if duplicate:
            raise serializers.ValidationError({
                'student_no': 'An active tryout application already exists for this student, department, and event.'
            })
        return attrs


class TryoutVerifyOtpSerializer(serializers.Serializer):
    student_no = serializers.CharField(max_length=50)
    school_email = serializers.EmailField()
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    schedule = serializers.PrimaryKeyRelatedField(queryset=EventSchedule.objects.select_related('event').all())
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_school_email(self, value):
        try:
            return validate_school_email(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)


class TryoutApplySerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    student_no = serializers.CharField(max_length=50)
    school_email = serializers.EmailField()
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())
    schedule = serializers.PrimaryKeyRelatedField(queryset=EventSchedule.objects.select_related('event').all())
    program = serializers.CharField(max_length=100)
    year_level = serializers.CharField(max_length=20)
    contact_no = serializers.CharField(max_length=30, required=False, allow_blank=True)
    prior_experience = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    consent = serializers.BooleanField()

    def validate_school_email(self, value):
        try:
            return validate_school_email(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)

    def validate(self, attrs):
        if not attrs.get('consent'):
            raise serializers.ValidationError({'consent': 'Consent is required to submit a tryout application.'})
        if attrs['schedule'].event.is_program_event:
            raise serializers.ValidationError({'schedule': 'Program events do not accept tryout applications.'})

        student_number = attrs['student_no'].strip()
        email = attrs['school_email'].strip().lower()
        department = attrs['department']
        schedule = attrs['schedule']

        verified_code = get_recent_verified_code(email, student_number, department, schedule)
        if not verified_code:
            raise serializers.ValidationError({
                'school_email': 'Verify your school email with OTP before submitting.'
            })

        duplicate = TryoutApplication.objects.filter(
            student_number=student_number,
            department=department,
            schedule=schedule,
        ).exclude(status='withdrawn').exists()
        if duplicate:
            raise serializers.ValidationError({
                'student_no': 'An active tryout application already exists for this student, department, and event.'
            })

        attrs['verified_code'] = verified_code
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        verified_code: EmailVerificationCode = validated_data.pop('verified_code')
        student_number = validated_data.pop('student_no').strip()
        contact_number = validated_data.pop('contact_no', '')
        program_course = validated_data.pop('program').strip()
        email = validated_data.pop('school_email').strip().lower()
        validated_data.pop('consent', None)

        return TryoutApplication.objects.create(
            student_number=student_number,
            school_email=email,
            contact_number=contact_number,
            program_course=program_course,
            email_verified=True,
            verified_at=verified_code.used_at,
            status='submitted',
            created_ip=getattr(request, 'tryout_client_ip', None),
            user_agent=getattr(request, 'tryout_user_agent', ''),
            submitted_at=timezone.now(),
            **validated_data,
        )


class RosterEntrySerializer(serializers.ModelSerializer):
    athlete_name = serializers.CharField(source='athlete.full_name', read_only=True)
    student_number = serializers.CharField(source='athlete.student_number', read_only=True)

    class Meta:
        model = RosterEntry
        fields = ['id', 'athlete', 'athlete_name', 'student_number', 'is_eligible']

class EventRegistrationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_acronym = serializers.CharField(source='department.acronym', read_only=True)
    schedule_event_name = serializers.CharField(source='schedule.event.name', read_only=True)
    schedule_start = serializers.DateTimeField(source='schedule.scheduled_start', read_only=True)
    venue_name = serializers.CharField(source='schedule.venue.name', read_only=True, allow_null=True)
    roster = RosterEntrySerializer(many=True, read_only=True)
    roster_athlete_ids = serializers.PrimaryKeyRelatedField(
        source='roster_athletes',
        queryset=Athlete.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'schedule', 'department', 'department_name', 'department_acronym',
            'schedule_event_name', 'schedule_start', 'venue_name',
            'status', 'admin_notes', 'submitted_by', 'roster', 'roster_athlete_ids',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['submitted_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        profile_department = None

        if request and request.user and request.user.is_authenticated:
            if not (request.user.is_staff or request.user.is_superuser):
                profile = getattr(request.user, 'profile', None)
                profile_department = getattr(profile, 'department', None)
                if profile_department:
                    attrs['department'] = profile_department

        department = attrs.get('department') or getattr(self.instance, 'department', None)
        schedule = attrs.get('schedule') or getattr(self.instance, 'schedule', None)
        roster_athletes = attrs.get('roster_athletes', [])

        if not self.instance and schedule and department:
            exists = EventRegistration.objects.filter(schedule=schedule, department=department).exists()
            if exists:
                raise serializers.ValidationError({
                    'schedule': 'This department already has a registration for the selected schedule.'
                })

        if roster_athletes and department:
            invalid_athletes = [
                athlete.full_name for athlete in roster_athletes
                if athlete.department_id != department.id
            ]
            if invalid_athletes:
                raise serializers.ValidationError({
                    'roster_athlete_ids': 'All roster athletes must belong to the registering department.'
                })

        if profile_department is None and request and request.user and request.user.is_authenticated:
            if not (request.user.is_staff or request.user.is_superuser):
                raise serializers.ValidationError({
                    'department': 'Your account is not linked to a department.'
                })

        return attrs

    def create(self, validated_data):
        roster_athletes = validated_data.pop('roster_athletes', [])
        registration = EventRegistration.objects.create(**validated_data)

        RosterEntry.objects.bulk_create([
            RosterEntry(registration=registration, athlete=athlete)
            for athlete in roster_athletes
        ])
        return registration

    def update(self, instance, validated_data):
        roster_athletes = validated_data.pop('roster_athletes', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if roster_athletes is not None:
            instance.roster.all().delete()
            RosterEntry.objects.bulk_create([
                RosterEntry(registration=instance, athlete=athlete)
                for athlete in roster_athletes
            ])

        return instance

class EventScheduleSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    event_name = serializers.CharField(source='event.name', read_only=True)
    event_category = serializers.CharField(source='event.category.name', read_only=True)
    event_status = serializers.CharField(source='event.status', read_only=True)
    is_program_event = serializers.BooleanField(source='event.is_program_event', read_only=True)
    result_family = serializers.CharField(source='event.result_family', read_only=True)
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_area_name = serializers.CharField(source='venue_area.name', read_only=True)

    class Meta:
        model = EventSchedule
        fields = [
            'id', 'event', 'event_name', 'event_category', 'event_status',
            'is_program_event', 'result_family',
            'venue', 'venue_name', 'venue_area', 'venue_area_name',
            'scheduled_start', 'scheduled_end', 'notes',
            'participants',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        venue_area = attrs.get('venue_area') or getattr(self.instance, 'venue_area', None)
        scheduled_start = attrs.get('scheduled_start') or getattr(self.instance, 'scheduled_start', None)
        scheduled_end = attrs.get('scheduled_end') or getattr(self.instance, 'scheduled_end', None)
        event = attrs.get('event') or getattr(self.instance, 'event', None)

        if scheduled_start and scheduled_end and scheduled_start >= scheduled_end:
            raise serializers.ValidationError({
                'scheduled_end': 'Schedule end must be later than schedule start.'
            })

        if venue_area and scheduled_start and scheduled_end and event and event.status not in {'postponed', 'cancelled'}:
            conflicts = EventSchedule.objects.filter(
                venue_area=venue_area,
                scheduled_start__lt=scheduled_end,
                scheduled_end__gt=scheduled_start,
            ).exclude(
                event__status__in=['postponed', 'cancelled'],
            )
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)
            if conflicts.exists():
                raise serializers.ValidationError({
                    'venue_area': 'This venue area already has an active schedule in that time range.'
                })

        return attrs

    def get_participants(self, obj):
        visible_statuses = {'submitted', 'pending', 'approved'}
        return [
            {
                'id': registration.id,
                'department': registration.department_id,
                'department_name': registration.department.name,
                'department_acronym': registration.department.acronym,
                'status': registration.status,
            }
            for registration in obj.registrations.all()
            if registration.status in visible_statuses
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
            'rank', 'medal', 'is_final',
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
    total_medals = serializers.SerializerMethodField()

    class Meta:
        model = MedalTally
        fields = [
            'id', 'department', 'department_name', 'department_acronym', 'department_color',
            'gold', 'silver', 'bronze', 'total_medals', 'last_updated',
        ]

    def get_total_medals(self, obj):
        return obj.gold + obj.silver + obj.bronze
