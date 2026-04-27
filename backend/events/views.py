from rest_framework import viewsets
from .models import EventCategory, Event
from .serializers import EventCategorySerializer, EventSerializer

class EventCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EventCategory.objects.exclude(name='Previous Events (Seeded)')
    serializer_class = EventCategorySerializer

class EventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Event.objects.select_related('category').exclude(category__name='Previous Events (Seeded)')
    serializer_class = EventSerializer
