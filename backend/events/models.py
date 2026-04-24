from django.db import models

class EventCategory(models.Model):
    name = models.CharField(max_length=255, unique=True)
    is_medal_bearing = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Event(models.Model):
    RESULT_FAMILY_CHOICES = [
        ('match_based', 'Match Based'),
        ('rank_based', 'Rank Based'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
        ('postponed', 'Postponed'),
        ('cancelled', 'Cancelled'),
    ]

    category = models.ForeignKey(EventCategory, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=255)
    result_family = models.CharField(max_length=20, choices=RESULT_FAMILY_CHOICES)
    is_program_event = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.category.name})"
