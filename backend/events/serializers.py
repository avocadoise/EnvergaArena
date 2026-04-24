from rest_framework import serializers
from .models import EventCategory, Event

class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = ['id', 'name', 'is_medal_bearing', 'created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'name', 'category', 'category_name', 'result_family', 'is_program_event', 'status', 'created_at', 'updated_at']
