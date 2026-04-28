from django.utils import timezone
from django.conf import settings
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import Department, Venue, VenueArea, NewsArticle
from .serializers import (
    CustomTokenObtainPairSerializer,
    DepartmentSerializer,
    get_user_auth_payload,
    NewsArticleAdminSerializer,
    NewsArticlePublicSerializer,
    VenueSerializer,
    VenueAreaSerializer,
)


def _refresh_cookie_kwargs():
    return {
        'httponly': settings.JWT_REFRESH_COOKIE_HTTPONLY,
        'secure': settings.JWT_REFRESH_COOKIE_SECURE,
        'samesite': settings.JWT_REFRESH_COOKIE_SAMESITE,
        'path': settings.JWT_REFRESH_COOKIE_PATH,
        'domain': settings.JWT_REFRESH_COOKIE_DOMAIN,
    }


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        **_refresh_cookie_kwargs(),
    )


def clear_refresh_cookie(response):
    response.delete_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        domain=settings.JWT_REFRESH_COOKIE_DOMAIN,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.pop('refresh', None)
        if refresh:
            set_refresh_cookie(response, refresh)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh:
            return Response({'detail': 'Refresh session cookie was not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data={'refresh': refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0])

        response = Response(serializer.validated_data, status=status.HTTP_200_OK)
        new_refresh = response.data.pop('refresh', None)
        if new_refresh:
            set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
        clear_refresh_cookie(response)
        return response


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(get_user_auth_payload(request.user))


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser
        )


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAdminOrReadOnly]


class VenueAreaViewSet(viewsets.ModelViewSet):
    queryset = VenueArea.objects.all()
    serializer_class = VenueAreaSerializer
    permission_classes = [IsAdminOrReadOnly]


class PublicNewsArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewsArticle.objects.select_related('event', 'department').filter(status='published')
    serializer_class = NewsArticlePublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = super().get_queryset()
        article_type = self.request.query_params.get('article_type')
        department_id = self.request.query_params.get('department')
        event_id = self.request.query_params.get('event')
        query = self.request.query_params.get('q')
        if article_type:
            qs = qs.filter(article_type=article_type)
        if department_id:
            qs = qs.filter(department_id=department_id)
        if event_id:
            qs = qs.filter(event_id=event_id)
        if query:
            qs = qs.filter(title__icontains=query)
        return qs.order_by('-published_at', '-updated_at')


class AdminNewsArticleViewSet(viewsets.ModelViewSet):
    queryset = NewsArticle.objects.select_related('event', 'department', 'created_by', 'reviewed_by').all()
    serializer_class = NewsArticleAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_value = self.request.query_params.get('status')
        article_type = self.request.query_params.get('article_type')
        department_id = self.request.query_params.get('department')
        event_id = self.request.query_params.get('event')
        query = self.request.query_params.get('q')
        if status_value:
            qs = qs.filter(status=status_value)
        if article_type:
            qs = qs.filter(article_type=article_type)
        if department_id:
            qs = qs.filter(department_id=department_id)
        if event_id:
            qs = qs.filter(event_id=event_id)
        if query:
            qs = qs.filter(title__icontains=query)
        return qs.order_by('-updated_at', '-created_at')

    def perform_create(self, serializer):
        status_value = serializer.validated_data.get('status', 'draft')
        published_at = serializer.validated_data.get('published_at')
        serializer.save(
            created_by=self.request.user,
            reviewed_by=self.request.user if status_value in {'review', 'published', 'archived'} else None,
            published_at=published_at or (timezone.now() if status_value == 'published' else None),
        )

    def perform_update(self, serializer):
        status_value = serializer.validated_data.get('status', getattr(serializer.instance, 'status', 'draft'))
        published_at = serializer.validated_data.get('published_at', serializer.instance.published_at)
        serializer.save(
            reviewed_by=self.request.user if status_value in {'review', 'published', 'archived'} else serializer.instance.reviewed_by,
            published_at=published_at or (timezone.now() if status_value == 'published' else None),
        )
