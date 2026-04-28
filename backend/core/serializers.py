from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.utils.text import slugify
from .models import Department, Venue, VenueArea, UserProfile, NewsArticle


def get_user_auth_payload(user):
    try:
        profile = user.profile
        return {
            'user_id': user.id,
            'username': user.username,
            'role': profile.role,
            'department_id': profile.department_id if profile.department else None,
            'department_name': profile.department.name if profile.department else None,
            'department_acronym': profile.department.acronym if profile.department else None,
        }
    except UserProfile.DoesNotExist:
        return {
            'user_id': user.id,
            'username': user.username,
            'role': 'admin' if user.is_staff or user.is_superuser else 'none',
            'department_id': None,
            'department_name': None,
            'department_acronym': None,
        }

class DepartmentSerializer(serializers.ModelSerializer):
    representative_name = serializers.SerializerMethodField()
    representative_username = serializers.SerializerMethodField()
    operational_status = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = '__all__'

    def get_representative_name(self, obj):
        profile = obj.userprofile_set.select_related('user').filter(role='department_rep').first()
        if not profile:
            return ''
        full_name = profile.user.get_full_name().strip()
        return full_name or profile.user.username

    def get_representative_username(self, obj):
        profile = obj.userprofile_set.select_related('user').filter(role='department_rep').first()
        return profile.user.username if profile else ''

    def get_operational_status(self, obj):
        has_rep = obj.userprofile_set.filter(role='department_rep').exists()
        return 'ready' if has_rep else 'needs_representative'

class VenueAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VenueArea
        fields = '__all__'

class VenueSerializer(serializers.ModelSerializer):
    areas = VenueAreaSerializer(many=True, read_only=True)

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'campus', 'building', 'address', 'location',
            'is_indoor', 'is_active', 'notes',
            'areas', 'created_at', 'updated_at',
        ]


class NewsArticleBaseSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = NewsArticle
        fields = [
            'id', 'title', 'slug', 'summary', 'body_md',
            'article_type', 'source_label',
            'event', 'event_name', 'department', 'department_name',
            'status', 'published_at', 'ai_generated',
            'created_by', 'created_by_username',
            'reviewed_by', 'reviewed_by_username',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'reviewed_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        title = attrs.get('title') or getattr(self.instance, 'title', '')
        slug = attrs.get('slug') or getattr(self.instance, 'slug', '')
        if title and not slug:
            attrs['slug'] = slugify(title)
        if attrs.get('status') == 'published' and not attrs.get('published_at') and not getattr(self.instance, 'published_at', None):
            attrs['published_at'] = timezone.now()
        return attrs


class NewsArticleAdminSerializer(NewsArticleBaseSerializer):
    pass


class NewsArticlePublicSerializer(NewsArticleBaseSerializer):
    class Meta(NewsArticleBaseSerializer.Meta):
        fields = [
            'id', 'title', 'slug', 'summary', 'body_md',
            'article_type', 'source_label',
            'event', 'event_name', 'department', 'department_name',
            'published_at', 'ai_generated', 'created_at', 'updated_at',
        ]
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        for key, value in get_user_auth_payload(user).items():
            if key != 'user_id':
                token[key] = value

        return token
