from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from .models import UserProfile
# SpotifyProfile now in apps.music.models

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    """
    User profile serializer for viewing and editing profile information
    """
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', allow_blank=True)
    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.CharField(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'first_name', 'last_name', 'display_name',
            'avatar', 'avatar_url', 'bio', 'timezone', 'journal_streak',
            'reminder_enabled', 'spotify_connected', 'created_at', 'updated_at'
        ]
        read_only_fields = ['username', 'journal_streak', 'spotify_connected', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        """Update both User and UserProfile fields"""
        user_data = {}
        profile_data = {}
        
        # Separate user fields from profile fields
        for field, value in validated_data.items():
            if field.startswith('user.'):
                user_field = field.replace('user.', '')
                user_data[user_field] = value
            else:
                profile_data[field] = value
        
        # Update User fields
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save()
        
        # Update UserProfile fields
        if profile_data:
            for field, value in profile_data.items():
                setattr(instance, field, value)
            instance.save()
        
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that allows login with email or username
    """
    username_field = 'username'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow both username and email for login
        self.fields['username'] = serializers.CharField()

    def validate(self, attrs):
        # Check if the username is actually an email
        username = attrs.get('username')
        if '@' in username:
            # Try to find user by email
            try:
                user = User.objects.get(email=username)
                attrs['username'] = user.username
            except User.DoesNotExist:
                pass
        
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user profile data to token response
        data['user'] = UserSerializer(self.user).data
        
        return data

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model - used for profile views
    """
    is_spotify_connected = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'date_joined',
            'avatar', 'music_mood_weight', 'is_spotify_connected', 'profile'
        )
        read_only_fields = ('id', 'date_joined', 'is_spotify_connected')

    def get_is_spotify_connected(self, obj):
        """Check if user has Spotify profile"""
        # Import here to avoid circular imports
        try:
            from apps.music.models import SpotifyProfile
            return SpotifyProfile.objects.filter(user=obj).exists()
        except ImportError:
            return False

class RegisterSerializer(serializers.ModelSerializer):
    """
    User registration serializer as specified in architecture
    """
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password_confirm')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """Create user and profile"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    """
    Login serializer for username/password authentication
    """
    username = serializers.CharField()
    password = serializers.CharField()

class PasswordChangeSerializer(serializers.Serializer):
    """
    Password change serializer
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

    def validate_old_password(self, value):
        if not self.instance.check_password(value):
            raise serializers.ValidationError("Old password is not correct")
        return value

    def save(self, **kwargs):
        password = self.validated_data['new_password']
        self.instance.set_password(password)
        self.instance.save()
        return self.instance
