from django.shortcuts import render
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import logging
import uuid

from .models import (
    SpotifyProfile, MusicMoodProfile, ListeningSession, Track, 
    UserTrackHistory, MoodJournalSuggestion, PlaylistRecommendation
)
from .serializers import (
    SpotifyConnectionStatusSerializer, TopTracksResponseSerializer,
    RecentlyPlayedResponseSerializer, MoodAnalysisSerializer,
    MoodSummarySerializer, CurrentTrackSerializer, AuthUrlSerializer,
    TokenExchangeSerializer, DisconnectResponseSerializer,
    MoodAnalysisSettingsSerializer, ListeningStatsSerializer,
    WeeklyMoodReportSerializer, MoodHistorySerializer
)
from .spotify_api import SpotifyAPIService

logger = logging.getLogger(__name__)
User = get_user_model()


class SpotifyAuthView(APIView):
    """Handle Spotify OAuth authentication"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get Spotify authorization URL"""
        try:
            spotify_service = SpotifyAPIService(user=request.user)
            
            # Generate state for security
            state = str(uuid.uuid4())
            request.session['spotify_state'] = state
            
            auth_url = spotify_service.get_authorization_url(state=state)
            
            serializer = AuthUrlSerializer({'auth_url': auth_url, 'state': state})
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating Spotify auth URL: {str(e)}")
            return Response(
                {'error': 'Failed to generate authorization URL'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SpotifyCallbackView(APIView):
    """Handle Spotify OAuth callback"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Exchange authorization code for access token"""
        try:
            serializer = TokenExchangeSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            code = serializer.validated_data['code']
            state = serializer.validated_data.get('state')
            
            # Verify state for security
            session_state = request.session.get('spotify_state')
            if state and session_state and state != session_state:
                return Response(
                    {'error': 'Invalid state parameter'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            spotify_service = SpotifyAPIService(user=request.user)
            
            # Exchange code for tokens
            token_data = spotify_service.exchange_code_for_token(code)
            if not token_data:
                return Response(
                    {'error': 'Failed to exchange code for token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save profile data
            profile = spotify_service.save_or_update_spotify_profile(token_data)
            if not profile:
                return Response(
                    {'error': 'Failed to save Spotify profile'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Start initial data analysis
            try:
                spotify_service.analyze_and_save_listening_data()
                logger.info(f"Initial listening data analysis completed for user: {request.user.username}")
            except Exception as e:
                logger.warning(f"Failed initial data analysis: {str(e)}")
            
            # Return connection status
            connection_serializer = SpotifyConnectionStatusSerializer({
                'is_connected': True,
                'profile': profile,
                'mood_profile': getattr(request.user, 'music_mood_profile', None)
            })
            
            return Response(connection_serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in Spotify callback: {str(e)}")
            return Response(
                {'error': 'Authentication failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SpotifyDisconnectView(APIView):
    """Disconnect Spotify account"""
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request):
        """Disconnect user's Spotify account"""
        try:
            spotify_service = SpotifyAPIService(user=request.user)
            success = spotify_service.disconnect_spotify()
            
            if success:
                serializer = DisconnectResponseSerializer({
                    'success': True,
                    'message': 'Spotify account disconnected successfully'
                })
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Failed to disconnect Spotify'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Error disconnecting Spotify: {str(e)}")
            return Response(
                {'error': 'Failed to disconnect'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SpotifyConnectionStatusView(APIView):
    """Check Spotify connection status"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current Spotify connection status"""
        try:
            # Check if user has Spotify profile
            try:
                profile = SpotifyProfile.objects.get(user=request.user)
                is_connected = not profile.is_token_expired()
            except SpotifyProfile.DoesNotExist:
                profile = None
                is_connected = False
            
            # Get mood profile
            try:
                mood_profile = MusicMoodProfile.objects.get(user=request.user)
            except MusicMoodProfile.DoesNotExist:
                mood_profile = None
            
            serializer = SpotifyConnectionStatusSerializer({
                'is_connected': is_connected,
                'profile': profile,
                'mood_profile': mood_profile
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking Spotify status: {str(e)}")
            return Response(
                {'error': 'Failed to check connection status'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TopTracksView(APIView):
    """Get user's top tracks from Spotify"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Fetch user's top tracks"""
        try:
            time_range = request.query_params.get('time_range', 'medium_term')
            limit = min(int(request.query_params.get('limit', 20)), 50)
            
            spotify_service = SpotifyAPIService(user=request.user)
            
            # Get top tracks from Spotify
            tracks_data = spotify_service.get_top_tracks(time_range=time_range, limit=limit)
            if not tracks_data or 'items' not in tracks_data:
                return Response(
                    {'error': 'Failed to fetch top tracks'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save tracks and get audio features
            saved_tracks = []
            track_ids = []
            
            for track_data in tracks_data['items']:
                track = spotify_service.save_track_with_features(track_data)
                if track:
                    saved_tracks.append(track)
                    track_ids.append(track.spotify_id)
            
            # Get audio features for mood analysis
            if track_ids:
                audio_features = spotify_service.get_audio_features(track_ids)
                if audio_features and 'audio_features' in audio_features:
                    for i, features in enumerate(audio_features['audio_features']):
                        if features and i < len(saved_tracks):
                            track = saved_tracks[i]
                            
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
            
            # Compute mood analysis
            mood_analysis = self._compute_tracks_mood_analysis(saved_tracks)
            
            serializer = TopTracksResponseSerializer({
                'tracks': saved_tracks,
                'time_range': time_range,
                'total': len(saved_tracks),
                'mood_analysis': mood_analysis
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching top tracks: {str(e)}")
            return Response(
                {'error': 'Failed to fetch top tracks'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _compute_tracks_mood_analysis(self, tracks):
        """Compute mood analysis for a list of tracks"""
        if not tracks:
            return {}
        
        # Filter tracks with audio features
        analyzed_tracks = [t for t in tracks if t.audio_features_fetched and t.valence is not None]
        if not analyzed_tracks:
            return {}
        
        # Compute averages
        avg_valence = sum(t.valence for t in analyzed_tracks) / len(analyzed_tracks)
        avg_energy = sum(t.energy for t in analyzed_tracks) / len(analyzed_tracks)
        avg_danceability = sum(t.danceability for t in analyzed_tracks) / len(analyzed_tracks)
        avg_tempo = sum(t.tempo for t in analyzed_tracks) / len(analyzed_tracks)
        
        # Compute overall mood score
        overall_mood = (avg_valence * 0.4 + avg_energy * 0.3 + avg_danceability * 0.2 + 
                       min(1, (avg_tempo - 60) / 140) * 0.1)
        
        # Determine mood label
        if overall_mood > 0.7:
            mood_label = 'euphoric'
        elif overall_mood > 0.6:
            mood_label = 'happy'
        elif overall_mood > 0.5:
            mood_label = 'upbeat'
        elif overall_mood > 0.4:
            mood_label = 'neutral'
        elif overall_mood > 0.3:
            mood_label = 'calm'
        else:
            mood_label = 'sad'
        
        # Count mood distribution
        mood_counts = {}
        for track in analyzed_tracks:
            track_mood = track.mood_label or 'unknown'
            mood_counts[track_mood] = mood_counts.get(track_mood, 0) + 1
        
        return {
            'overall_mood_score': round(overall_mood, 3),
            'overall_mood_label': mood_label,
            'average_valence': round(avg_valence, 3),
            'average_energy': round(avg_energy, 3),
            'average_danceability': round(avg_danceability, 3),
            'average_tempo': round(avg_tempo, 1),
            'mood_distribution': mood_counts,
            'total_analyzed': len(analyzed_tracks)
        }


class RecentlyPlayedView(APIView):
    """Get user's recently played tracks"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Fetch recently played tracks"""
        try:
            limit = min(int(request.query_params.get('limit', 20)), 50)
            
            spotify_service = SpotifyAPIService(user=request.user)
            
            # Analyze and save recent listening data
            tracks_processed = spotify_service.analyze_and_save_listening_data()
            
            # Get user's track history
            recent_history = UserTrackHistory.objects.filter(
                user=request.user
            ).select_related('track', 'session').order_by('-played_at')[:limit]
            
            # Get recent sessions
            recent_sessions = ListeningSession.objects.filter(
                user=request.user,
                session_start__gte=timezone.now() - timedelta(days=7)
            ).order_by('-session_start')[:10]
            
            # Compute mood analysis
            tracks = [history.track for history in recent_history if history.track.audio_features_fetched]
            mood_analysis = self._compute_tracks_mood_analysis(tracks)
            
            serializer = RecentlyPlayedResponseSerializer({
                'tracks': recent_history,
                'total': recent_history.count(),
                'mood_analysis': mood_analysis,
                'sessions': recent_sessions
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching recently played: {str(e)}")
            return Response(
                {'error': 'Failed to fetch recently played tracks'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _compute_tracks_mood_analysis(self, tracks):
        """Reuse mood analysis from TopTracksView"""
        view = TopTracksView()
        return view._compute_tracks_mood_analysis(tracks)


class CurrentTrackView(APIView):
    """Get currently playing track"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get currently playing track from Spotify"""
        try:
            spotify_service = SpotifyAPIService(user=request.user)
            
            current_data = spotify_service.get_current_track()
            
            if not current_data:
                serializer = CurrentTrackSerializer({
                    'track': None,
                    'is_playing': False
                })
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # Save track if present
            track = None
            if current_data.get('item'):
                track = spotify_service.save_track_with_features(current_data['item'])
            
            serializer = CurrentTrackSerializer({
                'track': track,
                'is_playing': current_data.get('is_playing', False),
                'progress_ms': current_data.get('progress_ms'),
                'context': current_data.get('context'),
                'device': current_data.get('device')
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching current track: {str(e)}")
            return Response(
                {'error': 'Failed to fetch current track'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MoodAnalysisView(APIView):
    """Get comprehensive mood analysis"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's music mood analysis"""
        try:
            days = int(request.query_params.get('days', 7))
            
            # Get mood profile
            try:
                mood_profile = MusicMoodProfile.objects.get(user=request.user)
            except MusicMoodProfile.DoesNotExist:
                return Response(
                    {'error': 'No mood profile found. Connect Spotify first.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get recent sessions for analysis
            since_date = timezone.now() - timedelta(days=days)
            recent_sessions = ListeningSession.objects.filter(
                user=request.user,
                session_start__gte=since_date
            ).exclude(computed_mood_score__isnull=True)
            
            if not recent_sessions:
                return Response(
                    {'error': 'Not enough listening data for analysis'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Compute mood breakdown
            mood_counts = {}
            mood_scores = []
            total_listening_time = 0
            
            for session in recent_sessions:
                mood_label = session.mood_label
                mood_counts[mood_label] = mood_counts.get(mood_label, 0) + 1
                mood_scores.append(session.computed_mood_score)
                total_listening_time += session.total_minutes
            
            # Top moods
            top_moods = [
                {'mood': mood, 'count': count, 'percentage': round(count / len(recent_sessions) * 100, 1)}
                for mood, count in sorted(mood_counts.items(), key=lambda x: x[1], reverse=True)
            ]
            
            # Overall analysis
            avg_mood_score = sum(mood_scores) / len(mood_scores)
            
            # Generate recommendations based on mood
            recommendations = self._generate_mood_recommendations(mood_profile, avg_mood_score)
            
            serializer = MoodAnalysisSerializer({
                'overall_mood_score': round(avg_mood_score, 3),
                'overall_mood_label': mood_profile.current_mood_label,
                'mood_breakdown': {
                    'total_sessions': len(recent_sessions),
                    'total_listening_minutes': total_listening_time,
                    'mood_distribution': mood_counts,
                    'analysis_period_days': days
                },
                'top_moods': top_moods,
                'recommendations': recommendations
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in mood analysis: {str(e)}")
            return Response(
                {'error': 'Failed to analyze mood'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_mood_recommendations(self, mood_profile, avg_mood_score):
        """Generate recommendations based on mood analysis"""
        recommendations = []
        
        if avg_mood_score < 0.3:
            recommendations.append({
                'type': 'music',
                'title': 'Uplifting Music',
                'description': 'Try listening to more upbeat, positive music to boost your mood'
            })
            recommendations.append({
                'type': 'journal',
                'title': 'Mood Reflection',
                'description': 'Consider journaling about your feelings to process emotions'
            })
        elif avg_mood_score > 0.7:
            recommendations.append({
                'type': 'plant',
                'title': 'Happy Plant Growth',
                'description': 'Your positive mood is helping your plant grow! Keep it up!'
            })
            recommendations.append({
                'type': 'sharing',
                'title': 'Share Your Vibes',
                'description': 'Your music mood is great - consider sharing your playlist'
            })
        else:
            recommendations.append({
                'type': 'balance',
                'title': 'Mood Balance',
                'description': 'Your mood seems balanced. Try exploring new genres for variety'
            })
        
        return recommendations


class MoodSummaryView(APIView):
    """Get mood summary for plant growth integration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive mood summary for plant growth"""
        try:
            days = min(int(request.query_params.get('days', 7)), 30)
            
            spotify_service = SpotifyAPIService(user=request.user)
            
            # Check connection
            if not spotify_service.is_connected():
                return Response({
                    'is_connected': False,
                    'music_mood_score': 0.5,
                    'message': 'Spotify not connected'
                }, status=status.HTTP_200_OK)
            
            # Get recent listening sessions
            cutoff_date = timezone.now() - timedelta(days=days)
            recent_sessions = ListeningSession.objects.filter(
                user=request.user,
                session_start__gte=cutoff_date
            ).order_by('-session_start')
            
            if not recent_sessions.exists():
                return Response({
                    'is_connected': True,
                    'music_mood_score': 0.5,
                    'days_analyzed': 0,
                    'message': 'No recent listening data'
                }, status=status.HTTP_200_OK)
            
            # Calculate mood metrics
            total_minutes = sum(session.total_minutes for session in recent_sessions)
            avg_mood_score = sum(session.computed_mood_score for session in recent_sessions) / len(recent_sessions)
            
            # Get or create mood profile
            mood_profile, _ = MusicMoodProfile.objects.get_or_create(user=request.user)
            mood_profile.current_mood_score = avg_mood_score
            mood_profile.last_mood_update = timezone.now()
            mood_profile.save()
            
            # **ARCHITECTURE INTEGRATION: Update central mood engine**
            try:
                from utils.mood_logic import MoodEngine
                
                # Update plant with music mood data
                if hasattr(request.user, 'plant'):
                    plant = request.user.plant
                    plant.music_mood_score = avg_mood_score
                    plant.spotify_mood_score = avg_mood_score
                    
                    # Apply mood update through central system
                    mood_data = {'music_mood': avg_mood_score}
                    plant.apply_mood_update(mood_data)
                    
                    # Update accounts profile if exists
                    if hasattr(request.user, 'profile'):
                        request.user.profile.spotify_connected = True
                        request.user.profile.save(update_fields=['spotify_connected'])
                        
            except ImportError:
                logger.warning("MoodEngine not available for music integration")
            except Exception as e:
                logger.error(f"Error updating plant mood from music: {str(e)}")
            
            # Prepare response data
            mood_summary = {
                'is_connected': True,
                'music_mood_score': avg_mood_score,
                'days_analyzed': days,
                'total_listening_minutes': total_minutes,
                'session_count': len(recent_sessions),
                'mood_trend': self._calculate_mood_trend(recent_sessions),
                'top_mood_influences': self._get_top_mood_influences(recent_sessions),
                'plant_integration': {
                    'plant_updated': hasattr(request.user, 'plant'),
                    'mood_contribution': avg_mood_score,
                    'growth_bonus': self._calculate_growth_bonus(avg_mood_score)
                }
            }
            
            serializer = MoodSummarySerializer(mood_summary)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in mood summary: {str(e)}")
            return Response(
                {'error': 'Failed to analyze mood'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_mood_trend(self, sessions):
        """Calculate if mood is trending up, down, or stable"""
        if len(sessions) < 2:
            return 'stable'
        
        # Compare first half with second half
        mid_point = len(sessions) // 2
        recent_avg = sum(s.computed_mood_score for s in sessions[:mid_point]) / mid_point
        older_avg = sum(s.computed_mood_score for s in sessions[mid_point:]) / (len(sessions) - mid_point)
        
        if recent_avg > older_avg + 0.1:
            return 'improving'
        elif recent_avg < older_avg - 0.1:
            return 'declining'
        else:
            return 'stable'
    
    def _get_top_mood_influences(self, sessions):
        """Get the audio features that most influence current mood"""
        if not sessions:
            return []
        
        # Get averages
        avg_valence = sum(s.average_valence for s in sessions) / len(sessions)
        avg_energy = sum(s.average_energy for s in sessions) / len(sessions)
        avg_danceability = sum(s.average_danceability for s in sessions) / len(sessions)
        
        influences = []
        if avg_valence > 0.7:
            influences.append({'factor': 'High Positivity', 'value': avg_valence})
        elif avg_valence < 0.3:
            influences.append({'factor': 'Low Positivity', 'value': avg_valence})
            
        if avg_energy > 0.7:
            influences.append({'factor': 'High Energy', 'value': avg_energy})
        elif avg_energy < 0.3:
            influences.append({'factor': 'Low Energy', 'value': avg_energy})
            
        if avg_danceability > 0.7:
            influences.append({'factor': 'High Danceability', 'value': avg_danceability})
        
        return influences[:3]  # Top 3
    
    def _calculate_growth_bonus(self, mood_score):
        """Calculate plant growth bonus from music mood"""
        try:
            from utils.mood_logic import MoodEngine
            
            # Mock mood data for growth calculation
            mood_data = {
                'mood_score': mood_score,
                'mood_type': 'happy' if mood_score > 0.6 else 'neutral' if mood_score > 0.4 else 'sad'
            }
            
            impact = MoodEngine.calculate_plant_growth_impact(mood_data, 0)
            return impact.get('growth_change', 0)
            
        except ImportError:
            # Fallback calculation
            if mood_score > 0.7:
                return 15  # High mood = good growth
            elif mood_score > 0.5:
                return 10  # Medium mood = medium growth
            elif mood_score > 0.3:
                return 5   # Low mood = small growth
            else:
                return 0   # Very low mood = no growth


class ListeningStatsView(APIView):
    """Get listening statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's listening statistics"""
        try:
            days = int(request.query_params.get('days', 30))
            since_date = timezone.now() - timedelta(days=days)
            
            # Get listening data
            track_history = UserTrackHistory.objects.filter(
                user=request.user,
                played_at__gte=since_date
            ).select_related('track')
            
            if not track_history:
                return Response(
                    {'error': 'No listening data found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Compute statistics
            total_tracks = track_history.count()
            total_time = sum(h.play_duration_ms for h in track_history) / (1000 * 60)  # Convert to minutes
            
            # Most played artist and track
            artist_counts = {}
            track_counts = {}
            
            for history in track_history:
                # Count artists
                for artist in history.track.artists:
                    artist_counts[artist] = artist_counts.get(artist, 0) + 1
                
                # Count tracks
                track_name = f"{history.track.name} by {', '.join(history.track.artists)}"
                track_counts[track_name] = track_counts.get(track_name, 0) + 1
            
            most_played_artist = max(artist_counts.items(), key=lambda x: x[1])[0] if artist_counts else "Unknown"
            most_played_track = max(track_counts.items(), key=lambda x: x[1])[0] if track_counts else "Unknown"
            
            # Mood distribution
            mood_distribution = {}
            for history in track_history:
                if history.track.mood_label:
                    mood = history.track.mood_label
                    mood_distribution[mood] = mood_distribution.get(mood, 0) + 1
            
            # Sessions statistics
            sessions = ListeningSession.objects.filter(
                user=request.user,
                session_start__gte=since_date
            )
            
            avg_session_length = 0
            if sessions:
                total_session_time = sum(s.total_minutes for s in sessions)
                avg_session_length = total_session_time / sessions.count()
            
            serializer = ListeningStatsSerializer({
                'total_tracks_played': total_tracks,
                'total_listening_time_minutes': int(total_time),
                'average_session_length_minutes': round(avg_session_length, 1),
                'most_played_artist': most_played_artist,
                'most_played_track': most_played_track,
                'mood_distribution': mood_distribution,
                'listening_patterns': {
                    'analysis_period_days': days,
                    'tracks_per_day': round(total_tracks / days, 1),
                    'minutes_per_day': round(total_time / days, 1)
                }
            })
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting listening stats: {str(e)}")
            return Response(
                {'error': 'Failed to get listening statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MoodAnalysisSettingsView(APIView):
    """Manage mood analysis settings"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current mood analysis settings"""
        try:
            mood_profile, _ = MusicMoodProfile.objects.get_or_create(
                user=request.user,
                defaults={'current_mood_score': 0.5, 'current_mood_label': 'neutral'}
            )
            
            serializer = MoodAnalysisSettingsSerializer(mood_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting mood settings: {str(e)}")
            return Response(
                {'error': 'Failed to get settings'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Update mood analysis settings"""
        try:
            mood_profile, _ = MusicMoodProfile.objects.get_or_create(
                user=request.user,
                defaults={'current_mood_score': 0.5, 'current_mood_label': 'neutral'}
            )
            
            serializer = MoodAnalysisSettingsSerializer(mood_profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating mood settings: {str(e)}")
            return Response(
                {'error': 'Failed to update settings'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_listening_data(request):
    """Manually sync listening data from Spotify"""
    try:
        spotify_service = SpotifyAPIService(user=request.user)
        tracks_processed = spotify_service.analyze_and_save_listening_data()
        
        if tracks_processed is None:
            return Response(
                {'error': 'Failed to sync listening data'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {
                'success': True,
                'message': f'Processed {tracks_processed} tracks',
                'tracks_processed': tracks_processed
            }, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error syncing listening data: {str(e)}")
        return Response(
            {'error': 'Failed to sync data'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def weekly_mood_report(request):
    """Get weekly mood report"""
    try:
        # Get date range for current week
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Get sessions for the week
        sessions = ListeningSession.objects.filter(
            user=request.user,
            session_start__date__range=[week_start, week_end]
        ).exclude(computed_mood_score__isnull=True)
        
        if not sessions:
            return Response(
                {'error': 'No listening data for this week'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Compute weekly statistics
        mood_scores = [s.computed_mood_score for s in sessions]
        avg_mood_score = sum(mood_scores) / len(mood_scores)
        
        # Determine dominant mood
        mood_counts = {}
        for session in sessions:
            mood = session.mood_label
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        dominant_mood = max(mood_counts.items(), key=lambda x: x[1])[0]
        
        # Determine trend
        first_half = mood_scores[:len(mood_scores)//2]
        second_half = mood_scores[len(mood_scores)//2:]
        
        if len(first_half) > 0 and len(second_half) > 0:
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)
            
            if second_avg > first_avg + 0.1:
                trend = 'improving'
            elif second_avg < first_avg - 0.1:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        # Get top tracks
        track_history = UserTrackHistory.objects.filter(
            user=request.user,
            played_at__date__range=[week_start, week_end]
        ).select_related('track')
        
        track_counts = {}
        for history in track_history:
            track_id = history.track.id
            track_counts[track_id] = track_counts.get(track_id, 0) + 1
        
        top_track_ids = sorted(track_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_tracks = Track.objects.filter(id__in=[tid for tid, _ in top_track_ids])
        
        # Mood by day
        mood_by_day = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            day_sessions = sessions.filter(session_start__date=day)
            
            if day_sessions:
                day_scores = [s.computed_mood_score for s in day_sessions]
                day_mood_score = sum(day_scores) / len(day_scores)
                day_mood_counts = {}
                for s in day_sessions:
                    mood = s.mood_label
                    day_mood_counts[mood] = day_mood_counts.get(mood, 0) + 1
                day_mood_label = max(day_mood_counts.items(), key=lambda x: x[1])[0]
                
                day_listening = sum(s.total_minutes for s in day_sessions)
                
                mood_by_day.append({
                    'date': day,
                    'mood_score': round(day_mood_score, 3),
                    'mood_label': day_mood_label,
                    'listening_duration': day_listening
                })
        
        total_listening_time = sum(s.total_minutes for s in sessions)
        
        serializer = WeeklyMoodReportSerializer({
            'week_start': week_start,
            'week_end': week_end,
            'average_mood_score': round(avg_mood_score, 3),
            'dominant_mood': dominant_mood,
            'mood_trend': trend,
            'total_listening_time': total_listening_time,
            'top_tracks': top_tracks,
            'mood_by_day': mood_by_day
        })
        
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating weekly report: {str(e)}")
        return Response(
            {'error': 'Failed to generate weekly report'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
