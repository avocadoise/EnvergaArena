from rest_framework import permissions, viewsets
from .models import EventCategory, Event
from .serializers import EventCategorySerializer, EventSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser
        )


class EventCategoryViewSet(viewsets.ModelViewSet):
    queryset = EventCategory.objects.exclude(name='Previous Events (Seeded)')
    serializer_class = EventCategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related('category').exclude(category__name='Previous Events (Seeded)')
    serializer_class = EventSerializer
    permission_classes = [IsAdminOrReadOnly]
