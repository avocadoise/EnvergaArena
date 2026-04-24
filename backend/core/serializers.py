from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UserProfile

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        
        # Check for UserProfile
        try:
            profile = user.profile
            token['role'] = profile.role
            token['department_id'] = profile.department_id if profile.department else None
            token['department_acronym'] = profile.department.acronym if profile.department else None
        except UserProfile.DoesNotExist:
            token['role'] = 'admin' if user.is_staff or user.is_superuser else 'none'
            token['department_id'] = None
            token['department_acronym'] = None

        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
