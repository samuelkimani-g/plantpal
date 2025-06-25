from rest_framework import serializers
from .models import (
    SpotifyProfile, MusicMoodProfile, ListeningSession, Track, 
    UserTrackHistory, MoodJournalSuggestion, PlaylistRecommendation
)

class SpotifyProfileSerializer(serializers.ModelSerializer):
    """Serializer for Spotify profile data"""
    is_token_expired = serializers.ReadOnlyField()
    is_token_expiring_soon = serializers.ReadOnlyField()
    
    class Meta:
        model = SpotifyProfile
        fields = [
            'id', 'spotify_user_id', 'display_name', 'email', 
            'profile_image_url', 'country', 'product', 
            'auto_mood_analysis', 'include_in_plant_growth',
            'is_token_expired', 'is_token_expiring_soon',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MusicMoodProfileSerializer(serializers.ModelSerializer):
    """Serializer for music mood profile"""
    
    class Meta:
        model = MusicMoodProfile
        fields = [
            'id', 'valence_weight', 'energy_weight', 'danceability_weight', 
            'tempo_weight', 'current_mood_score', 'current_mood_label',
            'last_mood_update', 'average_listening_hours_per_day',
            'preferred_genres', 'top_artists', 'mood_affects_plant_growth',
            'mood_growth_multiplier', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_mood_update', 'created_at', 'updated_at']


class TrackSerializer(serializers.ModelSerializer):
    """Serializer for track information"""
    
    class Meta:
        model = Track
        fields = [
            'id', 'spotify_id', 'uri', 'name', 'artists', 'album_name',
            'album_image_url', 'duration_ms', 'popularity', 'preview_url',
            'valence', 'energy', 'danceability', 'tempo', 'loudness',
            'speechiness', 'acousticness', 'instrumentalness', 'liveness',
            'computed_mood_score', 'mood_label', 'genres', 
            'audio_features_fetched', 'last_analyzed', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserTrackHistorySerializer(serializers.ModelSerializer):
    """Serializer for user track listening history"""
    track = TrackSerializer(read_only=True)
    
    class Meta:
        model = UserTrackHistory
        fields = [
            'id', 'track', 'played_at', 'progress_ms', 'was_skipped',
            'play_duration_ms', 'context_type', 'context_uri', 
            'device_type', 'shuffle_state', 'repeat_state', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ListeningSessionSerializer(serializers.ModelSerializer):
    """Serializer for listening sessions"""
    track_plays = UserTrackHistorySerializer(many=True, read_only=True)
    session_duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = ListeningSession
        fields = [
            'id', 'session_start', 'session_end', 'total_minutes', 'is_active',
            'average_valence', 'average_energy', 'average_danceability',
            'average_tempo', 'computed_mood_score', 'mood_label',
            'total_tracks', 'unique_artists', 'unique_albums',
            'listening_context', 'device_type', 'session_duration_minutes',
            'track_plays', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_session_duration_minutes(self, obj):
        """Calculate session duration in minutes"""
        if obj.session_end and obj.session_start:
            return int((obj.session_end - obj.session_start).total_seconds() / 60)
        return obj.total_minutes


class MoodJournalSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for mood-based journal suggestions"""
    track = TrackSerializer(read_only=True)
    
    class Meta:
        model = MoodJournalSuggestion
        fields = [
            'id', 'track', 'mood_detected', 'suggestion_text', 
            'suggestion_type', 'was_used', 'was_helpful', 
            'user_feedback', 'created_at', 'used_at'
        ]
        read_only_fields = ['id', 'created_at']


class PlaylistRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for playlist recommendations"""
    recommended_tracks = TrackSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlaylistRecommendation
        fields = [
            'id', 'target_mood', 'current_mood', 'recommendation_reason',
            'playlist_name', 'playlist_description', 'spotify_playlist_id',
            'spotify_playlist_url', 'recommended_tracks', 'was_viewed',
            'was_played', 'user_rating', 'created_at', 'viewed_at', 'played_at'
        ]
        read_only_fields = ['id', 'created_at']


# API Response Serializers
class SpotifyConnectionStatusSerializer(serializers.Serializer):
    """Serializer for Spotify connection status"""
    is_connected = serializers.BooleanField()
    profile = SpotifyProfileSerializer(required=False, allow_null=True)
    mood_profile = MusicMoodProfileSerializer(required=False, allow_null=True)


class TopTracksResponseSerializer(serializers.Serializer):
    """Serializer for top tracks API response"""
    tracks = TrackSerializer(many=True)
    time_range = serializers.CharField()
    total = serializers.IntegerField()
    mood_analysis = serializers.DictField(required=False)


class RecentlyPlayedResponseSerializer(serializers.Serializer):
    """Serializer for recently played tracks response"""
    tracks = UserTrackHistorySerializer(many=True)
    total = serializers.IntegerField()
    mood_analysis = serializers.DictField(required=False)
    sessions = ListeningSessionSerializer(many=True, required=False)


class MoodAnalysisSerializer(serializers.Serializer):
    """Serializer for mood analysis results"""
    overall_mood_score = serializers.FloatField()
    overall_mood_label = serializers.CharField()
    mood_breakdown = serializers.DictField()
    top_moods = serializers.ListField(child=serializers.DictField())
    recommendations = serializers.ListField(child=serializers.DictField(), required=False)


class MoodSummarySerializer(serializers.Serializer):
    """Serializer for mood summary for plant growth"""
    current_mood_score = serializers.FloatField()
    current_mood_label = serializers.CharField()
    mood_trend = serializers.CharField()  # improving, declining, stable
    growth_multiplier = serializers.FloatField()
    last_updated = serializers.DateTimeField()
    confidence_level = serializers.FloatField()  # 0.0-1.0


class CurrentTrackSerializer(serializers.Serializer):
    """Serializer for currently playing track"""
    track = TrackSerializer(required=False, allow_null=True)
    is_playing = serializers.BooleanField()
    progress_ms = serializers.IntegerField(required=False)
    context = serializers.DictField(required=False)
    device = serializers.DictField(required=False)


class AuthUrlSerializer(serializers.Serializer):
    """Serializer for Spotify auth URL response"""
    auth_url = serializers.URLField()
    state = serializers.CharField(required=False)


class TokenExchangeSerializer(serializers.Serializer):
    """Serializer for token exchange request"""
    code = serializers.CharField()
    state = serializers.CharField(required=False)


class DisconnectResponseSerializer(serializers.Serializer):
    """Serializer for disconnect response"""
    success = serializers.BooleanField()
    message = serializers.CharField()


# Settings/Preferences Serializers
class MoodAnalysisSettingsSerializer(serializers.ModelSerializer):
    """Serializer for mood analysis settings"""
    
    class Meta:
        model = MusicMoodProfile
        fields = [
            'valence_weight', 'energy_weight', 'danceability_weight', 
            'tempo_weight', 'auto_mood_analysis', 'mood_affects_plant_growth',
            'mood_growth_multiplier'
        ]


class SpotifyPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for Spotify preferences"""
    
    class Meta:
        model = SpotifyProfile
        fields = ['auto_mood_analysis', 'include_in_plant_growth']


# Analytics Serializers
class ListeningStatsSerializer(serializers.Serializer):
    """Serializer for listening statistics"""
    total_tracks_played = serializers.IntegerField()
    total_listening_time_minutes = serializers.IntegerField()
    average_session_length_minutes = serializers.FloatField()
    most_played_artist = serializers.CharField()
    most_played_track = serializers.CharField()
    mood_distribution = serializers.DictField()
    listening_patterns = serializers.DictField()


class MoodHistorySerializer(serializers.Serializer):
    """Serializer for mood history over time"""
    date = serializers.DateField()
    mood_score = serializers.FloatField()
    mood_label = serializers.CharField()
    listening_duration = serializers.IntegerField()
    top_track = serializers.CharField(required=False)


class WeeklyMoodReportSerializer(serializers.Serializer):
    """Serializer for weekly mood report"""
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    average_mood_score = serializers.FloatField()
    dominant_mood = serializers.CharField()
    mood_trend = serializers.CharField()
    total_listening_time = serializers.IntegerField()
    top_tracks = TrackSerializer(many=True)
    mood_by_day = MoodHistorySerializer(many=True)
    journal_suggestions = MoodJournalSuggestionSerializer(many=True, required=False)