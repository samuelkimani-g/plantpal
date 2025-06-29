import requests
import base64
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import SpotifyProfile, Track, UserTrackHistory, ListeningSession, MusicMoodProfile
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class SpotifyAPIService:
    """Comprehensive Spotify API service for authentication and data fetching"""
    
    def __init__(self, user=None):
        self.user = user
        self.client_id = getattr(settings, 'SPOTIFY_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'SPOTIFY_CLIENT_SECRET', None)
        # Use frontend URL for redirect URI since frontend handles the callback
        self.redirect_uri = getattr(settings, 'FRONTEND_URL', 'https://plantpal-three.vercel.app') + '/music'
        
        # API endpoints
        self.auth_url = "https://accounts.spotify.com/authorize"
        self.token_url = "https://accounts.spotify.com/api/token"
        self.api_base = "https://api.spotify.com/v1"
        
        # Required scopes for mood analysis
        self.scopes = [
            'user-read-recently-played',
            'user-top-read',
            'user-read-currently-playing',
            'user-library-read',
            'user-read-email',
            'user-read-private',
            'user-read-playback-state',
        ]
    
    def get_authorization_url(self, state=None):
        """Generate Spotify authorization URL"""
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(self.scopes),
            'show_dialog': 'true'  # Force user to see auth dialog
        }
        
        if state:
            params['state'] = state
        
        query_string = '&'.join([f"{key}={value}" for key, value in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    def exchange_code_for_token(self, code):
        """Exchange authorization code for access and refresh tokens"""
        try:
            # Prepare credentials
            credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': self.redirect_uri  # Use the same redirect URI as authorization
            }
            
            logger.info(f"Exchanging code for token - User: {self.user.username if self.user else 'Anonymous'}")
            
            response = requests.post(self.token_url, headers=headers, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                logger.info(f"Token exchange successful - User: {self.user.username}")
                return self._process_token_response(token_data)
            else:
                logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error exchanging code for token: {str(e)}")
            return None
    
    def refresh_access_token(self, refresh_token):
        """Refresh an expired access token"""
        try:
            credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            }
            
            logger.info(f"Refreshing access token - User: {self.user.username if self.user else 'Unknown'}")
            
            response = requests.post(self.token_url, headers=headers, data=data)
            
            if response.status_code == 200:
                token_data = response.json()
                logger.info(f"Token refresh successful - User: {self.user.username}")
                return self._process_token_response(token_data, is_refresh=True)
            else:
                logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            return None
    
    def _process_token_response(self, token_data, is_refresh=False):
        """Process token response and return structured data"""
        expires_in = token_data.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        result = {
            'access_token': token_data['access_token'],
            'token_type': token_data.get('token_type', 'Bearer'),
            'expires_at': expires_at,
            'scope': token_data.get('scope', ' '.join(self.scopes))
        }
        
        # Refresh token might not be included in refresh response
        if 'refresh_token' in token_data:
            result['refresh_token'] = token_data['refresh_token']
        
        return result
    
    def get_valid_access_token(self):
        """Get a valid access token for the user, refreshing if necessary"""
        if not self.user:
            logger.error("No user provided for token retrieval")
            return None
        
        try:
            profile = SpotifyProfile.objects.get(user=self.user)
            logger.info(f"Found Spotify profile for user: {self.user.username}")
            
            # Check if token is expired or expiring soon
            if profile.is_token_expiring_soon():
                logger.info(f"Token is expiring soon, refreshing - User: {self.user.username}")
                
                token_data = self.refresh_access_token(profile.refresh_token)
                if token_data:
                    # Update profile with new token data
                    profile.access_token = token_data['access_token']
                    profile.token_expires_at = token_data['expires_at']
                    profile.scope = token_data['scope']
                    
                    # Update refresh token if provided
                    if 'refresh_token' in token_data:
                        profile.refresh_token = token_data['refresh_token']
                    
                    profile.save()
                    logger.info(f"Token refreshed and saved - User: {self.user.username}")
                    return token_data['access_token']
                else:
                    logger.error(f"Failed to refresh token - User: {self.user.username}")
                    return None
            else:
                logger.info(f"Using existing valid token - User: {self.user.username}")
                return profile.access_token
                
        except SpotifyProfile.DoesNotExist:
            logger.error(f"No Spotify profile found for user: {self.user.username}")
            return None
        except Exception as e:
            logger.error(f"Error getting valid access token: {str(e)}")
            return None
    
    def make_api_request(self, endpoint, method='GET', params=None, data=None):
        """Make authenticated request to Spotify API with improved error handling"""
        access_token = self.get_valid_access_token()
        if not access_token:
            logger.error("No valid access token available")
            return None
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.api_base}/{endpoint.lstrip('/')}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None
            
            # Handle different response status codes
            if response.status_code == 200:
                return response
            elif response.status_code == 204:
                # No content - this is normal for some endpoints
                return response
            elif response.status_code == 401:
                logger.warning(f"Token expired for user {self.user.username if self.user else 'Unknown'}, attempting refresh")
                # Try to refresh token and retry once
                if self._refresh_and_retry(endpoint, method, params, data):
                    return self.make_api_request(endpoint, method, params, data)
                else:
                    logger.error("Failed to refresh token, user needs to re-authenticate")
                    return None
            elif response.status_code == 403:
                logger.error(f"403 Forbidden for endpoint {endpoint} - insufficient permissions or invalid token")
                # Check if it's a token issue or scope issue
                if self._is_token_related_403(response):
                    if self._refresh_and_retry(endpoint, method, params, data):
                        return self.make_api_request(endpoint, method, params, data)
                return None
            else:
                logger.error(f"Spotify API error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout making request to {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error for {endpoint}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error making request to {endpoint}: {str(e)}")
            return None

    def _refresh_and_retry(self, endpoint, method, params, data):
        """Attempt to refresh token and retry the request"""
        try:
            if not self.user:
                return False
                
            profile = SpotifyProfile.objects.get(user=self.user)
            token_data = self.refresh_access_token(profile.refresh_token)
            
            if token_data:
                # Update profile with new token data
                profile.access_token = token_data['access_token']
                profile.token_expires_at = token_data['expires_at']
                profile.scope = token_data['scope']
                
                if 'refresh_token' in token_data:
                    profile.refresh_token = token_data['refresh_token']
                
                profile.save()
                logger.info(f"Token refreshed successfully for user {self.user.username}")
                return True
            else:
                logger.error(f"Failed to refresh token for user {self.user.username}")
                return False
                
        except SpotifyProfile.DoesNotExist:
            logger.error(f"No Spotify profile found for user {self.user.username}")
            return False
        except Exception as e:
            logger.error(f"Error during token refresh: {str(e)}")
            return False

    def _is_token_related_403(self, response):
        """Check if 403 error is related to token issues"""
        try:
            error_data = response.json()
            error_message = error_data.get('error', {}).get('message', '').lower()
            
            # Check for token-related error messages
            token_related_keywords = ['token', 'expired', 'invalid', 'unauthorized', 'access denied']
            return any(keyword in error_message for keyword in token_related_keywords)
        except:
            return False
    
    def get_user_profile(self):
        """Get current user's Spotify profile"""
        response = self.make_api_request('me')
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_top_tracks(self, time_range='medium_term', limit=20):
        """Get user's top tracks"""
        params = {
            'time_range': time_range,
            'limit': limit
        }
        response = self.make_api_request('me/top/tracks', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_top_artists(self, time_range='medium_term', limit=20):
        """Get user's top artists"""
        params = {
            'time_range': time_range,
            'limit': limit
        }
        response = self.make_api_request('me/top/artists', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_recently_played(self, limit=20):
        """Get recently played tracks"""
        params = {'limit': limit}
        response = self.make_api_request('me/player/recently-played', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_current_track(self):
        """Get currently playing track"""
        response = self.make_api_request('me/player/currently-playing')
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_audio_features(self, track_ids):
        """Get audio features for multiple tracks"""
        if not track_ids:
            return None
        
        # Spotify API accepts up to 100 track IDs at once
        if len(track_ids) > 100:
            track_ids = track_ids[:100]
        
        params = {'ids': ','.join(track_ids)}
        response = self.make_api_request('audio-features', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None
    
    def get_track_info(self, track_ids):
        """Get track information for multiple tracks"""
        if isinstance(track_ids, str):
            track_ids = [track_ids]
        
        if len(track_ids) > 50:  # Spotify limit for tracks endpoint
            track_ids = track_ids[:50]
        
        params = {'ids': ','.join(track_ids)}
        return self.make_api_request('/tracks', params=params)
    
    def save_or_update_spotify_profile(self, token_data):
        """Save or update Spotify profile with token data"""
        if not self.user:
            logger.error("No user provided for profile save")
            return None
        
        try:
            # Get user profile from Spotify using the access token from token_data
            access_token = token_data['access_token']
            
            # Make a direct API call to get user profile
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f"{self.api_base}/me", headers=headers)
            if response.status_code != 200:
                logger.error(f"Failed to get user profile from Spotify: {response.status_code} - {response.text}")
                return None
            
            user_profile = response.json()
            
            # Create or update SpotifyProfile
            profile, created = SpotifyProfile.objects.update_or_create(
                user=self.user,
                defaults={
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', ''),
                    'token_expires_at': token_data['expires_at'],
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'scope': token_data.get('scope', ''),
                    'spotify_user_id': user_profile['id'],
                    'display_name': user_profile.get('display_name', ''),
                    'email': user_profile.get('email', ''),
                    'profile_image_url': user_profile.get('images', [{}])[0].get('url', '') if user_profile.get('images') else '',
                    'country': user_profile.get('country', ''),
                    'product': user_profile.get('product', ''),
                }
            )
            
            # Create or update MusicMoodProfile
            mood_profile, _ = MusicMoodProfile.objects.get_or_create(
                user=self.user,
                defaults={
                    'current_mood_score': 0.5,
                    'current_mood_label': 'neutral'
                }
            )
            
            logger.info(f"Spotify profile {'created' if created else 'updated'} for user: {self.user.username}")
            return profile
            
        except Exception as e:
            logger.error(f"Error saving Spotify profile: {str(e)}")
            return None
    
    def save_track_with_features(self, track_data, audio_features=None):
        """Save track with audio features to database"""
        try:
            track_id = track_data['id']
            
            # Extract artist names
            artists = [artist['name'] for artist in track_data.get('artists', [])]
            
            # Get album image
            album_image = ''
            if track_data.get('album', {}).get('images'):
                album_image = track_data['album']['images'][0]['url']
            
            # Create or update track
            track, created = Track.objects.update_or_create(
                spotify_id=track_id,
                defaults={
                    'uri': track_data['uri'],
                    'name': track_data['name'],
                    'artists': artists,
                    'album_name': track_data.get('album', {}).get('name', ''),
                    'album_image_url': album_image,
                    'duration_ms': track_data['duration_ms'],
                    'popularity': track_data.get('popularity', 0),
                    'preview_url': track_data.get('preview_url', ''),
                }
            )
            
            # Add audio features if provided
            if audio_features:
                track.valence = audio_features.get('valence')
                track.energy = audio_features.get('energy')
                track.danceability = audio_features.get('danceability')
                track.tempo = audio_features.get('tempo')
                track.loudness = audio_features.get('loudness')
                track.speechiness = audio_features.get('speechiness')
                track.acousticness = audio_features.get('acousticness')
                track.instrumentalness = audio_features.get('instrumentalness')
                track.liveness = audio_features.get('liveness')
                track.audio_features_fetched = True
                track.last_analyzed = timezone.now()
                
                # Compute mood
                track.computed_mood_score = track.compute_mood_score()
                track.mood_label = track.get_mood_label()
                
                track.save()
            
            return track
            
        except Exception as e:
            logger.error(f"Error saving track: {str(e)}")
            return None
    
    def analyze_and_save_listening_data(self):
        """Fetch and analyze user's listening data"""
        if not self.user:
            logger.error("No user provided for listening data analysis")
            return None
        
        try:
            logger.info(f"Starting listening data analysis for user: {self.user.username}")
            
            # Get recently played tracks
            recent_data = self.get_recently_played(limit=50)
            if not recent_data or 'items' not in recent_data:
                logger.warning(f"No recent tracks found for user: {self.user.username}")
                return None
            
            tracks_processed = 0
            session = None
            
            for item in recent_data['items']:
                track_data = item['track']
                played_at = datetime.fromisoformat(item['played_at'].replace('Z', '+00:00'))
                
                # Save track (without audio features for now)
                track = self.save_track_with_features(track_data)
                if not track:
                    continue
                
                # Create listening session if needed
                if not session or (timezone.now() - session.session_start).total_seconds() > 3600:  # New session after 1 hour gap
                    session = ListeningSession.objects.create(
                        user=self.user,
                        session_start=played_at,
                        is_active=False
                    )
                
                # Save user track history
                UserTrackHistory.objects.update_or_create(
                    user=self.user,
                    track=track,
                    played_at=played_at,
                    defaults={
                        'session': session,
                        'progress_ms': 0,
                        'play_duration_ms': track.duration_ms,  # Assume full play for recently played
                        'context_type': item.get('context', {}).get('type', '') if item.get('context') else '',
                        'context_uri': item.get('context', {}).get('uri', '') if item.get('context') else '',
                    }
                )
                
                tracks_processed += 1
            
            # Get audio features for all tracks that don't have them
            # self._fetch_missing_audio_features()  # Commented out to prevent 403 errors - using text-based mood analysis instead
            
            # Update session with computed data
            if session:
                self._update_session_mood_data(session)
            
            logger.info(f"Processed {tracks_processed} tracks for user: {self.user.username}")
            return tracks_processed
            
        except Exception as e:
            logger.error(f"Error analyzing listening data: {str(e)}")
            return None
    
    def _fetch_missing_audio_features(self):
        """Fetch audio features for tracks that don't have them"""
        try:
            # Get tracks without audio features
            tracks_without_features = Track.objects.filter(
                audio_features_fetched=False,
                user_history__user=self.user
            ).distinct()[:100]  # Limit to 100 for API efficiency
            
            if not tracks_without_features:
                return
            
            track_ids = [track.spotify_id for track in tracks_without_features]
            audio_features_data = self.get_audio_features(track_ids)
            
            if audio_features_data and 'audio_features' in audio_features_data:
                for i, features in enumerate(audio_features_data['audio_features']):
                    if features and i < len(tracks_without_features):
                        track = tracks_without_features[i]
                        
                        # Update track with audio features
                        track.valence = features.get('valence')
                        track.energy = features.get('energy')
                        track.danceability = features.get('danceability')
                        track.tempo = features.get('tempo')
                        track.loudness = features.get('loudness')
                        track.speechiness = features.get('speechiness')
                        track.acousticness = features.get('acousticness')
                        track.instrumentalness = features.get('instrumentalness')
                        track.liveness = features.get('liveness')
                        track.audio_features_fetched = True
                        track.last_analyzed = timezone.now()
                        
                        # Compute mood
                        track.computed_mood_score = track.compute_mood_score()
                        track.mood_label = track.get_mood_label()
                        
                        track.save()
            
            logger.info(f"Updated audio features for {len(tracks_without_features)} tracks")
            
        except Exception as e:
            logger.error(f"Error fetching audio features: {str(e)}")
    
    def _update_session_mood_data(self, session):
        """Update session with computed mood data from tracks"""
        try:
            # Get all tracks in this session with audio features
            session_tracks = UserTrackHistory.objects.filter(
                session=session,
                track__audio_features_fetched=True
            ).select_related('track')
            
            if not session_tracks:
                return
            
            # Compute averages
            total_tracks = session_tracks.count()
            valence_sum = sum(track.track.valence for track in session_tracks if track.track.valence)
            energy_sum = sum(track.track.energy for track in session_tracks if track.track.energy)
            danceability_sum = sum(track.track.danceability for track in session_tracks if track.track.danceability)
            tempo_sum = sum(track.track.tempo for track in session_tracks if track.track.tempo)
            
            if total_tracks > 0:
                session.average_valence = valence_sum / total_tracks
                session.average_energy = energy_sum / total_tracks
                session.average_danceability = danceability_sum / total_tracks
                session.average_tempo = tempo_sum / total_tracks
                session.total_tracks = total_tracks
                
                # Compute session mood
                session.computed_mood_score = (
                    session.average_valence * 0.4 +
                    session.average_energy * 0.3 +
                    session.average_danceability * 0.2 +
                    min(1, (session.average_tempo - 60) / 140) * 0.1
                )
                
                # Determine mood label
                if session.computed_mood_score > 0.7:
                    session.mood_label = 'happy'
                elif session.computed_mood_score > 0.6:
                    session.mood_label = 'upbeat'
                elif session.computed_mood_score > 0.4:
                    session.mood_label = 'neutral'
                elif session.computed_mood_score > 0.3:
                    session.mood_label = 'calm'
                else:
                    session.mood_label = 'sad'
                
                session.save()
                
                # Update user's overall mood profile
                self._update_user_mood_profile()
            
        except Exception as e:
            logger.error(f"Error updating session mood data: {str(e)}")
    
    def _update_user_mood_profile(self):
        """Update user's overall music mood profile"""
        try:
            mood_profile, _ = MusicMoodProfile.objects.get_or_create(
                user=self.user,
                defaults={'current_mood_score': 0.5, 'current_mood_label': 'neutral'}
            )
            
            # Get recent sessions (last 7 days)
            recent_sessions = ListeningSession.objects.filter(
                user=self.user,
                session_start__gte=timezone.now() - timedelta(days=7)
            ).exclude(computed_mood_score__isnull=True)
            
            if recent_sessions:
                # Compute weighted average (recent sessions have more weight)
                total_weight = 0
                weighted_mood_sum = 0
                
                for session in recent_sessions:
                    # Weight decreases with age
                    days_ago = (timezone.now() - session.session_start).days
                    weight = max(0.1, 1.0 - (days_ago / 7.0))
                    
                    weighted_mood_sum += session.computed_mood_score * weight
                    total_weight += weight
                
                if total_weight > 0:
                    mood_profile.current_mood_score = weighted_mood_sum / total_weight
                    
                    # Update mood label
                    if mood_profile.current_mood_score > 0.7:
                        mood_profile.current_mood_label = 'happy'
                    elif mood_profile.current_mood_score > 0.6:
                        mood_profile.current_mood_label = 'upbeat'
                    elif mood_profile.current_mood_score > 0.4:
                        mood_profile.current_mood_label = 'neutral'
                    elif mood_profile.current_mood_score > 0.3:
                        mood_profile.current_mood_label = 'calm'
                    else:
                        mood_profile.current_mood_label = 'sad'
                    
                    mood_profile.save()
            
        except Exception as e:
            logger.error(f"Error updating user mood profile: {str(e)}")
    
    def disconnect_spotify(self):
        """Completely disconnect Spotify for the user"""
        if not self.user:
            logger.error("No user provided for Spotify disconnect")
            return False
        
        try:
            logger.info(f"Disconnecting Spotify for user: {self.user.username}")
            
            # Delete Spotify profile
            SpotifyProfile.objects.filter(user=self.user).delete()
            
            # Reset music mood profile
            MusicMoodProfile.objects.filter(user=self.user).update(
                current_mood_score=0.5,
                current_mood_label='neutral',
                mood_growth_multiplier=1.0
            )
            
            # Clean up listening sessions
            ListeningSession.objects.filter(user=self.user).delete()
            
            # Clean up user track history
            UserTrackHistory.objects.filter(user=self.user).delete()
            
            logger.info(f"Spotify disconnected successfully for user: {self.user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Error disconnecting Spotify: {str(e)}")
            return False

    def is_connected(self):
        """Check if user is connected to Spotify and has valid tokens"""
        if not self.user:
            return False
        
        try:
            profile = SpotifyProfile.objects.get(user=self.user)
            return not profile.is_token_expired()
        except SpotifyProfile.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error checking Spotify connection: {str(e)}")
            return False

    def calculate_mood_score_from_track_info(self, track_data):
        """Calculate a simple mood score from track information"""
        try:
            # Simple mood calculation based on popularity and duration
            popularity = track_data.get('popularity', 50)
            duration_ms = track_data.get('duration_ms', 180000)  # Default 3 minutes
            
            # Convert popularity (0-100) to mood score (0-1)
            popularity_score = popularity / 100.0
            
            # Duration factor (shorter songs might be more energetic)
            duration_factor = min(1.0, duration_ms / 300000)  # Normalize to 5 minutes
            
            # Simple weighted average
            mood_score = (popularity_score * 0.7) + (duration_factor * 0.3)
            
            return max(0.0, min(1.0, mood_score))
        except Exception as e:
            logger.error(f"Error calculating mood score: {str(e)}")
            return 0.5  # Default neutral mood

    def get_mood_description(self, mood_score):
        """Convert mood score to descriptive label"""
        if mood_score >= 0.8:
            return 'happy'
        elif mood_score >= 0.6:
            return 'upbeat'
        elif mood_score >= 0.4:
            return 'neutral'
        elif mood_score >= 0.2:
            return 'melancholic'
        else:
            return 'sad'

    def get_spotify_user_profile(self):
        """Get current user's Spotify profile"""
        try:
            response = self.make_api_request('me')
            if response and response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get user profile: {response.status_code if response else 'No response'}")
                return None
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            return None

    def get_currently_playing(self):
        """Get currently playing track"""
        try:
            response = self.make_api_request('me/player/currently-playing')
            if response and response.status_code == 200:
                return response.json()
            elif response and response.status_code == 204:
                # No content - nothing playing
                return None
            else:
                logger.error(f"Failed to get currently playing: {response.status_code if response else 'No response'}")
                return None
        except Exception as e:
            logger.error(f"Error getting currently playing: {str(e)}")
            return None

    def get_recently_played_tracks(self, limit=50):
        """Get recently played tracks"""
        try:
            params = {'limit': limit}
            response = self.make_api_request('me/player/recently-played', params=params)
            if response and response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get recently played: {response.status_code if response else 'No response'}")
                return None
        except Exception as e:
            logger.error(f"Error getting recently played: {str(e)}")
            return None

    def get_users_top_tracks(self, time_range='medium_term', limit=50):
        """Get user's top tracks"""
        try:
            params = {'time_range': time_range, 'limit': limit}
            response = self.make_api_request('me/top/tracks', params=params)
            if response and response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get top tracks: {response.status_code if response else 'No response'}")
                return None
        except Exception as e:
            logger.error(f"Error getting top tracks: {str(e)}")
            return None

    def save_spotify_profile_and_mood(self, user_profile_data, token_data):
        """Save or update Spotify profile and create mood profile"""
        try:
            # Save Spotify profile
            profile, created = SpotifyProfile.objects.update_or_create(
                user=self.user,
                defaults={
                    'spotify_user_id': user_profile_data['id'],
                    'display_name': user_profile_data.get('display_name', ''),
                    'email': user_profile_data.get('email', ''),
                    'profile_image_url': user_profile_data.get('images', [{}])[0].get('url', '') if user_profile_data.get('images') else '',
                    'country': user_profile_data.get('country', ''),
                    'product': user_profile_data.get('product', ''),
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', ''),
                    'token_expires_at': token_data['expires_at'],
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'scope': token_data.get('scope', '')
                }
            )
            
            # Create or update mood profile
            mood_profile, mood_created = MusicMoodProfile.objects.get_or_create(
                user=self.user,
                defaults={
                    'current_mood_score': 0.5,
                    'current_mood_label': 'neutral',
                    'total_music_minutes': 0
                }
            )
            
            logger.info(f"Spotify profile {'created' if created else 'updated'} for user: {self.user.username}")
            return profile
            
        except Exception as e:
            logger.error(f"Error saving Spotify profile: {str(e)}")
            return None

    def get_playlists(self, limit=50):
        """Get user's playlists"""
        params = {'limit': limit}
        response = self.make_api_request('me/playlists', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None

    def get_playlist_tracks(self, playlist_id, limit=100):
        """Get tracks from a specific playlist"""
        params = {'limit': limit}
        response = self.make_api_request(f'playlists/{playlist_id}/tracks', params=params)
        if response and response.status_code == 200:
            return response.json()
        return None

    def get_audio_analysis(self, track_id):
        """Get detailed audio analysis for a track"""
        response = self.make_api_request(f'audio-analysis/{track_id}')
        if response and response.status_code == 200:
            return response.json()
        return None