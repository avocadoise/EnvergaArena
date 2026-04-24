from django.db import models

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
