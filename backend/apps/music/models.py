from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import json

User = get_user_model()

class SpotifyProfile(models.Model):
    """Store Spotify authentication tokens and user profile info"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='spotify_profile')
    
    # Authentication tokens
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField()
    token_type = models.CharField(max_length=50, default='Bearer')
    scope = models.TextField(blank=True)
    
    # Spotify user info
    spotify_user_id = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    profile_image_url = models.URLField(blank=True)
    country = models.CharField(max_length=5, blank=True)
    
    # Subscription info
    product = models.CharField(max_length=50, blank=True)  # free, premium, etc.
    
    # Preferences
    auto_mood_analysis = models.BooleanField(default=True)
    include_in_plant_growth = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'music_spotify_profile'
    
    def __str__(self):
        return f"{self.user.username}'s Spotify Profile"
    
    def is_token_expired(self):
        """Check if the access token is expired"""
        if not self.token_expires_at:
            return True
        return timezone.now() >= self.token_expires_at
    
    def is_token_expiring_soon(self):
        """Check if token expires within 5 minutes"""
        if not self.token_expires_at:
            return True
        return timezone.now() >= (self.token_expires_at - timedelta(minutes=5))


class MusicMoodProfile(models.Model):
    """Store user's music mood preferences and analysis settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='music_mood_profile')
    
    # Mood analysis weights (how much each attribute affects mood)
    valence_weight = models.FloatField(default=0.4)  # happiness/sadness
    energy_weight = models.FloatField(default=0.3)   # high/low energy
    danceability_weight = models.FloatField(default=0.2)  # groove
    tempo_weight = models.FloatField(default=0.1)    # fast/slow
    
    # Current mood state
    current_mood_score = models.FloatField(default=0.5)  # 0.0-1.0 scale
    current_mood_label = models.CharField(max_length=50, default='neutral')
    last_mood_update = models.DateTimeField(auto_now=True)
    last_updated = models.DateTimeField(auto_now=True)  # Alias for compatibility
    
    # Mood breakdown and statistics
    mood_breakdown = models.JSONField(default=dict, blank=True)  # Detailed mood analysis
    total_music_minutes = models.FloatField(default=0.0)  # Total listening time in minutes
    
    # Listening patterns
    average_listening_hours_per_day = models.FloatField(default=0.0)
    preferred_genres = models.JSONField(default=list, blank=True)
    top_artists = models.JSONField(default=list, blank=True)
    
    # Plant integration
    mood_affects_plant_growth = models.BooleanField(default=True)
    mood_growth_multiplier = models.FloatField(default=1.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'music_mood_profile'
    
    def __str__(self):
        return f"{self.user.username}'s Music Mood Profile"


class ListeningSession(models.Model):
    """Track listening sessions for mood analysis"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listening_sessions')
    
    # Session info
    session_start = models.DateTimeField()
    session_end = models.DateTimeField(null=True, blank=True)
    total_minutes = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Mood analysis
    average_valence = models.FloatField(default=0.5)
    average_energy = models.FloatField(default=0.5)
    average_danceability = models.FloatField(default=0.5)
    average_tempo = models.FloatField(default=120.0)
    computed_mood_score = models.FloatField(default=0.5)
    mood_label = models.CharField(max_length=50, default='neutral')
    
    # Tracks info
    total_tracks = models.IntegerField(default=0)
    unique_artists = models.IntegerField(default=0)
    unique_albums = models.IntegerField(default=0)
    
    # Context
    listening_context = models.CharField(max_length=100, blank=True)  # workout, study, etc.
    device_type = models.CharField(max_length=50, blank=True)  # computer, phone, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'music_listening_session'
        ordering = ['-session_start']
    
    def __str__(self):
        return f"{self.user.username} - {self.session_start.strftime('%Y-%m-%d %H:%M')}"


class Track(models.Model):
    """Store track information and audio features"""
    # Spotify identifiers
    spotify_id = models.CharField(max_length=255, unique=True)
    uri = models.CharField(max_length=255, unique=True)
    
    # Basic track info
    name = models.CharField(max_length=500)
    artists = models.JSONField(default=list)  # List of artist names
    artist = models.CharField(max_length=500, blank=True)  # Single artist string for compatibility
    album_name = models.CharField(max_length=500, blank=True)
    album = models.CharField(max_length=500, blank=True)  # Single album string for compatibility
    album_image_url = models.URLField(blank=True)
    duration_ms = models.IntegerField()
    popularity = models.IntegerField(default=0)
    preview_url = models.URLField(blank=True, null=True)
    external_url = models.URLField(blank=True)  # Spotify external URL
    
    # Audio features (from Spotify Audio Features API)
    valence = models.FloatField(null=True, blank=True)  # 0.0-1.0 (sad to happy)
    energy = models.FloatField(null=True, blank=True)   # 0.0-1.0 (calm to energetic)
    danceability = models.FloatField(null=True, blank=True)  # 0.0-1.0
    tempo = models.FloatField(null=True, blank=True)    # BPM
    loudness = models.FloatField(null=True, blank=True) # dB
    speechiness = models.FloatField(null=True, blank=True)  # 0.0-1.0
    acousticness = models.FloatField(null=True, blank=True) # 0.0-1.0
    instrumentalness = models.FloatField(null=True, blank=True) # 0.0-1.0
    liveness = models.FloatField(null=True, blank=True) # 0.0-1.0
    
    # Computed mood
    computed_mood_score = models.FloatField(null=True, blank=True)
    mood_label = models.CharField(max_length=50, blank=True)
    
    # Genres
    genres = models.JSONField(default=list, blank=True)
    
    # Metadata
    audio_features_fetched = models.BooleanField(default=False)
    last_analyzed = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'music_track'
    
    def __str__(self):
        artists_str = ', '.join(self.artists) if self.artists else 'Unknown Artist'
        return f"{self.name} by {artists_str}"
    
    def compute_mood_score(self, weights=None):
        """Compute mood score based on audio features"""
        if not all([self.valence is not None, self.energy is not None, 
                   self.danceability is not None, self.tempo is not None]):
            return None
        
        if weights is None:
            weights = {
                'valence': 0.4,
                'energy': 0.3,
                'danceability': 0.2,
                'tempo': 0.1
            }
        
        # Normalize tempo (assume 60-200 BPM range)
        normalized_tempo = max(0, min(1, (self.tempo - 60) / 140)) if self.tempo else 0.5
        
        mood_score = (
            self.valence * weights['valence'] +
            self.energy * weights['energy'] +
            self.danceability * weights['danceability'] +
            normalized_tempo * weights['tempo']
        )
        
        return max(0, min(1, mood_score))
    
    def get_mood_label(self):
        """Get mood label based on audio features"""
        if not self.valence or not self.energy:
            return 'unknown'
        
        if self.valence > 0.7 and self.energy > 0.6:
            return 'euphoric'
        elif self.valence > 0.6 and self.energy > 0.5:
            return 'happy'
        elif self.valence > 0.4 and self.energy > 0.5:
            return 'energetic'
        elif self.valence < 0.3 and self.energy < 0.4:
            return 'sad'
        elif self.valence < 0.4 and self.energy > 0.6:
            return 'angry'
        elif self.energy < 0.3:
            return 'calm'
        else:
            return 'neutral'


class UserTrackHistory(models.Model):
    """Track when users listen to specific tracks"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='track_history')
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name='user_history')
    session = models.ForeignKey(ListeningSession, on_delete=models.CASCADE, related_name='track_plays', null=True, blank=True)
    
    # Play info
    played_at = models.DateTimeField()
    progress_ms = models.IntegerField(default=0)  # How far into the track
    was_skipped = models.BooleanField(default=False)
    play_duration_ms = models.IntegerField(default=0)  # How long they actually listened
    
    # Context
    context_type = models.CharField(max_length=50, blank=True)  # playlist, album, artist, etc.
    context_uri = models.CharField(max_length=255, blank=True)  # Spotify URI of context
    device_type = models.CharField(max_length=50, blank=True)
    shuffle_state = models.BooleanField(default=False)
    repeat_state = models.CharField(max_length=20, default='off')  # off, track, context
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'music_user_track_history'
        ordering = ['-played_at']
        indexes = [
            models.Index(fields=['user', '-played_at']),
            models.Index(fields=['user', 'track']),
        ]
    
    def __str__(self):
        return f"{self.user.username} played {self.track.name}"


