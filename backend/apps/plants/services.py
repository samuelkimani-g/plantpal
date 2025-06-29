import os
import json
import requests
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import numpy as np
import logging

class PlantGrowthService:
    """Service to handle plant growth logic and state updates"""
    
    MOOD_WEIGHTS = {
        'journal': 0.4,  # Journal entries have strong impact
        'music': 0.3,    # Music has moderate impact
        'activity': 0.3  # Daily app usage has moderate impact
    }

    GROWTH_THRESHOLDS = [
        (0.8, 'excellent'),   # Very positive mood
        (0.6, 'good'),       # Positive mood
        (0.4, 'fair'),       # Neutral mood
        (0.2, 'poor'),       # Negative mood
        (0.0, 'critical')    # Very negative mood
    ]

    @classmethod
    def update_plant_mood(cls, plant, mood_score, entry_type='journal'):
        """
        Update plant growth based on mood score from different sources
        mood_score should be between -1 and 1
        """
        # Normalize mood score to 0-1 range
        normalized_score = (mood_score + 1) / 2

        # Get weight for this type of entry
        weight = cls.MOOD_WEIGHTS.get(entry_type, 0.2)
        
        # Calculate weighted impact on plant
        impact = normalized_score * weight
        
        # Update plant metrics
        plant.health_score = min(100, max(0, plant.health_score + (impact * 20)))
        
        # Update growth if mood is positive
        if normalized_score > 0.6:
            plant.growth_stage = min(10, plant.growth_stage + (impact * 0.5))
            if plant.growth_stage >= 10:
                plant.growth_level = min(10, plant.growth_level + 1)
                plant.growth_stage = 0
        
        # Update mood influence
        for threshold, mood in cls.GROWTH_THRESHOLDS:
            if normalized_score >= threshold:
                plant.current_mood_influence = mood
                break
        
        # Update 3D visualization
        plant.update_3d_params()
        
        # Log the activity
        plant.logs.create(
            activity_type=entry_type,
            growth_impact=impact,
            value=mood_score,
            note=f"Mood update from {entry_type}"
        )
        
        plant.save()
        return impact

    @classmethod
    def process_music_mood(cls, plant, audio_features, duration_minutes):
        """
        Process mood from Spotify audio features
        """
        if not audio_features:
            return 0
        
        # Calculate mood score from audio features
        valence = audio_features.get('valence', 0.5)
        energy = audio_features.get('energy', 0.5)
        
        # Combine features into mood score (-1 to 1)
        mood_score = (valence * 2 - 1) * 0.7 + (energy * 2 - 1) * 0.3
        
        # Update plant's music stats
        plant.music_boost_active = True
        plant.total_music_minutes += duration_minutes
        
        # Update plant based on music mood
        return cls.update_plant_mood(plant, mood_score, entry_type='music')

    @classmethod
    def process_daily_activity(cls, plant):
        """
        Process daily app usage impact
        """
        today = timezone.now().date()
        recent_logs = plant.logs.filter(
            created_at__date__gte=today - timedelta(days=7)
        )
        
        # Calculate activity score based on log frequency
        daily_logs = recent_logs.count() / 7  # Average logs per day
        activity_score = min(1.0, daily_logs / 3)  # Cap at 3 logs per day
        
        return cls.update_plant_mood(plant, activity_score * 2 - 1, entry_type='activity')

    @staticmethod
    def process_journal_sentiment(plant, journal_text):
        """Analyze journal sentiment and update plant accordingly"""
        try:
            # Configure Gemini API
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # Create sentiment analysis prompt
            prompt = f"""
            Analyze the sentiment of this journal entry and respond with ONLY a number between 0.0 and 1.0:
            - 0.0 = very negative/sad
            - 0.5 = neutral
            - 1.0 = very positive/happy
            
            Journal entry: "{journal_text}"
            
            Respond with only the number (e.g., 0.7):
            """
            
            response = model.generate_content(prompt)
            sentiment_score = float(response.text.strip())
            
            # Clamp between 0.0 and 1.0
            sentiment_score = max(0.0, min(1.0, sentiment_score))
            
            # Update plant's journal mood score (weighted average with previous)
            if plant.journal_mood_score == 0.5:  # First journal entry
                plant.journal_mood_score = sentiment_score
            else:
                # Weighted average: 70% new, 30% previous
                plant.journal_mood_score = (sentiment_score * 0.7) + (plant.journal_mood_score * 0.3)
            
            plant.update_mood_influence()
            
            # Log the sentiment analysis
            from .models import PlantLog
            PlantLog.objects.create(
                plant=plant,
                activity_type="journal_sentiment",
                note=f"Journal sentiment analyzed: {sentiment_score:.2f}",
                value=sentiment_score,
                growth_impact=sentiment_score * 5  # Positive sentiment helps growth
            )
            
            return sentiment_score
            
        except Exception as e:
            print(f"Error analyzing journal sentiment: {e}")
            return 0.5  # Default to neutral

    @staticmethod
    def process_spotify_mood(plant, valence_scores):
        """Process Spotify valence scores and update plant mood"""
        if not valence_scores:
            return
        
        try:
            # Calculate average valence
            avg_valence = sum(valence_scores) / len(valence_scores)
            
            # Update plant's Spotify mood score (weighted average)
            if plant.spotify_mood_score == 0.5:  # First Spotify data
                plant.spotify_mood_score = avg_valence
            else:
                # Weighted average: 60% new, 40% previous
                plant.spotify_mood_score = (avg_valence * 0.6) + (plant.spotify_mood_score * 0.4)
            
            plant.update_mood_influence()
            
            # Log the Spotify mood update
            from .models import PlantLog
            PlantLog.objects.create(
                plant=plant,
                activity_type="spotify_mood",
                note=f"Spotify mood updated: {avg_valence:.2f} (from {len(valence_scores)} tracks)",
                value=avg_valence,
                growth_impact=avg_valence * 3  # Music mood helps growth
            )
            
        except Exception as e:
            print(f"Error processing Spotify mood: {e}")

    @staticmethod
    def update_plant_health(plant):
        """Update plant health based on various factors"""
        health_change = 0
        
        # Water level impact
        if plant.water_level < 20:
            health_change -= 5  # Dehydration
        elif plant.water_level > 80:
            health_change += 2  # Well hydrated
        
        # Time since last watering
        if plant.last_watered_at:
            days_since_water = (timezone.now() - plant.last_watered_at).days
            if days_since_water > 3:
                health_change -= days_since_water * 2  # Neglect penalty
        
        # Mood influence
        mood_bonus = (plant.combined_mood_score - 0.5) * 10  # -5 to +5
        health_change += mood_bonus
        
        # Apply health change
        plant.health_score = max(0, min(100, plant.health_score + health_change))
        
        # Decrease water level over time
        if plant.last_watered_at:
            hours_since_water = (timezone.now() - plant.last_watered_at).total_seconds() / 3600
            water_decrease = int(hours_since_water / 6)  # Lose 1 water every 6 hours
            plant.water_level = max(0, plant.water_level - water_decrease)
        
        plant.save()

    @classmethod
    def update_combined_mood(cls, plant, journal_mood=None, music_mood=None):
        """Update the plant's combined mood score from journal and music mood (0.0-1.0)"""
        # Use most recent if not provided
        if journal_mood is None:
            journal_mood = getattr(plant, 'journal_mood_score', 0.5)
        if music_mood is None:
            music_mood = getattr(plant, 'spotify_mood_score', 0.5)
        # Weighted average: 60% journal, 40% music
        combined = (journal_mood * 0.6) + (music_mood * 0.4)
        plant.combined_mood_score = combined
        plant.save()
        return combined

    @classmethod
    def update_plant_reactivity(cls, plant):
        """Update plant health/growth based on combined mood score"""
        score = getattr(plant, 'combined_mood_score', 0.5)
        # Example: boost health if combined mood is high, penalize if low
        if score > 0.7:
            plant.health_score = min(100, plant.health_score + 5)
            plant.growth_stage = min(10, plant.growth_stage + 1)
        elif score < 0.3:
            plant.health_score = max(0, plant.health_score - 5)
        plant.update_3d_params()
        plant.save()

    @classmethod
    def update_fantasy_params(cls, plant, mood_history=None, theme=None):
        """Generate fantasy_params for the plant based on mood history or a chosen theme"""
        # Example: use mood history to set color, shape, etc.
        params = {}
        if mood_history:
            avg_mood = sum(mood_history) / len(mood_history)
            params['fantasy_color'] = 'rainbow' if avg_mood > 0.8 else 'blue' if avg_mood < 0.3 else 'emerald'
            params['fantasy_shape'] = 'spiral' if avg_mood > 0.7 else 'classic'
        if theme:
            params['theme'] = theme
        plant.fantasy_params = params
        plant.save()
        return params

    @classmethod
    def reward_mindfulness(cls, plant, reward_type='breathing'):
        """Reward the plant for completing a mindfulness exercise"""
        if reward_type == 'breathing':
            plant.health_score = min(100, plant.health_score + 10)
            plant.growth_stage = min(10, plant.growth_stage + 1)
        elif reward_type == 'gratitude':
            plant.health_score = min(100, plant.health_score + 5)
        plant.update_3d_params()
        plant.save()
        return True

