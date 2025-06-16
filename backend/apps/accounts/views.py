from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView # Needed for EmailTokenObtainView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .serializers import UserSerializer, RegisterSerializer, EmailTokenObtainSerializer 

User = get_user_model()

# --- JWT Authentication Views ---

class RegisterView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    Uses RegisterSerializer to create a new user.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer # Correctly uses RegisterSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    API endpoint for obtaining JWT access and refresh tokens.
    Handles username/password login.
    """
    pass

class CustomTokenRefreshView(TokenRefreshView):
    """
    API endpoint for refreshing JWT access tokens using a refresh token.
    """
    pass

# --- User Profile View ---

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to retrieve or update the authenticated user's details.
    Allows a user to view/update their own profile.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer # <--- CORRECTED: Now uses UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        """
        Ensures that only the currently authenticated user's profile is returned.
        This explicitly makes /api/accounts/me/ work for the logged-in user.
        """
        return self.request.user

# --- DRF Token Authentication Views (New) ---

class EmailTokenObtainView(APIView):
    """
    API endpoint for obtaining a DRF authentication token using email and password.
    This provides an alternative login method to JWT using email.
    """
    permission_classes = (permissions.AllowAny,)
    serializer_class = EmailTokenObtainSerializer # Correctly uses EmailTokenObtainSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True) # Validate input (email, password)

        # The serializer's validate method handles authentication and token retrieval/creation
        token_key = serializer.validated_data['token']
        # CORRECTED: Use UserSerializer here for outputting user data
        user_data = UserSerializer(serializer.validated_data['user']).data # <--- CORRECTED

        return Response({
            'token': token_key,
            'user': user_data
        }, status=status.HTTP_200_OK)

class LogoutAndBlacklistTokenView(APIView): # <--- NEW VIEW CLASS for logout
    """
    API endpoint for logging out a user by blacklisting their refresh token.
    Requires an authenticated request with the refresh token in the body.
    """
    permission_classes = (permissions.IsAuthenticated,) # Only authenticated users can blacklist tokens

    def post(self, request):
        try:
            refresh_token = request.data["refresh"] # Expects 'refresh' token in the request body
            token = RefreshToken(refresh_token)
            token.blacklist() # Blacklist the refresh token

            return Response({"detail": "Successfully logged out and token blacklisted."}, status=status.HTTP_205_RESET_CONTENT)
        except KeyError:
            return Response({"error": "Refresh token is required in the request body."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Handle cases where the token is invalid, already blacklisted, or other issues
            return Response({"error": f"Failed to logout: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

