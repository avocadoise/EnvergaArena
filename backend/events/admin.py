from django.contrib import admin
from .models import Event, EventCategory


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_medal_bearing', 'created_at', 'updated_at']
    search_fields = ['name']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'division', 'result_family', 'medal_bearing', 'status', 'sort_order']
    list_filter = ['category', 'result_family', 'medal_bearing', 'status']
    search_fields = ['name', 'slug', 'division', 'competition_format']
    prepopulated_fields = {'slug': ('name',)}