class SpotifyService:
    """Service to handle Spotify API interactions"""
    
    def __init__(self, user):
        self.user = user
        self.logger = logging.getLogger(__name__)
    
    @staticmethod
    def get_auth_url(redirect_uri=None):
        """Get Spotify authorization URL"""
        if not redirect_uri:
            # Use frontend URL for redirect URI since frontend handles the callback
            redirect_uri = getattr(settings, 'FRONTEND_URL', 'https://plantpal-three.vercel.app') + '/music'
        
        scopes = [
            'user-read-recently-played',
            'user-read-currently-playing',
            'user-read-playback-state',
            'user-top-read',
            'user-library-read'
        ]
        
        params = {
            'client_id': settings.SPOTIFY_CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'scope': ' '.join(scopes),
            'show_dialog': 'true'
        }
        
        import urllib.parse
        query_string = urllib.parse.urlencode(params)
        return f"https://accounts.spotify.com/authorize?{query_string}"
    
    @staticmethod
    def exchange_code_for_tokens(code, redirect_uri=None):
        """Exchange authorization code for access and refresh tokens"""
        logger = logging.getLogger(__name__)
        print(f"DEBUG: Exchange code received: {code[:10]}...")
        
        if not redirect_uri:
            # Use frontend URL for redirect URI since frontend handles the callback
            redirect_uri = getattr(settings, 'FRONTEND_URL', 'https://plantpal-three.vercel.app') + '/music'
        
        token_url = "https://accounts.spotify.com/api/token"
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': settings.SPOTIFY_CLIENT_ID,
            'client_secret': settings.SPOTIFY_CLIENT_SECRET,
        }
        
        logger.info(f"SpotifyService.exchange_code_for_tokens: Exchanging code={code} for tokens.")
        response = requests.post(token_url, data=data)
        
        print(f"DEBUG: Token exchange response status: {response.status_code}")
        logger.info(f"SpotifyService.exchange_code_for_tokens: Response status={response.status_code}, body={response.text}")
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"DEBUG: Token info received: {token_data}")
            return {
                'access_token': token_data['access_token'],
                'refresh_token': token_data['refresh_token'],
                'expires_in': token_data['expires_in'],
                'token_type': token_data.get('token_type', 'Bearer'),
                'scope': token_data.get('scope', '')
            }
        else:
            logger.error(f"SpotifyService.exchange_code_for_tokens: Failed to exchange code: {response.text}")
            raise Exception(f"Failed to exchange code: {response.text}")

    @staticmethod
    def refresh_access_token(refresh_token):
        """Refresh an expired access token"""
        logger = logging.getLogger(__name__)
        if not refresh_token:
            logger.error("SpotifyService.refresh_access_token: No refresh token provided.")
            raise Exception("No refresh token provided.")
        
        print(f"DEBUG: ============ SPOTIFY TOKEN REFRESH ATTEMPT ============")
        print(f"DEBUG: Refresh token provided: {bool(refresh_token)}")
        print(f"DEBUG: Refresh token (first 10 chars): {refresh_token[:10]}...")
        print(f"DEBUG: Refresh token (last 10 chars): ...{refresh_token[-10:]}")
        
        token_url = "https://accounts.spotify.com/api/token"
        print(f"DEBUG: Token refresh URL: {token_url}")
        
        # Prepare request data
        data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': settings.SPOTIFY_CLIENT_ID,
            'client_secret': settings.SPOTIFY_CLIENT_SECRET,
        }
        
        # Log request details (mask sensitive data)
        print(f"DEBUG: Request POST data:")
        print(f"  - grant_type: {data['grant_type']}")
        print(f"  - refresh_token: {refresh_token[:10]}...{refresh_token[-10:]}")
        print(f"  - client_id: {settings.SPOTIFY_CLIENT_ID}")
        print(f"  - client_secret: {'*' * len(settings.SPOTIFY_CLIENT_SECRET)}")
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        print(f"DEBUG: Request headers: {headers}")
        
        try:
            logger.info(f"SpotifyService.refresh_access_token: Refreshing token for refresh_token={refresh_token[:6]}***")
            
            print(f"DEBUG: Making POST request to Spotify token endpoint...")
            response = requests.post(token_url, data=data, headers=headers)
            
            print(f"DEBUG: ============ SPOTIFY TOKEN REFRESH RESPONSE ============")
            print(f"DEBUG: Response status code: {response.status_code}")
            print(f"DEBUG: Response headers: {dict(response.headers)}")
            print(f"DEBUG: Response body (full): {response.text}")
            
            logger.info(f"SpotifyService.refresh_access_token: Response status={response.status_code}, body={response.text}")
            
            if response.status_code == 200:
                token_data = response.json()
                print(f"DEBUG: ✅ TOKEN REFRESH SUCCESSFUL!")
                print(f"DEBUG: New access_token (first 10 chars): {token_data['access_token'][:10]}...")
                print(f"DEBUG: Token expires_in: {token_data['expires_in']} seconds")
                print(f"DEBUG: Token type: {token_data.get('token_type', 'Bearer')}")
                print(f"DEBUG: Token scope: {token_data.get('scope', 'N/A')}")
                
                return {
                    'access_token': token_data['access_token'],
                    'expires_in': token_data['expires_in'],
                    'token_type': token_data.get('token_type', 'Bearer'),
                    'scope': token_data.get('scope', '')
                }
            else:
                print(f"DEBUG: ❌ TOKEN REFRESH FAILED!")
                print(f"DEBUG: Error status: {response.status_code}")
                print(f"DEBUG: Error response: {response.text}")
                
                # Parse error details if possible
                try:
                    error_data = response.json()
                    print(f"DEBUG: Parsed error data: {error_data}")
                    error_msg = error_data.get('error_description', error_data.get('error', 'Unknown error'))
                    print(f"DEBUG: Spotify error message: {error_msg}")
                except:
                    error_msg = response.text
                
                logger.error(f"SpotifyService.refresh_access_token: Failed to refresh token: {response.text}")
                raise Exception(f"Failed to refresh token: {error_msg}")
                
        except requests.exceptions.RequestException as e:
            print(f"DEBUG: ❌ REQUEST EXCEPTION during token refresh: {str(e)}")
            logger.error(f"SpotifyService.refresh_access_token: Request exception: {str(e)}")
            raise Exception(f"Network error during token refresh: {str(e)}")
        except Exception as e:
            print(f"DEBUG: ❌ UNEXPECTED EXCEPTION during token refresh: {str(e)}")
            logger.error(f"SpotifyService.refresh_access_token: Unexpected error: {str(e)}")
            raise

    def get_user_spotify_profile(self):
        """Get user's Spotify profile or return None if not connected"""
        try:
            from apps.accounts.models import SpotifyProfile
            spotify_profile = SpotifyProfile.objects.get(user=self.user)
            print(f"DEBUG: Found Spotify profile for user: {self.user.username} (ID: {self.user.id})")
            print(f"DEBUG: Spotify profile access token present: {bool(spotify_profile.access_token)}")
            print(f"DEBUG: Spotify profile refresh token present: {bool(spotify_profile.refresh_token)}")
            print(f"DEBUG: Spotify profile token expires at: {spotify_profile.token_expires_at}")
            print(f"DEBUG: Spotify profile token expired: {spotify_profile.is_token_expired()}")
            return spotify_profile
        except SpotifyProfile.DoesNotExist:
            print(f"DEBUG: No Spotify profile found for user: {self.user.username} (ID: {self.user.id})")
            self.logger.warning(f"No Spotify profile found for user {self.user.id}")
            return None

    def _get_valid_access_token(self):
        """Get a valid access token for the user, refreshing if necessary"""
        print(f"DEBUG: ============ GET VALID ACCESS TOKEN ============")
        print(f"DEBUG: Called for user: {self.user.username} (ID: {self.user.id})")
        
        spotify_profile = self.get_user_spotify_profile()
        if not spotify_profile:
            print(f"DEBUG: ❌ No Spotify profile found for user: {self.user.username}")
            print(f"DEBUG: User needs to connect Spotify first")
            return None
        
        print(f"DEBUG: ✅ Spotify profile exists for user: {self.user.username}")
        print(f"DEBUG: Access token present: {bool(spotify_profile.access_token)}")
        print(f"DEBUG: Refresh token present: {bool(spotify_profile.refresh_token)}")
        print(f"DEBUG: Token expires at: {spotify_profile.token_expires_at}")
        print(f"DEBUG: Current time: {timezone.now()}")
        print(f"DEBUG: Token expired: {spotify_profile.is_token_expired()}")
        
        if not spotify_profile.refresh_token:
            print(f"DEBUG: ❌ No refresh token available for user: {self.user.username}")
            print(f"DEBUG: User needs to reconnect Spotify to get new refresh token")
            return None
        
        # Check if token is expired
        if spotify_profile.is_token_expired():
            print(f"DEBUG: 🔄 Token expired, attempting to refresh for user: {self.user.username}")
            print(f"DEBUG: Using refresh token: {spotify_profile.refresh_token[:10]}...{spotify_profile.refresh_token[-10:]}")
            
            try:
                print(f"DEBUG: Calling SpotifyService.refresh_access_token...")
                token_data = SpotifyService.refresh_access_token(spotify_profile.refresh_token)
                
                print(f"DEBUG: ✅ Token refresh successful, updating profile...")
                print(f"DEBUG: Old access token: {spotify_profile.access_token[:10] if spotify_profile.access_token else 'None'}...")
                print(f"DEBUG: New access token: {token_data['access_token'][:10]}...")
                
                # Update profile with new token data
                spotify_profile.access_token = token_data['access_token']
                spotify_profile.token_expires_at = timezone.now() + timedelta(seconds=token_data['expires_in'])
                spotify_profile.token_type = token_data.get('token_type', 'Bearer')
                spotify_profile.scope = token_data.get('scope', '')
                spotify_profile.save()
                
                print(f"DEBUG: ✅ Profile updated successfully!")
                print(f"DEBUG: New token expires at: {spotify_profile.token_expires_at}")
                print(f"DEBUG: Token type: {spotify_profile.token_type}")
                print(f"DEBUG: Token scope: {spotify_profile.scope}")
                
                return spotify_profile.access_token
                
            except Exception as e:
                print(f"DEBUG: ❌ Failed to refresh token for user {self.user.username}: {str(e)}")
                print(f"DEBUG: Exception type: {type(e).__name__}")
                print(f"DEBUG: Exception details: {str(e)}")
                self.logger.error(f"Failed to refresh token for user {self.user.id}: {str(e)}")
                
                # If refresh fails, the user needs to reconnect
                print(f"DEBUG: Token refresh failed - user needs to reconnect Spotify")
                return None
        else:
            print(f"DEBUG: ✅ Token still valid for user: {self.user.username}")
            print(f"DEBUG: Token expires in: {spotify_profile.token_expires_at - timezone.now()}")
            return spotify_profile.access_token

    def get_recent_tracks_valence(self, limit=20):
        """Get recent tracks and their valence scores"""
        access_token = self._get_valid_access_token()
        if not access_token:
            self.logger.error("SpotifyService.get_recent_tracks_valence: No access token provided.")
            return []
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        try:
            # Get recently played tracks
            recent_url = f"https://api.spotify.com/v1/me/player/recently-played?limit={limit}"
            print(f"DEBUG: Making Spotify API call to: {recent_url}")
            
            response = requests.get(recent_url, headers=headers)
            print(f"DEBUG: Spotify API response status for {recent_url}: {response.status_code}")
            
            if response.status_code == 403:
                print("Spotify API 403: Development mode restrictions")
                return []
            elif response.status_code == 429:
                print("Spotify API 429: Rate limit exceeded")
                return []
            elif response.status_code != 200:
                print(f"DEBUG: Spotify API error response: {response.text}")
                raise Exception(f"Failed to get recent tracks: {response.text}")
            
            tracks_data = response.json()
            track_ids = [item['track']['id'] for item in tracks_data['items'] if item['track']['id']]
            
            if not track_ids:
                return []
            
            # Limit to 5 tracks to reduce API calls
            track_ids = track_ids[:5]
            print(f"DEBUG: Processing {len(track_ids)} track IDs for valence")
            
            # For now, return empty list since we're using text-based mood analysis
            print("DEBUG: Audio features disabled - using text-based mood analysis")
            return []
            
        except requests.exceptions.RequestException as e:
            print(f"Spotify API request error: {e}")
            return []
        except Exception as e:
            print(f"Error getting Spotify valence: {e}")
            return []
    
    def get_current_track(self):
        """Get currently playing track"""
        access_token = self._get_valid_access_token()
        if not access_token:
            self.logger.error("SpotifyService.get_current_track: No access token provided.")
            return None
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        try:
            current_url = "https://api.spotify.com/v1/me/player/currently-playing"
            print(f"DEBUG: Making Spotify API call to: {current_url}")
            
            response = requests.get(current_url, headers=headers)
            print(f"DEBUG: Spotify API response status for {current_url}: {response.status_code}")
            
            if response.status_code == 204:
                print("DEBUG: No track currently playing")
                return None  # No track currently playing
            elif response.status_code == 403:
                print("Spotify API 403: Development mode restrictions")
                return None
            elif response.status_code == 429:
                print("Spotify API 429: Rate limit exceeded")
                return None
            elif response.status_code != 200:
                print(f"DEBUG: Spotify API error response: {response.text}")
                print(f"Failed to get current track: {response.text}")
                return None
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Spotify API request error: {e}")
            return None
        except Exception as e:
            print(f"Error getting current track: {e}")
            return None

    def get_and_process_valence(self, limit=5):
        """Get and process valence scores for the user"""
        print(f"DEBUG: In get_and_process_valence for user: {self.user.username}")
        
        valence_scores = self.get_recent_tracks_valence(limit)
        print(f"DEBUG: Got {len(valence_scores)} valence scores for user: {self.user.username}")
        
        if valence_scores:
            avg_valence = sum(valence_scores) / len(valence_scores)
            print(f"DEBUG: Average valence for user {self.user.username}: {avg_valence}")
            return avg_valence
        else:
            print(f"DEBUG: No valence scores for user {self.user.username}")
            return None

