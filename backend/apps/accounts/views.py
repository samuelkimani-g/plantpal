from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer, PasswordChangeSerializer
from .models import SpotifyProfile
from .services import SpotifyService
from apps.plants.services import PlantGrowthService
from django.conf import settings

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

class SpotifyAuthURLView(APIView):
    """Get Spotify authorization URL"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Return Spotify authorization URL"""
        try:
            auth_url = SpotifyService.get_auth_url()
            return Response({
                'auth_url': auth_url,
                'message': 'Spotify authorization URL generated'
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to generate auth URL: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpotifyConnectionView(APIView):
    """
    API endpoint to store Spotify connection data
    """
    def post(self, request):
        refresh_token = request.data.get('spotify_refresh_token')
        if not refresh_token:
            return Response({'error': 'Missing spotify_refresh_token'}, status=status.HTTP_400_BAD_REQUEST)
        # Here you would save the refresh token to the user's profile or a related model
        # For now, just return a success response
        return Response({'detail': 'Spotify connected!'}, status=status.HTTP_200_OK)

    def delete(self, request):
        """Disconnect Spotify"""
        user = request.user
        try:
            spotify_profile = SpotifyProfile.objects.get(user=user)
            spotify_profile.delete()
        except SpotifyProfile.DoesNotExist:
            pass
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

class SpotifyCallbackView(APIView):
    """Handle Spotify OAuth callback"""
    permission_classes = [permissions.AllowAny]  # Allow unauthenticated access for direct Spotify redirect

    def get(self, request):
        """Handle direct redirect from Spotify (GET request)"""
        from django.shortcuts import redirect
        
        code = request.GET.get('code')
        error = request.GET.get('error')
        
        if error:
            # Redirect to frontend with error
            return redirect(f"{settings.FRONTEND_URL}/music?spotify_error={error}")
        
        if not code:
            return redirect(f"{settings.FRONTEND_URL}/music?spotify_error=no_code")
        
        # Redirect to frontend with code so frontend can handle token exchange
        return redirect(f"{settings.FRONTEND_URL}/music?code={code}")

    def post(self, request):
        """Handle token exchange from frontend (POST request)"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri', settings.SPOTIPY_REDIRECT_URI)
        
        if not code:
            return Response(
                {'error': 'Authorization code is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Exchange code for tokens
            token_data = SpotifyService.exchange_code_for_tokens(code, redirect_uri)
            
            # Calculate expiry time
            expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
            
            # Store or update Spotify profile
            spotify_profile, created = SpotifyProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data['refresh_token'],
                    'token_expires_at': expires_at,
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'scope': token_data.get('scope', '')
                }
            )
            
            if not created:
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.refresh_token = token_data['refresh_token']
                spotify_profile.token_expires_at = expires_at
                spotify_profile.token_type = token_data.get('token_type', 'Bearer')
                spotify_profile.scope = token_data.get('scope', '')
                spotify_profile.save()
            
            return Response({
                'message': 'Spotify connected successfully',
                'expires_at': expires_at.isoformat(),
                'connected': True
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to connect Spotify: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class SpotifyFetchValenceView(APIView):
    """Fetch Spotify valence data and update plant mood"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            
            # Refresh token if needed
            if spotify_profile.is_token_expired():
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.save()
            
            # Get valence scores from recent tracks
            valence_scores = SpotifyService.get_recent_tracks_valence(
                spotify_profile.access_token, 
                limit=request.data.get('limit', 20)
            )
            
            # Update plant mood if user has a plant
            if hasattr(request.user, 'plant'):
                PlantGrowthService.process_spotify_mood(request.user.plant, valence_scores)
                
                return Response({
                    'message': 'Plant mood updated from Spotify data',
                    'valence_scores': valence_scores,
                    'average_valence': sum(valence_scores) / len(valence_scores) if valence_scores else 0,
                    'plant_mood_score': request.user.plant.spotify_mood_score
                })
            else:
                return Response({
                    'message': 'Valence data fetched but no plant to update',
                    'valence_scores': valence_scores,
                    'average_valence': sum(valence_scores) / len(valence_scores) if valence_scores else 0
                })
                
        except SpotifyProfile.DoesNotExist:
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpotifyDisconnectView(APIView):
    """Disconnect Spotify account"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            spotify_profile.delete()
            return Response({'message': 'Spotify disconnected successfully'})
        except SpotifyProfile.DoesNotExist:
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class SpotifyStatusView(APIView):
    """Check Spotify connection status"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            return Response({
                'connected': True,
                'expires_at': spotify_profile.token_expires_at.isoformat() if spotify_profile.token_expires_at else None,
                'is_expired': spotify_profile.is_token_expired(),
                'scope': spotify_profile.scope
            })
        except SpotifyProfile.DoesNotExist:
            return Response({
                'connected': False,
                'expires_at': None,
                'is_expired': True,
                'scope': None
            })

