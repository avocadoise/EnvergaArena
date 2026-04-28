from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    AdminNewsArticleViewSet,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CurrentUserView,
    DepartmentViewSet,
    LogoutView,
    PublicNewsArticleViewSet,
    VenueViewSet,
    VenueAreaViewSet,
)
from events.views import EventCategoryViewSet, EventViewSet
from tournaments.views import (
    EventScheduleViewSet, MatchResultViewSet, AthleteViewSet, TryoutApplicationViewSet, EventRegistrationViewSet,
    PodiumResultViewSet, MedalRecordViewSet, MedalTallyViewSet,
    TryoutApplyView, TryoutSendOtpView, TryoutVerifyOtpView,
)
from rooney.views import AIRecapViewSet, RooneyQueryLogViewSet, RooneyQueryView

router = DefaultRouter()
admin_router = DefaultRouter()

# Core
router.register(r'departments', DepartmentViewSet)
router.register(r'venues', VenueViewSet)
router.register(r'venue-areas', VenueAreaViewSet)
router.register(r'news', PublicNewsArticleViewSet, basename='publicnews')

# Events
router.register(r'events', EventViewSet)
router.register(r'event-categories', EventCategoryViewSet)

# Tournaments
router.register(r'athletes', AthleteViewSet, basename='athlete')
router.register(r'tryout-applications', TryoutApplicationViewSet, basename='tryoutapplication')
router.register(r'registrations', EventRegistrationViewSet, basename='eventregistration')
router.register(r'schedules', EventScheduleViewSet)
router.register(r'match-results', MatchResultViewSet)
router.register(r'podium-results', PodiumResultViewSet)
router.register(r'medal-records', MedalRecordViewSet)
router.register(r'medal-tally', MedalTallyViewSet)
router.register(r'rooney-logs', RooneyQueryLogViewSet, basename='rooneylog')

admin_router.register(r'news', AdminNewsArticleViewSet, basename='adminnews')
admin_router.register(r'ai-recaps', AIRecapViewSet, basename='airecap')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='token_logout'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/public/rooney/query/', RooneyQueryView.as_view(), name='rooney_query'),
    path('api/admin/', include(admin_router.urls)),
    path('api/public/tryouts/send-otp/', TryoutSendOtpView.as_view(), name='tryout_send_otp'),
    path('api/public/tryouts/verify-otp/', TryoutVerifyOtpView.as_view(), name='tryout_verify_otp'),
    path('api/public/tryouts/apply/', TryoutApplyView.as_view(), name='tryout_apply'),
    path('api/public/', include(router.urls)),
]
