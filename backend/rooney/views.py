from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action

from tournaments.models import EventSchedule, MatchResult

from .serializers import (
    AIRecapGenerateSerializer,
    AIRecapSerializer,
    RooneyQueryLogSerializer,
    RooneyQuerySerializer,
)
from .services.grounding import build_grounding_context
from .services.llm import query_rooney
from .services.recaps import generate_manual_recap, publish_recap_to_news
from .models import AIRecap, RooneyQueryLog


class RooneyQueryView(APIView):
    """
    POST /api/public/rooney/query/
    Public endpoint — no auth required.
    Body: {"question": "Who is leading?"}
    """

    def post(self, request):
        serializer = RooneyQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.validated_data['question']

        # 1. Build grounding context from live DB
        grounding = build_grounding_context()

        # 2. Call Gemini with grounded context
        result = query_rooney(question, grounding['text'])

        # Merge source labels: from grounding + from LLM response
        all_sources = list(set(grounding['source_labels'] + result.get('source_labels', [])))
        result['source_labels'] = all_sources

        # 3. Log the query
        RooneyQueryLog.objects.create(
            question=question,
            answer_text=result.get('answer_text', ''),
            grounded=result.get('grounded', False),
            source_labels=result.get('source_labels', []),
            refusal_reason=result.get('refusal_reason', ''),
        )

        return Response(result, status=status.HTTP_200_OK)


class RooneyQueryLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RooneyQueryLog.objects.all()
    serializer_class = RooneyQueryLogSerializer
    permission_classes = [permissions.IsAdminUser]


class AIRecapViewSet(viewsets.ModelViewSet):
    queryset = AIRecap.objects.select_related('event', 'department', 'reviewed_by', 'linked_news_article').all()
    serializer_class = AIRecapSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_value = self.request.query_params.get('status')
        trigger_type = self.request.query_params.get('trigger_type')
        event_id = self.request.query_params.get('event')
        query = self.request.query_params.get('q')
        if status_value:
            qs = qs.filter(status=status_value)
        if trigger_type:
            qs = qs.filter(trigger_type=trigger_type)
        if event_id:
            qs = qs.filter(event_id=event_id)
        if query:
            qs = qs.filter(generated_title__icontains=query)
        return qs.order_by('-generated_at', '-updated_at')

    def perform_update(self, serializer):
        status_value = serializer.validated_data.get('status', serializer.instance.status)
        serializer.save(
            reviewed_by=self.request.user if status_value in {'under_review', 'approved', 'discarded', 'published'} else serializer.instance.reviewed_by,
            reviewed_at=timezone.now() if status_value in {'under_review', 'approved', 'discarded', 'published'} else serializer.instance.reviewed_at,
        )

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = AIRecapGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match_result = None
        schedule = None
        match_result_id = serializer.validated_data.get('match_result_id')
        schedule_id = serializer.validated_data.get('schedule_id')
        if match_result_id:
            match_result = MatchResult.objects.filter(pk=match_result_id).select_related('schedule__event').first()
        if schedule_id:
            schedule = EventSchedule.objects.filter(pk=schedule_id).select_related('event', 'event__category').first()
        recap = generate_manual_recap(schedule=schedule, match_result=match_result)
        if recap is None:
            return Response({'detail': 'No finalized result or schedule context is available for recap generation.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(recap).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        recap = self.get_object()
        recap.status = 'approved'
        recap.reviewed_by = request.user
        recap.reviewed_at = timezone.now()
        recap.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(recap).data)

    @action(detail=True, methods=['post'])
    def discard(self, request, pk=None):
        recap = self.get_object()
        recap.status = 'discarded'
        recap.reviewed_by = request.user
        recap.reviewed_at = timezone.now()
        recap.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(recap).data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        recap = self.get_object()
        article = publish_recap_to_news(recap, request.user)
        data = self.get_serializer(recap).data
        data['published_news_slug'] = article.slug
        return Response(data)
