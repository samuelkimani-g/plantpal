from rest_framework import serializers
from django.contrib.auth import get_user_model 


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    General purpose Serializer for displaying CustomUser instances.
    Includes fields needed by the frontend's Dashboard and Profile pages.
    """
    class Meta:
        model = User
        # IMPORTANT: Include 'date_joined' and 'last_login' as frontend expects them
        fields = ('id', 'username', 'email', 'date_joined', 'last_login') 
        read_only_fields = ('id', 'date_joined', 'last_login') # These are managed by Django

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for user registration (creating a new user).
    Includes password confirmation and server-side validation for uniqueness.
    """
    password = serializers.CharField(write_only=True, required=True, min_length=8, style={'input_type': 'password'})
    # Added password2 field for confirmation, matching frontend's confirmPassword
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'}) 
    email = serializers.EmailField(required=True) # Ensure email field is explicit

    class Meta:
        model = User
        # Include password2 in fields for validation, but it's write-only
        fields = ('username', 'email', 'password', 'password2')
        extra_kwargs = {'password': {'write_only': True}} 

    def validate(self, attrs):
        # Server-side check for password matching
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        
        # Server-side check for unique username
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({"username": "A user with that username already exists."})
        
        # Server-side check for unique email (case-insensitive)
        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with that email already exists."})

        # Remove password2 from validated_data as it's not a model field
        attrs.pop('password2') 
        return attrs

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
