from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer, PasswordChangeSerializer

User = get_user_model()

# --- JWT Authentication Views ---

class RegisterView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    Uses RegisterSerializer to create a new user.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "User created successfully", "username": user.username},
            status=status.HTTP_201_CREATED
        )

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    API endpoint for obtaining JWT access and refresh tokens.
    Handles username/password login. This is what the frontend's loginAPI.login hits.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = (permissions.AllowAny,)

# --- User Profile Management Views ---

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to retrieve or update the authenticated user's details.
    Maps to /api/accounts/profile/ in the frontend's authAPI.getProfile.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        """
        Ensures that only the currently authenticated user's profile is returned.
        """
        return self.request.user

class ChangePasswordView(APIView):
    """
    API endpoint for changing user password
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeleteAccountView(APIView):
    """
    API endpoint for deleting user account
    """
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request):
        user = request.user
        try:
            # Blacklist all user's tokens
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass  # Continue with deletion even if token blacklisting fails
        
        user.delete()
        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

# --- Spotify Integration ---

class SpotifyConnectionView(APIView):
    """
    API endpoint to store Spotify connection data
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        """Store Spotify refresh token and connection status"""
        user = request.user
        spotify_refresh_token = request.data.get('spotify_refresh_token')
        
        if not spotify_refresh_token:
            return Response({"error": "Spotify refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Store in user profile (we'll add this field to the model)
        user.spotify_refresh_token = spotify_refresh_token
        user.spotify_connected = True
        user.save()
        
        return Response({"detail": "Spotify connected successfully"}, status=status.HTTP_200_OK)

    def delete(self, request):
        """Disconnect Spotify"""
        user = request.user
        user.spotify_refresh_token = None
        user.spotify_connected = False
        user.save()
        
        return Response({"detail": "Spotify disconnected successfully"}, status=status.HTTP_200_OK)

# --- Logout/Blacklist View ---

class LogoutAndBlacklistTokenView(APIView):
    """
    API endpoint for logging out a user by blacklisting their refresh token.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required in the request body."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"detail": "Successfully logged out and token blacklisted."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": f"Failed to logout: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# --- User ViewSet (ReadOnly for general user listing if needed) ---
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows users to be viewed (read-only).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
