import requests
import base64
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import json
import urllib.parse

class SpotifyService:
    """Service class for Spotify API interactions"""
    
    @staticmethod
    def get_auth_url():
        """Generate Spotify authorization URL"""
        try:
            # Define the scopes we need
            scopes = [
                'user-read-private',
                'user-read-email',
                'user-read-recently-played',
                'user-read-currently-playing',
                'user-read-playback-state'
            ]
            
            # Use frontend URL for redirect URI since frontend handles the callback
            redirect_uri = getattr(settings, 'FRONTEND_URL', 'https://plantpal-three.vercel.app') + '/music'
            
            # Build the authorization URL
            params = {
                'client_id': settings.SPOTIPY_CLIENT_ID,
                'response_type': 'code',
                'redirect_uri': redirect_uri,
                'scope': ' '.join(scopes),
                'show_dialog': 'true'  # Force user to authorize each time
            }
            
            auth_url = f"https://accounts.spotify.com/authorize?{urllib.parse.urlencode(params)}"
            return auth_url
            
        except Exception as e:
            raise Exception(f"Failed to generate auth URL: {str(e)}")
    
    @staticmethod
    def exchange_code_for_tokens(code, redirect_uri=None):
        """Exchange authorization code for access and refresh tokens"""
        try:
            # Encode client credentials
            client_credentials = f"{settings.SPOTIPY_CLIENT_ID}:{settings.SPOTIPY_CLIENT_SECRET}"
            encoded_credentials = base64.b64encode(client_credentials.encode()).decode()
            
            # Use frontend URL for redirect URI if none provided
            if not redirect_uri:
                redirect_uri = getattr(settings, 'FRONTEND_URL', 'https://plantpal-three.vercel.app') + '/music'
            
            # Prepare token exchange request
            token_url = "https://accounts.spotify.com/api/token"
            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri
            }
            
            response = requests.post(token_url, headers=headers, data=data)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to exchange code for tokens: {str(e)}")
    
    @staticmethod
    def refresh_access_token(refresh_token):
        """Refresh an expired access token"""
        try:
            # Encode client credentials
            client_credentials = f"{settings.SPOTIPY_CLIENT_ID}:{settings.SPOTIPY_CLIENT_SECRET}"
            encoded_credentials = base64.b64encode(client_credentials.encode()).decode()
            
            # Prepare token refresh request
            token_url = "https://accounts.spotify.com/api/token"
            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            }
            
            response = requests.post(token_url, headers=headers, data=data)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to refresh access token: {str(e)}")
    
    @staticmethod
    def get_recent_tracks_valence(access_token, limit=20):
        """Get valence scores from recent tracks"""
        try:
            # Get recently played tracks
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get recently played tracks
            recent_url = f"https://api.spotify.com/v1/me/player/recently-played?limit={limit}"
            recent_response = requests.get(recent_url, headers=headers)
            recent_response.raise_for_status()
            recent_data = recent_response.json()
            
            if not recent_data.get('items'):
                return []
            
            # Extract track IDs
            track_ids = [item['track']['id'] for item in recent_data['items'] if item['track']['id']]
            
            if not track_ids:
                return []
            
            # Get audio features for tracks
            # features_url = f"https://api.spotify.com/v1/audio-features?ids={','.join(track_ids)}"
            # features_response = requests.get(features_url, headers=headers)
            # features_response.raise_for_status()
            # features_data = features_response.json()
            # 
            # # Extract valence scores
            # valence_scores = []
            # for feature in features_data.get('audio_features', []):
            #     if feature and feature.get('valence') is not None:
            #         valence_scores.append(feature['valence'])
            
            # For now, return empty list since we're using text-based mood analysis
            return []
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get recent tracks valence: {str(e)}")
    
    @staticmethod
    def get_user_profile(access_token):
        """Get user's Spotify profile"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            profile_url = "https://api.spotify.com/v1/me"
            response = requests.get(profile_url, headers=headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get user profile: {str(e)}")

class PlantGrowthService:
    """Service class for plant growth calculations"""
    
    @staticmethod
    def process_spotify_mood(plant, valence_scores):
        """Process Spotify mood data and update plant"""
        if not valence_scores:
            return
        
        # Calculate average valence
        average_valence = sum(valence_scores) / len(valence_scores)
        
        # Update plant's Spotify mood score
        plant.spotify_mood_score = average_valence
        
        # Update combined mood score
        plant.update_mood_influence()
        
        # Save the plant
        plant.save() 