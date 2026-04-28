from django.contrib import admin
from .models import AIRecap, RooneyQueryLog


@admin.register(RooneyQueryLog)
class RooneyQueryLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'question_preview', 'grounded', 'source_labels']
    list_filter = ['grounded']
    readonly_fields = [
        'question', 'answer_text', 'grounded',
        'source_labels', 'refusal_reason', 'created_at'
    ]

    def question_preview(self, obj):
        return obj.question[:80]
    question_preview.short_description = 'Question'


@admin.register(AIRecap)
class AIRecapAdmin(admin.ModelAdmin):
    list_display = ['generated_title', 'trigger_type', 'scope_type', 'status', 'event', 'generated_at', 'reviewed_at']
    list_filter = ['status', 'trigger_type', 'scope_type']
    search_fields = ['generated_title', 'generated_summary', 'scope_key']
