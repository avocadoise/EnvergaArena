from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Department, NewsArticle
from events.models import Event


class RooneyQueryLog(models.Model):
    """Logs every Rooney query for admin monitoring and audit."""
    question = models.TextField()
    answer_text = models.TextField(blank=True)
    grounded = models.BooleanField(default=False)
    source_labels = models.JSONField(default=list)
    refusal_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.question[:60]}"


class AIRecap(models.Model):
    TRIGGER_TYPE_CHOICES = [
        ('event_completion', 'Event Completion'),
        ('medal_update', 'Medal Update'),
        ('schedule_highlight', 'Schedule Highlight'),
        ('rooney_summary', 'Rooney Summary'),
        ('manual', 'Manual'),
    ]
    SCOPE_TYPE_CHOICES = [
        ('match_result', 'Match Result'),
        ('podium_schedule', 'Podium Schedule'),
        ('event', 'Event'),
        ('leaderboard', 'Leaderboard'),
        ('manual', 'Manual'),
    ]
    STATUS_CHOICES = [
        ('generated', 'Generated'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('discarded', 'Discarded'),
        ('published', 'Published'),
    ]

    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPE_CHOICES, default='manual')
    scope_type = models.CharField(max_length=30, choices=SCOPE_TYPE_CHOICES, default='manual')
    scope_key = models.CharField(max_length=255)
    event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_recaps')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_recaps')
    input_snapshot_json = models.JSONField(default=dict)
    generated_title = models.CharField(max_length=255)
    generated_summary = models.TextField()
    generated_body = models.TextField()
    model_name = models.CharField(max_length=120, default='template-grounded-v1')
    prompt_version = models.CharField(max_length=50, default='recap_v1')
    citation_map_json = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generated')
    generated_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_ai_recaps')
    linked_news_article = models.ForeignKey(NewsArticle, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_ai_recaps')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-generated_at', '-updated_at']
        unique_together = ('scope_type', 'scope_key')

    def __str__(self):
        return self.generated_title
