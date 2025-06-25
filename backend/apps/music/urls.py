from django.urls import path
from . import views

app_name = 'music'

urlpatterns = [
    # Spotify Authentication
    path('auth/', views.SpotifyAuthView.as_view(), name='spotify-auth'),
    path('callback/', views.SpotifyCallbackView.as_view(), name='spotify-callback'),
    path('disconnect/', views.SpotifyDisconnectView.as_view(), name='spotify-disconnect'),
    path('status/', views.SpotifyConnectionStatusView.as_view(), name='spotify-status'),
    
    # Spotify Data Endpoints
    path('top-tracks/', views.TopTracksView.as_view(), name='top-tracks'),
    path('recently-played/', views.RecentlyPlayedView.as_view(), name='recently-played'),
    path('current-track/', views.CurrentTrackView.as_view(), name='current-track'),
    
    # Mood Analysis
    path('mood/analysis/', views.MoodAnalysisView.as_view(), name='mood-analysis'),
    path('mood/summary/', views.MoodSummaryView.as_view(), name='mood-summary'),
    path('mood/settings/', views.MoodAnalysisSettingsView.as_view(), name='mood-settings'),
    
    # Statistics and Reports
    path('stats/', views.ListeningStatsView.as_view(), name='listening-stats'),
    path('reports/weekly/', views.weekly_mood_report, name='weekly-mood-report'),
    
    # Data Management
    path('sync/', views.sync_listening_data, name='sync-listening-data'),
] 