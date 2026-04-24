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
from django.db import transaction

from .models import (
    EventSchedule, EventParticipant,
    MatchResult, MatchSetScore,
    PodiumResult, MedalRecord, MedalTally,
)
from .serializers import (
    EventScheduleSerializer, EventParticipantSerializer,
    MatchResultSerializer, MatchResultWriteSerializer, MatchSetScoreSerializer,
    PodiumResultSerializer,
    MedalRecordSerializer, MedalTallySerializer,
)
from .services import apply_final_match_result, apply_final_podium_result


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow full access to admins; read-only to everyone else."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------

class EventScheduleViewSet(viewsets.ModelViewSet):
    queryset = EventSchedule.objects.select_related(
        'event', 'venue', 'venue_area'
    ).prefetch_related('participants__department').all()
    serializer_class = EventScheduleSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        event_id = self.request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs


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

    @transaction.atomic
    def perform_update(self, serializer):
        result = serializer.save()
        if result.is_final:
            apply_final_match_result(result)

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

    @transaction.atomic
    def perform_update(self, serializer):
        result = serializer.save()
        if result.is_final:
            apply_final_podium_result(result)


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