class SpotifyRefreshView(APIView):
    """Refresh Spotify access token"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            
            if spotify_profile.is_token_expired():
                # Refresh the token
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.save()
                
                return Response({
                    'message': 'Spotify token refreshed successfully',
                    'expires_at': spotify_profile.token_expires_at.isoformat(),
                    'connected': True
                })
            else:
                return Response({
                    'message': 'Token is still valid',
                    'expires_at': spotify_profile.token_expires_at.isoformat(),
                    'connected': True
                })
                
        except SpotifyProfile.DoesNotExist:
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to refresh token: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpotifyProxyView(APIView):
    """Proxy Spotify API requests through backend"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # Log the incoming request for debugging
            print(f"SpotifyProxyView: Received request data: {request.data}")
            
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            print(f"SpotifyProxyView: Found Spotify profile for user {request.user.id}")
            
            # Refresh token if needed
            if spotify_profile.is_token_expired():
                print("SpotifyProxyView: Token expired, refreshing...")
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.save()
                print("SpotifyProxyView: Token refreshed successfully")
            
            # Get request details from frontend
            method = request.data.get('method', 'GET')
            endpoint = request.data.get('endpoint', '')
            data = request.data.get('data')
            headers = request.data.get('headers', {})
            
            print(f"SpotifyProxyView: Making {method} request to {endpoint}")
            
            # Validate required fields
            if not endpoint:
                return Response(
                    {'error': 'Endpoint is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Make request to Spotify API
            try:
                import requests
            except ImportError:
                return Response(
                    {'error': 'Requests library not available'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            url = f"https://api.spotify.com/v1{endpoint}"
            spotify_headers = {
                'Authorization': f'Bearer {spotify_profile.access_token}',
                'Content-Type': 'application/json',
                **headers
            }
            
            print(f"SpotifyProxyView: Making request to {url}")
            
            try:
                if method.upper() == 'GET':
                    response = requests.get(url, headers=spotify_headers)
                elif method.upper() == 'POST':
                    response = requests.post(url, headers=spotify_headers, json=data)
                elif method.upper() == 'PUT':
                    response = requests.put(url, headers=spotify_headers, json=data)
                elif method.upper() == 'DELETE':
                    response = requests.delete(url, headers=spotify_headers)
                else:
                    return Response(
                        {'error': f'Unsupported method: {method}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                print(f"SpotifyProxyView: Spotify API response status: {response.status_code}")
                
                # Return Spotify API response
                if response.status_code == 204:  # No content
                    return Response(status=status.HTTP_204_NO_CONTENT)
                
                try:
                    response_data = response.json()
                    return Response(response_data, status=response.status_code)
                except ValueError:
                    # Response is not JSON
                    return Response(
                        {'content': response.text}, 
                        status=response.status_code
                    )
                    
            except requests.exceptions.RequestException as e:
                print(f"SpotifyProxyView: Request failed: {str(e)}")
                return Response(
                    {'error': f'Spotify API request failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except SpotifyProfile.DoesNotExist:
            print("SpotifyProxyView: Spotify profile not found")
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"SpotifyProxyView: Unexpected error: {str(e)}")
            return Response(
                {'error': f'Spotify API request failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpotifyCurrentTrackView(APIView):
    """Get currently playing track"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            
            # Refresh token if needed
            if spotify_profile.is_token_expired():
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.save()
            
            # Get currently playing track
            import requests
            
            url = "https://api.spotify.com/v1/me/player/currently-playing"
            headers = {
                'Authorization': f'Bearer {spotify_profile.access_token}',
                'Content-Type': 'application/json',
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 204:  # No content
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response(
                    {'error': f'Spotify API error: {response.status_code}'}, 
                    status=response.status_code
                )
                
        except SpotifyProfile.DoesNotExist:
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to get current track: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SpotifyRecentlyPlayedView(APIView):
    """Get recently played tracks"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            
            # Refresh token if needed
            if spotify_profile.is_token_expired():
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.save()
            
            # Get limit from query params
            limit = request.GET.get('limit', 20)
            
            # Get recently played tracks
            import requests
            
            url = f"https://api.spotify.com/v1/me/player/recently-played?limit={limit}"
            headers = {
                'Authorization': f'Bearer {spotify_profile.access_token}',
                'Content-Type': 'application/json',
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response(
                    {'error': f'Spotify API error: {response.status_code}'}, 
                    status=response.status_code
                )
                
        except SpotifyProfile.DoesNotExist:
            return Response(
                {'error': 'Spotify not connected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to get recently played: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
