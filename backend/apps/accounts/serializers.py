from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework.authtoken.models import Token # Import DRF Token model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    General purpose Serializer for displaying CustomUser instances.
    Excludes password by default.
    Used for retrieving current user details (/me/) or when a user is nested.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email')
        read_only_fields = ('id', 'username', 'email') # These fields are read-only when retrieving

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for user registration (creating a new user).
    Handles creating a new CustomUser and hashing the password.
    """
    password = serializers.CharField(write_only=True, min_length=8) # Password is write-only and requires min length

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        read_only_fields = ('id',) # ID is generated automatically

    def create(self, validated_data):
        """
        Create a new user instance, setting the password correctly.
        """
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

    def update(self, instance, validated_data):
        """
        Updates an existing user.
        Note: Password changes should typically go through a separate password change endpoint for security.
        """
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        # You can add logic here if you want to allow password updates via this serializer,
        # but it's generally discouraged for a general 'update' method.
        instance.save()
        return instance

class EmailTokenObtainSerializer(serializers.Serializer):
    """
    Serializer to handle email-based DRF Token authentication.
    Takes email and password, authenticates the user, and returns user data and a DRF token.
    """
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    token = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True) # <--- Using the `UserSerializer` here for returning user details

    class Meta:
        # fields are defined directly in the serializer, not in Meta for Serializer.Serializer
        # This Meta class can be omitted for Serializer.Serializer if fields are explicitly defined above.
        # However, keeping it for clarity as it's common practice for ModelSerializer.
        fields = ('email', 'password', 'token', 'user') # For documentation purposes

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError(_('Both "email" and "password" are required.'))

        try:
            user = User.objects.get(email__iexact=email) # Case-insensitive email lookup
        except User.DoesNotExist:
            raise serializers.ValidationError(_('No active account found with the given credentials.'))

        # Authenticate the user against their password
        if not user.check_password(password):
            raise serializers.ValidationError(_('No active account found with the given credentials.'))

        if not user.is_active:
            raise serializers.ValidationError(_('User account is disabled.'))

        # Get or create the DRF Token for the authenticated user
        token, created = Token.objects.get_or_create(user=user)
        
        attrs['user'] = user
        attrs['token'] = token.key
        
        return attrs
