from rest_framework import serializers
from .models import Department, Venue, VenueArea

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'acronym', 'color_code', 'created_at', 'updated_at']

class VenueAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VenueArea
        fields = ['id', 'name', 'capacity', 'venue']

class VenueSerializer(serializers.ModelSerializer):
    areas = VenueAreaSerializer(many=True, read_only=True)

    class Meta:
        model = Venue
        fields = ['id', 'name', 'location', 'areas', 'created_at', 'updated_at']
