from rest_framework import viewsets
from .models import Department, Venue, VenueArea
from .serializers import DepartmentSerializer, VenueSerializer, VenueAreaSerializer

class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class VenueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer

class VenueAreaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VenueArea.objects.all()
    serializer_class = VenueAreaSerializer