class MoodJournalSuggestion(models.Model):
    """Suggestions for journal prompts based on music mood"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mood_journal_suggestions')
    
    # Related objects
    track = models.ForeignKey(Track, on_delete=models.CASCADE, null=True, blank=True)
    session = models.ForeignKey(ListeningSession, on_delete=models.CASCADE, null=True, blank=True)
    
    # Suggestion content
    mood_detected = models.CharField(max_length=50)
    suggestion_text = models.TextField()
    suggestion_type = models.CharField(max_length=50)  # prompt, activity, reflection
    
    # User interaction
    was_used = models.BooleanField(default=False)
    was_helpful = models.BooleanField(null=True, blank=True)
    user_feedback = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'music_mood_journal_suggestion'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Suggestion for {self.user.username} - {self.mood_detected}"


class PlaylistRecommendation(models.Model):
    """Store playlist recommendations based on mood/plant needs"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='playlist_recommendations')
    
    # Recommendation context
    target_mood = models.CharField(max_length=50)
    current_mood = models.CharField(max_length=50)
    recommendation_reason = models.TextField()
    
    # Playlist info
    playlist_name = models.CharField(max_length=255)
    playlist_description = models.TextField(blank=True)
    spotify_playlist_id = models.CharField(max_length=255, blank=True)
    spotify_playlist_url = models.URLField(blank=True)
    
    # Tracks in recommendation
    recommended_tracks = models.ManyToManyField(Track, related_name='playlist_recommendations')
    
    # User interaction
    was_viewed = models.BooleanField(default=False)
    was_played = models.BooleanField(default=False)
    user_rating = models.IntegerField(null=True, blank=True)  # 1-5 stars
    
    created_at = models.DateTimeField(auto_now_add=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    played_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'music_playlist_recommendation'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Playlist for {self.user.username}: {self.playlist_name}"
