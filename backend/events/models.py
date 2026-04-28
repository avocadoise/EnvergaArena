from django.db import models
from django.utils.text import slugify

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
        ('archived', 'Archived'),
    ]

    category = models.ForeignKey(EventCategory, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    division = models.CharField(max_length=120, default='Open', blank=True)
    result_family = models.CharField(max_length=20, choices=RESULT_FAMILY_CHOICES)
    competition_format = models.CharField(max_length=120, blank=True)
    best_of = models.PositiveSmallIntegerField(null=True, blank=True)
    team_size_min = models.PositiveSmallIntegerField(null=True, blank=True)
    team_size_max = models.PositiveSmallIntegerField(null=True, blank=True)
    roster_size_max = models.PositiveSmallIntegerField(null=True, blank=True)
    medal_bearing = models.BooleanField(default=True)
    ruleset_ref = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_program_event = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.category.name})"

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            base_slug = slugify(self.name) or 'event'
            slug = base_slug
            suffix = 2
            queryset = Event.objects.all()
            if self.pk:
                queryset = queryset.exclude(pk=self.pk)
            while queryset.filter(slug=slug).exists():
                slug = f'{base_slug}-{suffix}'
                suffix += 1
            self.slug = slug
        super().save(*args, **kwargs)
