from django.db import models


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
