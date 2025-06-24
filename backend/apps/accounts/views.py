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
from apps.plants.services import SpotifyService, PlantGrowthService
from django.conf import settings
import logging
import requests

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
        logger = logging.getLogger(__name__)
        if not request.user.is_authenticated:
            logger.warning("SpotifyCallbackView: Unauthenticated user tried to connect Spotify.")
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri', settings.SPOTIPY_REDIRECT_URI)
        logger.info(f"SpotifyCallbackView: Received code={code} for user={request.user.username}")
        if not code:
            logger.error("SpotifyCallbackView: No code provided in request.")
            return Response(
                {'error': 'Authorization code is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            # Exchange code for tokens
            token_data = SpotifyService.exchange_code_for_tokens(code, redirect_uri)
            logger.info(f"SpotifyCallbackView: Token data received for user={request.user.username}: {token_data}")
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
                logger.info(f"SpotifyCallbackView: Updating existing SpotifyProfile for user={request.user.username}")
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.refresh_token = token_data['refresh_token']
                spotify_profile.token_expires_at = expires_at
                spotify_profile.token_type = token_data.get('token_type', 'Bearer')
                spotify_profile.scope = token_data.get('scope', '')
                spotify_profile.save()
            logger.info(f"SpotifyCallbackView: Spotify tokens saved for user={request.user.username}")
            return Response({
                'message': 'Spotify connected successfully',
                'expires_at': expires_at.isoformat(),
                'connected': True
            })
        except Exception as e:
            logger.error(f"SpotifyCallbackView: Failed to connect Spotify for user={request.user.username}: {str(e)}")
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
        logger = logging.getLogger(__name__)
        try:
            print(f"DEBUG: SpotifyStatusView: Checking status for user {request.user.username}")
            
            spotify_profile = SpotifyProfile.objects.get(user=request.user)
            print(f"DEBUG: SpotifyStatusView: Found Spotify profile for user {request.user.username}")
            print(f"DEBUG: SpotifyStatusView: Access token present: {bool(spotify_profile.access_token)}")
            print(f"DEBUG: SpotifyStatusView: Refresh token present: {bool(spotify_profile.refresh_token)}")
            print(f"DEBUG: SpotifyStatusView: Token expires at: {spotify_profile.token_expires_at}")
            print(f"DEBUG: SpotifyStatusView: Token expired: {spotify_profile.is_token_expired()}")
            
            return Response({
                'connected': True,
                'expires_at': spotify_profile.token_expires_at.isoformat() if spotify_profile.token_expires_at else None,
                'is_expired': spotify_profile.is_token_expired(),
                'scope': spotify_profile.scope,
                'has_access_token': bool(spotify_profile.access_token),
                'has_refresh_token': bool(spotify_profile.refresh_token),
                'token_type': spotify_profile.token_type
            })
        except SpotifyProfile.DoesNotExist:
            print(f"DEBUG: SpotifyStatusView: No Spotify profile found for user {request.user.username}")
            return Response({
                'connected': False,
                'expires_at': None,
                'is_expired': True,
                'scope': None,
                'has_access_token': False,
                'has_refresh_token': False,
                'token_type': None,
                'error': 'No Spotify profile found'
            })
        except Exception as e:
            print(f"DEBUG: SpotifyStatusView: Unexpected error: {str(e)}")
            logger.error(f"Unexpected error in SpotifyStatusView for user {request.user.id}: {str(e)}")
            return Response({
                'connected': False,
                'error': f'Unexpected error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        logger = logging.getLogger(__name__)
        try:
            logger.info(f"SpotifyProxyView: Received request data: {request.data}")
            try:
                spotify_profile = SpotifyProfile.objects.get(user=request.user)
            except SpotifyProfile.DoesNotExist:
                logger.warning(f"SpotifyProxyView: Spotify profile not found for user {request.user.id}")
                return Response({'error': 'Spotify not connected'}, status=status.HTTP_403_FORBIDDEN)
            logger.info(f"SpotifyProxyView: Found Spotify profile for user {request.user.id}")
            # Refresh token if needed
            if spotify_profile.is_token_expired():
                logger.info("SpotifyProxyView: Token expired, refreshing...")
                try:
                    token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                    spotify_profile.access_token = token_data['access_token']
                    spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                    spotify_profile.save()
                    logger.info("SpotifyProxyView: Token refreshed successfully")
                except Exception as e:
                    logger.error(f"SpotifyProxyView: Failed to refresh token: {str(e)}")
                    return Response({'error': 'Failed to refresh token', 'details': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            # Get request details from frontend
            method = request.data.get('method', 'GET')
            endpoint = request.data.get('endpoint', '')
            data = request.data.get('data')
            headers = request.data.get('headers', {})
            logger.info(f"SpotifyProxyView: Making {method} request to {endpoint}")
            # Validate required fields
            if not endpoint:
                return Response(
                    {'error': 'Endpoint is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Make request to Spotify API
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
                
        except Exception as e:
            logger.error(f"SpotifyProxyView: Unexpected error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SpotifyCurrentTrackView(APIView):
    """Get currently playing track"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            spotify_service = SpotifyService(request.user)
            current_track = spotify_service.get_current_track()
            
            if current_track:
                track_info = current_track['item']
                return Response({
                    'is_playing': current_track['is_playing'],
                    'track_name': track_info['name'],
                    'artist_name': track_info['artists'][0]['name'],
                    'album_name': track_info['album']['name'],
                    'track_id': track_info['id']
                }, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'No track currently playing'}, status=status.HTTP_204_NO_CONTENT)
                
        except Exception as e:
            print(f"Unexpected error in SpotifyCurrentTrackView for user {request.user.id}: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SpotifyRecentlyPlayedView(APIView):
    """Get recently played tracks"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            spotify_service = SpotifyService(request.user)
            valence_scores = spotify_service.get_recent_tracks_valence()
            
            if valence_scores:
                avg_valence = sum(valence_scores) / len(valence_scores)
                return Response({
                    'valence_scores': valence_scores,
                    'average_valence': avg_valence,
                    'track_count': len(valence_scores)
                }, status=status.HTTP_200_OK)
            else:
                return Response({'message': 'No recent tracks found'}, status=status.HTTP_204_NO_CONTENT)
                
        except Exception as e:
            print(f"Unexpected error in SpotifyRecentlyPlayedView for user {request.user.id}: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SpotifyMoodView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            spotify_service = SpotifyService(request.user)
            spotify_mood_score = spotify_service.get_and_process_valence()
            
            if spotify_mood_score is not None:
                plant = request.user.plant 
                if plant:
                    plant_growth_service = PlantGrowthService(plant, request.user)
                    plant_growth_service.calculate_growth_and_health(mood_score=spotify_mood_score)
                    return Response({
                        "message": "Spotify mood processed, plant updated.", 
                        "mood_score": spotify_mood_score
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({"message": "User has no plant to update."}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({
                    "message": "Could not get Spotify mood data. Ensure music is playing or recently played."
                }, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            print(f"Unexpected error in SpotifyMoodView for user {request.user.id}: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
