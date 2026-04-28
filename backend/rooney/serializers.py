from rest_framework import serializers
from .models import RooneyQueryLog, AIRecap


class RooneyQuerySerializer(serializers.Serializer):
    question = serializers.CharField(max_length=500, min_length=3)


class RooneyResponseSerializer(serializers.Serializer):
    answer_text = serializers.CharField(allow_blank=True)
    grounded = serializers.BooleanField()
    source_labels = serializers.ListField(child=serializers.CharField())
    refusal_reason = serializers.CharField(allow_blank=True)


class RooneyQueryLogSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question', read_only=True)
    responded_at = serializers.DateTimeField(source='created_at', read_only=True)
    normalized_intent = serializers.SerializerMethodField()

    class Meta:
        model = RooneyQueryLog
        fields = [
            'id', 'question_text', 'answer_text', 'normalized_intent',
            'grounded', 'source_labels', 'refusal_reason', 'responded_at',
        ]

    def get_normalized_intent(self, obj):
        text = obj.question.lower()
        if 'rank' in text or 'lead' in text or 'medal' in text:
            return 'standings'
        if 'schedule' in text or 'when' in text:
            return 'schedule'
        if 'result' in text or 'score' in text or 'winner' in text:
            return 'results'
        return 'general'


class AIRecapSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)
    linked_news_article_title = serializers.CharField(source='linked_news_article.title', read_only=True)
    linked_news_article_slug = serializers.CharField(source='linked_news_article.slug', read_only=True)

    class Meta:
        model = AIRecap
        fields = [
            'id', 'trigger_type', 'scope_type', 'scope_key',
            'event', 'event_name', 'department', 'department_name',
            'input_snapshot_json',
            'generated_title', 'generated_summary', 'generated_body',
            'model_name', 'prompt_version', 'citation_map_json',
            'status', 'generated_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_username',
            'linked_news_article', 'linked_news_article_title', 'linked_news_article_slug',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'model_name', 'prompt_version', 'generated_at', 'created_at', 'updated_at',
            'reviewed_at', 'reviewed_by', 'linked_news_article',
        ]


class AIRecapGenerateSerializer(serializers.Serializer):
    match_result_id = serializers.IntegerField(required=False)
    schedule_id = serializers.IntegerField(required=False)
