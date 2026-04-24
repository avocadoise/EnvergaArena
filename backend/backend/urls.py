from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import DepartmentViewSet, VenueViewSet, VenueAreaViewSet
from events.views import EventCategoryViewSet, EventViewSet

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet)
router.register(r'venues', VenueViewSet)
router.register(r'venue-areas', VenueAreaViewSet)
router.register(r'events', EventViewSet)
router.register(r'event-categories', EventCategoryViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/public/', include(router.urls)),
]
