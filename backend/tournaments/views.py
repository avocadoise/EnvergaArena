"""
Views for the tournaments app.

Public (AllowAny):
  GET  /api/public/schedules/
  GET  /api/public/schedules/{id}/
  GET  /api/public/match-results/
  GET  /api/public/podium-results/
  GET  /api/public/medal-records/
  GET  /api/public/medal-tally/

Admin-only (IsAdminUser):
  POST/PUT/PATCH/DELETE for schedules, match-results, podium-results, medal-records
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import (
    EventSchedule, Athlete, TryoutApplication, EventRegistration, RosterEntry,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)
from .serializers import (
    EventScheduleSerializer, AthleteSerializer, TryoutApplicationSerializer, EventRegistrationSerializer,
    TryoutApplySerializer, TryoutSendOtpSerializer, TryoutVerifyOtpSerializer,
    MatchResultSerializer, MatchResultWriteSerializer, MatchSetScoreSerializer,
    PodiumResultSerializer,
    MedalRecordSerializer, MedalTallySerializer,
)
from .services import apply_final_match_result, apply_final_podium_result
from rooney.services.recaps import generate_recap_for_match_result, generate_recap_for_podium_schedule
from .tryout_services import (
    create_email_verification_code,
    enforce_rate_limit,
    get_client_ip,
    get_user_agent,
    send_tryout_otp_email,
    verify_email_code,
    verify_turnstile_token,
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow full access to admins; read-only to everyone else."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class TryoutApplicationPermission(permissions.BasePermission):
    """Public can submit; authenticated admins/reps can review scoped rows."""
    def has_permission(self, request, view):
        if view.action == 'create':
            return request.user and request.user.is_staff
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.department_id == obj.department_id)


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------

class EventScheduleViewSet(viewsets.ModelViewSet):
    queryset = EventSchedule.objects.select_related(
        'event', 'venue', 'venue_area'
    ).prefetch_related('registrations__department').all()
    serializer_class = EventScheduleSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        event_id = self.request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

# ---------------------------------------------------------------------------
# Registration Workflow
# ---------------------------------------------------------------------------

class AthleteViewSet(viewsets.ModelViewSet):
    serializer_class = AthleteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Athlete.objects.all()
        # Dept reps only see their own athletes
        if hasattr(user, 'profile') and user.profile.department:
            return Athlete.objects.filter(department=user.profile.department)
        return Athlete.objects.none()


class TryoutSendOtpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TryoutSendOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        client_ip = get_client_ip(request) or 'unknown'
        user_agent = get_user_agent(request)
        email = data['school_email']
        student_number = data['student_no'].strip()

        try:
            enforce_rate_limit('otp-ip', client_ip, settings.TRYOUT_MAX_OTP_REQUESTS_PER_HOUR)
            enforce_rate_limit('otp-email', email, settings.TRYOUT_MAX_OTP_REQUESTS_PER_HOUR)
            enforce_rate_limit('otp-student', student_number, settings.TRYOUT_MAX_OTP_REQUESTS_PER_HOUR)
            verify_turnstile_token(data['turnstile_token'], None if client_ip == 'unknown' else client_ip)
            record, code = create_email_verification_code(
                email=email,
                student_number=student_number,
                department=data['department'],
                schedule=data['schedule'],
                request_ip=None if client_ip == 'unknown' else client_ip,
                user_agent=user_agent,
            )
            try:
                send_tryout_otp_email(email, data.get('full_name', ''), code)
            except DjangoValidationError:
                record.delete()
                raise
        except DjangoValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'detail': 'OTP sent to your student email. Check your inbox and submit the code before it expires.'
        })


class TryoutVerifyOtpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TryoutVerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        client_ip = get_client_ip(request) or 'unknown'
        email = data['school_email']
        student_number = data['student_no'].strip()

        try:
            enforce_rate_limit('verify-ip', client_ip, settings.TRYOUT_MAX_VERIFY_ATTEMPTS)
            enforce_rate_limit('verify-email', email, settings.TRYOUT_MAX_VERIFY_ATTEMPTS)
            record = verify_email_code(
                email=email,
                student_number=student_number,
                department=data['department'],
                schedule=data['schedule'],
                code=data['code'],
            )
        except DjangoValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'detail': 'Email verified. You can now submit your tryout application.',
            'verified_at': record.used_at,
        })


class TryoutApplyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        client_ip = get_client_ip(request) or 'unknown'
        email = str(request.data.get('school_email', '')).strip().lower() or 'unknown'
        student_number = str(request.data.get('student_no', '')).strip() or 'unknown'

        try:
            enforce_rate_limit('apply-ip', client_ip, settings.TRYOUT_MAX_APPLICATIONS_PER_HOUR)
            enforce_rate_limit('apply-email', email, settings.TRYOUT_MAX_APPLICATIONS_PER_HOUR)
            enforce_rate_limit('apply-student', student_number, settings.TRYOUT_MAX_APPLICATIONS_PER_HOUR)
        except DjangoValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        request.tryout_client_ip = None if client_ip == 'unknown' else client_ip
        request.tryout_user_agent = get_user_agent(request)
        serializer = TryoutApplySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(TryoutApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class TryoutApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = TryoutApplicationSerializer
    permission_classes = [TryoutApplicationPermission]

    def get_queryset(self):
        qs = TryoutApplication.objects.select_related(
            'department',
            'schedule__event__category',
            'schedule__venue',
            'converted_athlete',
            'reviewed_by',
        ).filter(email_verified=True)
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        if user.is_staff or user.is_superuser:
            return qs
        profile = getattr(user, 'profile', None)
        if profile and profile.department:
            return qs.filter(department=profile.department)
        return qs.none()

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(email_verified=True, verified_at=timezone.now(), submitted_at=timezone.now())

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def convert(self, request, pk=None):
        application = self.get_object()
        if application.status != 'selected':
            return Response(
                {'detail': 'Only selected tryout applicants can be converted into athletes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if application.converted_athlete_id:
            return Response(AthleteSerializer(application.converted_athlete).data)

        existing = Athlete.objects.filter(student_number=application.student_number).first()
        if existing and existing.department_id != application.department_id:
            return Response(
                {'detail': 'A participant with this student number exists in another department.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        athlete = existing or Athlete.objects.create(
            student_number=application.student_number,
            full_name=application.full_name,
            department=application.department,
            program_course=application.program_course,
            year_level=application.year_level,
            is_enrolled=True,
            medical_cleared=False,
        )
        application.converted_athlete = athlete
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=['converted_athlete', 'reviewed_by', 'reviewed_at', 'updated_at'])

        return Response(AthleteSerializer(athlete).data, status=status.HTTP_201_CREATED if not existing else status.HTTP_200_OK)


class EventRegistrationViewSet(viewsets.ModelViewSet):
    serializer_class = EventRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = EventRegistration.objects.select_related('schedule__event', 'department').prefetch_related('roster__athlete')
        if user.is_staff or user.is_superuser:
            return qs.all()
        if hasattr(user, 'profile') and user.profile.department:
            return qs.filter(department=user.profile.department)
        return qs.none()

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)


# ---------------------------------------------------------------------------
# Match results (match_based)
# ---------------------------------------------------------------------------

class MatchResultViewSet(viewsets.ModelViewSet):
    queryset = MatchResult.objects.select_related(
        'schedule__event', 'home_department', 'away_department', 'winner'
    ).prefetch_related('sets').all()
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return MatchResultWriteSerializer
        return MatchResultSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        result = serializer.save(recorded_by=self.request.user if self.request.user.is_authenticated else None)
        if result.is_final:
            apply_final_match_result(result)
            generate_recap_for_match_result(result)

    @transaction.atomic
    def perform_update(self, serializer):
        result = serializer.save()
        if result.is_final:
            apply_final_match_result(result)
            generate_recap_for_match_result(result)

    @action(detail=True, methods=['post'], url_path='add-set')
    @transaction.atomic
    def add_set(self, request, pk=None):
        """POST /api/public/match-results/{id}/add-set/  — add a set/period score."""
        match = self.get_object()
        serializer = MatchSetScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(match=match)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Podium results (rank_based)
# ---------------------------------------------------------------------------

class PodiumResultViewSet(viewsets.ModelViewSet):
    queryset = PodiumResult.objects.select_related(
        'schedule__event', 'department'
    ).all()
    serializer_class = PodiumResultSerializer
    permission_classes = [IsAdminOrReadOnly]

    @transaction.atomic
    def perform_create(self, serializer):
        result = serializer.save(recorded_by=self.request.user if self.request.user.is_authenticated else None)
        if result.is_final:
            apply_final_podium_result(result)
            generate_recap_for_podium_schedule(result.schedule)

    @transaction.atomic
    def perform_update(self, serializer):
        result = serializer.save()
        if result.is_final:
            apply_final_podium_result(result)
            generate_recap_for_podium_schedule(result.schedule)


# ---------------------------------------------------------------------------
# Medal ledger (read-only for public; admin can delete to correct)
# ---------------------------------------------------------------------------

class MedalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedalRecord.objects.select_related(
        'department', 'event'
    ).all()
    serializer_class = MedalRecordSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department_id=dept)
        return qs


# ---------------------------------------------------------------------------
# Medal tally (public, read-only — computed)
# ---------------------------------------------------------------------------

class MedalTallyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MedalTally.objects.select_related('department').all()
    serializer_class = MedalTallySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .annotate(total_medals=F('gold') + F('silver') + F('bronze'))
            .order_by('-gold', '-silver', '-bronze', 'department__name')
        )
