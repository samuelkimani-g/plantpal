from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    SpotifyProfile, MusicMoodProfile, ListeningSession, Track, 
    UserTrackHistory, MoodJournalSuggestion, PlaylistRecommendation
)

@admin.register(SpotifyProfile)
class SpotifyProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'spotify_user_id', 'product', 'country', 'is_token_expired', 'created_at']
    list_filter = ['product', 'country', 'auto_mood_analysis', 'include_in_plant_growth', 'created_at']
    search_fields = ['user__username', 'display_name', 'spotify_user_id', 'email']
    readonly_fields = ['spotify_user_id', 'token_expires_at', 'scope', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'display_name', 'email', 'spotify_user_id')
        }),
        ('Profile Details', {
            'fields': ('profile_image_url', 'country', 'product')
        }),
        ('Authentication', {
            'fields': ('token_expires_at', 'scope'),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('auto_mood_analysis', 'include_in_plant_growth')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def is_token_expired(self, obj):
        expired = obj.is_token_expired()
        if expired:
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_token_expired.short_description = 'Token Status'


@admin.register(MusicMoodProfile)
class MusicMoodProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'current_mood_label', 'current_mood_score', 'mood_growth_multiplier', 'last_mood_update']
    list_filter = ['current_mood_label', 'mood_affects_plant_growth', 'last_mood_update']
    search_fields = ['user__username']
    readonly_fields = ['last_mood_update', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Current Mood', {
            'fields': ('current_mood_score', 'current_mood_label', 'last_mood_update')
        }),
        ('Analysis Weights', {
            'fields': ('valence_weight', 'energy_weight', 'danceability_weight', 'tempo_weight'),
            'classes': ('collapse',)
        }),
        ('Listening Patterns', {
            'fields': ('average_listening_hours_per_day', 'preferred_genres', 'top_artists'),
            'classes': ('collapse',)
        }),
        ('Plant Integration', {
            'fields': ('mood_affects_plant_growth', 'mood_growth_multiplier')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ['name', 'artists_display', 'album_name', 'mood_label', 'valence', 'energy', 'audio_features_fetched']
    list_filter = ['mood_label', 'audio_features_fetched', 'genres', 'last_analyzed']
    search_fields = ['name', 'artists', 'album_name', 'spotify_id']
    readonly_fields = ['spotify_id', 'uri', 'computed_mood_score', 'last_analyzed', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('spotify_id', 'uri', 'name', 'artists', 'album_name')
        }),
        ('Media', {
            'fields': ('album_image_url', 'preview_url', 'duration_ms', 'popularity')
        }),
        ('Audio Features', {
            'fields': ('valence', 'energy', 'danceability', 'tempo', 'loudness', 
                      'speechiness', 'acousticness', 'instrumentalness', 'liveness'),
            'classes': ('collapse',)
        }),
        ('Mood Analysis', {
            'fields': ('computed_mood_score', 'mood_label', 'audio_features_fetched', 'last_analyzed')
        }),
        ('Metadata', {
            'fields': ('genres', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def artists_display(self, obj):
        if obj.artists:
            return ', '.join(obj.artists[:3]) + ('...' if len(obj.artists) > 3 else '')
        return 'Unknown Artist'
    artists_display.short_description = 'Artists'


@admin.register(ListeningSession)
class ListeningSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'session_start', 'mood_label', 'total_tracks', 'total_minutes', 'is_active']
    list_filter = ['mood_label', 'is_active', 'session_start', 'device_type', 'listening_context']
    search_fields = ['user__username']
    readonly_fields = ['computed_mood_score', 'created_at', 'updated_at']
    date_hierarchy = 'session_start'
    
    fieldsets = (
        ('Session Info', {
            'fields': ('user', 'session_start', 'session_end', 'total_minutes', 'is_active')
        }),
        ('Mood Analysis', {
            'fields': ('average_valence', 'average_energy', 'average_danceability', 
                      'average_tempo', 'computed_mood_score', 'mood_label')
        }),
        ('Statistics', {
            'fields': ('total_tracks', 'unique_artists', 'unique_albums')
        }),
        ('Context', {
            'fields': ('listening_context', 'device_type'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UserTrackHistory)
class UserTrackHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'track_name', 'played_at', 'was_skipped', 'play_duration_display']
    list_filter = ['was_skipped', 'played_at', 'context_type', 'device_type', 'shuffle_state']
    search_fields = ['user__username', 'track__name', 'track__artists']
    readonly_fields = ['created_at']
    date_hierarchy = 'played_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'track', 'session', 'played_at')
        }),
        ('Play Details', {
            'fields': ('progress_ms', 'was_skipped', 'play_duration_ms')
        }),
        ('Context', {
            'fields': ('context_type', 'context_uri', 'device_type', 
                      'shuffle_state', 'repeat_state'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    def track_name(self, obj):
        return f"{obj.track.name} by {', '.join(obj.track.artists[:2])}"
    track_name.short_description = 'Track'
    
    def play_duration_display(self, obj):
        seconds = obj.play_duration_ms / 1000
        minutes = int(seconds / 60)
        seconds = int(seconds % 60)
        return f"{minutes}:{seconds:02d}"
    play_duration_display.short_description = 'Duration'


@admin.register(MoodJournalSuggestion)
class MoodJournalSuggestionAdmin(admin.ModelAdmin):
    list_display = ['user', 'mood_detected', 'suggestion_type', 'was_used', 'was_helpful', 'created_at']
    list_filter = ['mood_detected', 'suggestion_type', 'was_used', 'was_helpful', 'created_at']
    search_fields = ['user__username', 'suggestion_text', 'mood_detected']
    readonly_fields = ['created_at', 'used_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'track', 'session')
        }),
        ('Suggestion', {
            'fields': ('mood_detected', 'suggestion_text', 'suggestion_type')
        }),
        ('User Interaction', {
            'fields': ('was_used', 'was_helpful', 'user_feedback', 'used_at')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(PlaylistRecommendation)
class PlaylistRecommendationAdmin(admin.ModelAdmin):
    list_display = ['user', 'playlist_name', 'target_mood', 'current_mood', 'was_viewed', 'user_rating', 'created_at']
    list_filter = ['target_mood', 'current_mood', 'was_viewed', 'was_played', 'user_rating', 'created_at']
    search_fields = ['user__username', 'playlist_name', 'playlist_description']
    readonly_fields = ['created_at', 'viewed_at', 'played_at']
    filter_horizontal = ['recommended_tracks']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'playlist_name', 'playlist_description')
        }),
        ('Mood Context', {
            'fields': ('target_mood', 'current_mood', 'recommendation_reason')
        }),
        ('Spotify Integration', {
            'fields': ('spotify_playlist_id', 'spotify_playlist_url'),
            'classes': ('collapse',)
        }),
        ('Tracks', {
            'fields': ('recommended_tracks',)
        }),
        ('User Interaction', {
            'fields': ('was_viewed', 'was_played', 'user_rating', 'viewed_at', 'played_at')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


# Custom admin site configuration
admin.site.site_header = "PlantPal Music Admin"
admin.site.site_title = "Music Admin"
admin.site.index_title = "Music & Mood Management"
