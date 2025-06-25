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
        self.redirect_uri = getattr(settings, 'SPOTIFY_REDIRECT_URI', None)
        
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
                'redirect_uri': self.redirect_uri
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
        """Make authenticated request to Spotify API"""
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
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 204:
                return {'success': True}
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error making API request to {endpoint}: {str(e)}")
            return None
    
    def get_user_profile(self):
        """Get Spotify user profile information"""
        return self.make_api_request('/me')
    
    def get_top_tracks(self, time_range='medium_term', limit=50):
        """Get user's top tracks
        time_range: short_term (~4 weeks), medium_term (~6 months), long_term (~several years)
        """
        params = {
            'time_range': time_range,
            'limit': min(limit, 50)  # Spotify limit is 50
        }
        return self.make_api_request('/me/top/tracks', params=params)
    
    def get_top_artists(self, time_range='medium_term', limit=50):
        """Get user's top artists"""
        params = {
            'time_range': time_range,
            'limit': min(limit, 50)
        }
        return self.make_api_request('/me/top/artists', params=params)
    
    def get_recently_played(self, limit=50, after=None, before=None):
        """Get recently played tracks"""
        params = {'limit': min(limit, 50)}
        
        if after:
            params['after'] = int(after.timestamp() * 1000)  # Convert to Unix timestamp in milliseconds
        if before:
            params['before'] = int(before.timestamp() * 1000)
            
        return self.make_api_request('/me/player/recently-played', params=params)
    
    def get_current_track(self):
        """Get currently playing track"""
        return self.make_api_request('/me/player/currently-playing')
    
    def get_audio_features(self, track_ids):
        """Get audio features for multiple tracks"""
        if isinstance(track_ids, str):
            track_ids = [track_ids]
        
        # Spotify allows max 100 tracks per request
        if len(track_ids) > 100:
            track_ids = track_ids[:100]
        
        params = {'ids': ','.join(track_ids)}
        return self.make_api_request('/audio-features', params=params)
    
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
            # Get user profile from Spotify
            self.user.temp_token = token_data['access_token']  # Temporary for API call
            user_profile = self.get_user_profile()
            
            if not user_profile:
                logger.error("Failed to get user profile from Spotify")
                return None
            
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
            self._fetch_missing_audio_features()
            
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