class FirestoreService:
    """Service to handle Firestore operations"""
    
    def __init__(self):
        try:
            # Check if Firebase settings are available
            if not hasattr(settings, 'FIREBASE_PROJECT_ID') or not settings.FIREBASE_PROJECT_ID:
                print("Firebase settings not configured, FirestoreService will be disabled")
                self.enabled = False
                return
            
            if not firebase_admin._apps:
                # Initialize Firebase Admin SDK
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "client_id": settings.FIREBASE_CLIENT_ID,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                })
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            self.enabled = True
            
        except Exception as e:
            print(f"Failed to initialize FirestoreService: {e}")
            self.enabled = False

    def write_plant_data(self, user_id, plant_data):
        """Write plant data to Firestore"""
        if not self.enabled:
            print("FirestoreService is disabled, skipping write operation")
            return
            
        try:
            app_id = settings.FIREBASE_APP_ID
            doc_ref = self.db.collection('artifacts').document(app_id).collection('public').document('data').collection('plants').document(user_id)
            doc_ref.set(plant_data)
            print(f"Plant data written to Firestore for user {user_id}")
        except Exception as e:
            print(f"Error writing to Firestore: {e}")

    def get_plant_data(self, user_id):
        """Get plant data from Firestore"""
        if not self.enabled:
            print("FirestoreService is disabled, returning None")
            return None
            
        try:
            app_id = settings.FIREBASE_APP_ID
            doc_ref = self.db.collection('artifacts').document(app_id).collection('public').document('data').collection('plants').document(user_id)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Error reading from Firestore: {e}")
            return None

    def list_all_public_plants(self):
        """List all public plants from Firestore"""
        if not self.enabled:
            print("FirestoreService is disabled, returning empty list")
            return []
            
        try:
            app_id = settings.FIREBASE_APP_ID
            plants_collection = self.db.collection('artifacts').document(app_id).collection('public').document('data').collection('plants')
            docs = plants_collection.stream()
            return [doc.to_dict() for doc in docs if doc.exists]
        except Exception as e:
            print(f"Error listing public plants from Firestore: {e}")
            return []
