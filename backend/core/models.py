from django.db import models
from django.contrib.auth.models import User
from events.models import Event

class Department(models.Model):
    name = models.CharField(max_length=255, unique=True)
    acronym = models.CharField(max_length=20, unique=True)
    color_code = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.acronym})"

class Venue(models.Model):
    name = models.CharField(max_length=255, unique=True)
    location = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class VenueArea(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='areas')
    name = models.CharField(max_length=255)
    capacity = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.venue.name} - {self.name}"

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('department_rep', 'Department Representative'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='department_rep')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


class NewsArticle(models.Model):
    ARTICLE_TYPE_CHOICES = [
        ('announcement', 'Announcement'),
        ('schedule_update', 'Schedule Update'),
        ('highlight', 'Highlight'),
        ('result_recap', 'Result Recap'),
        ('general_news', 'General News'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('review', 'Review'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    summary = models.TextField()
    body_md = models.TextField()
    article_type = models.CharField(max_length=30, choices=ARTICLE_TYPE_CHOICES, default='announcement')
    source_label = models.CharField(max_length=120, blank=True)
    event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True, related_name='news_articles')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='news_articles')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True)
    ai_generated = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_news_articles')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_news_articles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-updated_at', '-created_at']

    def __str__(self):
        return self.title
