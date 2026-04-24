from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import DepartmentViewSet, VenueViewSet, VenueAreaViewSet
from events.views import EventCategoryViewSet, EventViewSet
from tournaments.views import (
    EventScheduleViewSet, MatchResultViewSet,
    PodiumResultViewSet, MedalRecordViewSet, MedalTallyViewSet,
)

router = DefaultRouter()

# Core
router.register(r'departments', DepartmentViewSet)
router.register(r'venues', VenueViewSet)
router.register(r'venue-areas', VenueAreaViewSet)

# Events
router.register(r'events', EventViewSet)
router.register(r'event-categories', EventCategoryViewSet)

# Tournaments
router.register(r'schedules', EventScheduleViewSet)
router.register(r'match-results', MatchResultViewSet)
router.register(r'podium-results', PodiumResultViewSet)
router.register(r'medal-records', MedalRecordViewSet)
router.register(r'medal-tally', MedalTallyViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/public/', include(router.urls)),
]
