from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserSerializer, RegisterSerializer # EmailTokenObtainSerializer is no longer needed

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

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    API endpoint for obtaining JWT access and refresh tokens.
    Handles username/password login. This is what the frontend's loginAPI.login hits.
    """
    pass

# CustomTokenRefreshView is REMOVED from here as it's directly mapped in core/urls.py

# --- User Profile View ---

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

# --- Logout/Blacklist View ---

class LogoutAndBlacklistTokenView(APIView):
    """
    API endpoint for logging out a user by blacklisting their refresh token.
    Requires an authenticated request with the refresh token in the body.
    Maps to /api/accounts/logout/ in the frontend's authAPI.logout.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"] # Expects 'refresh' token in the request body
            token = RefreshToken(refresh_token)
            token.blacklist() # Blacklist the refresh token

            return Response({"detail": "Successfully logged out and token blacklisted."}, status=status.HTTP_205_RESET_CONTENT)
        except KeyError:
            return Response({"error": "Refresh token is required in the request body."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Failed to logout: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# --- User ViewSet (ReadOnly for general user listing if needed) ---
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows users to be viewed (read-only).
    Typically for administrative purposes or public user listings, not for individual profile management.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated] # Requires authentication to view user list
