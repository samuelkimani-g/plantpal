import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Music,
  Heart,
  Leaf,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import SpotifyConnect from '../components/SpotifyConnect';
import NowPlayingWidget from '../components/NowPlayingWidget';
import OfflineMusicWidget from '../components/OfflineMusicWidget';
import { musicAPI, paymentsAPI } from '../services/api';

const MusicDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    profile: null,
    moodProfile: null
  });
  const [currentTrack, setCurrentTrack] = useState(null);
  const [recentTracks, setRecentTracks] = useState([]);
  const [listeningStats, setListeningStats] = useState(null);
  const [moodAnalysis, setMoodAnalysis] = useState(null);
  const [isLoadingMood, setIsLoadingMood] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [isUpdatingPlant, setIsUpdatingPlant] = useState(false);
  const [audio] = useState(new Audio()); // For playing preview_url
  const [leaves, setLeaves] = useState(0);

  // Handle Spotify OAuth callback
  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        console.error('Spotify Authorization Error:', errorParam);
        setError(`Spotify authorization failed: ${errorParam}. Please try again.`);
        navigate('/music', { replace: true });
        return;
      }

      if (code) {
        console.log('✅ Spotify Callback: Authorization code received. Processing...');
        setIsProcessingCallback(true);
        setError(null);

        try {
          const result = await musicAPI.handleCallback(code, state);
          
          if (result.is_connected) {
            console.log('🎉 Spotify connection successful!', result);
            setConnectionStatus({
              isConnected: true,
              profile: result.profile || null,
              moodProfile: result.mood_profile || null
            });
            // Clean up URL and show success
            navigate('/music', { replace: true });
          } else {
            throw new Error(result.detail || 'Connection failed after callback');
          }
        } catch (err) {
          console.error('❌ Spotify connection failed on backend callback:', err);
          setError(err.message || 'Failed to complete Spotify connection. Please try again.');
          navigate('/music', { replace: true });
        } finally {
          setIsProcessingCallback(false);
        }
      }
    };

    // Only process callback if we have URL parameters for it and not already processing
    if (location.search && !isProcessingCallback) {
      handleSpotifyCallback();
    }
  }, [location.search, navigate, isProcessingCallback]);

  // This function is passed to SpotifyConnect and called when its status changes
  const handleConnectionChange = useCallback((isConnected, data) => {
    setConnectionStatus({
      isConnected,
      profile: data?.profile || null,
      moodProfile: data?.mood_profile || null
    });

    if (isConnected) {
      console.log("Connection changed to CONNECTED. Loading dashboard data...");
      loadDashboardData();
    } else {
      console.log("Connection changed to DISCONNECTED. Clearing dashboard data...");
      // Clear all data when disconnected
      setCurrentTrack(null);
      setRecentTracks([]);
      setListeningStats(null);
      setMoodAnalysis(null);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      console.log("🔄 Loading dashboard data for last 7 days...");
      
      // Use Promise.allSettled to allow some fetches to fail without stopping others
      const results = await Promise.allSettled([
        musicAPI.getCurrentTrack(),
        musicAPI.getRecentlyPlayed(10),
        musicAPI.getListeningStats(7), // Only 7 days
        musicAPI.getMoodAnalysis(7) // Only 7 days
      ]);

      console.log("📊 API Results:", results.map((r, i) => ({
        index: i,
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : r.reason
      })));

      const currentTrackData = results[0].status === 'fulfilled' ? results[0].value : null;
      const recentTracksData = results[1].status === 'fulfilled' ? (results[1].value.tracks || []) : [];
      const listeningStatsData = results[2].status === 'fulfilled' ? results[2].value : null;
      const moodAnalysisData = results[3].status === 'fulfilled' ? results[3].value : null;

      console.log("🎵 Current Track Data:", currentTrackData);
      console.log("📻 Recent Tracks Data:", recentTracksData);
      console.log("📈 Listening Stats Data:", listeningStatsData);
      console.log("😊 Mood Analysis Data:", moodAnalysisData);

      setCurrentTrack(currentTrackData);
      setRecentTracks(recentTracksData);
      setListeningStats(listeningStatsData);
      setMoodAnalysis(moodAnalysisData);

      // Log any individual errors from Promise.allSettled
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Error loading data for item ${index}:`, result.reason);
        }
      });

    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load music data. Some sections might be empty.');
    } finally {
      setIsLoading(false);
      setIsLoadingMood(false);
    }
  }, []);

  // Initial data load or reload on connection change
  useEffect(() => {
    if (connectionStatus.isConnected) {
      loadDashboardData();
      // Set up periodic refresh for current track
      const interval = setInterval(loadCurrentTrack, 15000); // Check every 15 seconds
      return () => clearInterval(interval); // Cleanup on component unmount
    }
  }, [connectionStatus.isConnected, loadDashboardData]);

  const loadCurrentTrack = async () => {
    try {
      const response = await musicAPI.getCurrentTrack();
      setCurrentTrack(response); // Store the full response object
      console.log("Refreshed Current Track:", response); // Log periodic refresh
      
      // If there's a track playing, update plant growth
      if (response && response.track && response.is_playing) {
        setIsUpdatingPlant(true);
        try {
          const plantUpdate = await musicAPI.updatePlantFromMusic();
          console.log("🌱 Plant updated from music:", plantUpdate.data);
        } catch (plantErr) {
          console.error("❌ Failed to update plant from music:", plantErr);
        } finally {
          setIsUpdatingPlant(false);
        }
      }
    } catch (err) {
      console.error("❌ Error refreshing current track:", err);
    }
  };

  const handleSyncData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Syncing music data...");
      await musicAPI.syncListeningData();
      await loadDashboardData(); // Reload all data after sync
      console.log("✅ Music data synced successfully!");
    } catch (err) {
      console.error("❌ Error syncing music data:", err);
      setError('Failed to sync music data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPreview = (url) => {
    if (audio.src === url && !audio.paused) {
      audio.pause();
    } else {
      audio.src = url;
      audio.play().catch(err => console.error('Error playing preview:', err));
    }
  };

  const renderQuickStats = () => {
    if (!listeningStats) return null;

    const stats = [
      {
        title: "Sessions",
        value: listeningStats.sessions || 0,
        icon: Music,
        color: "text-blue-600"
      },
      {
        title: "Listening Time",
        value: musicAPI.formatDuration(listeningStats.total_duration_ms || 0),
        icon: Volume2,
        color: "text-green-600"
      },
      {
        title: "Tracks Played",
        value: listeningStats.tracks_played || 0,
        icon: Heart,
        color: "text-purple-600"
      }
    ];

    return stats.map((stat, index) => (
      <Card key={index} className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
          </div>
        </CardContent>
      </Card>
    ));
  };

  const renderMoodAnalysis = () => {
    if (!moodAnalysis) {
      return (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <Leaf className="h-5 w-5 mr-2" /> Mood Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center text-gray-500">
            <p>No mood data available. Listen to more music to generate a mood profile!</p>
          </CardContent>
        </Card>
      );
    }

    const currentMood = moodAnalysis.overall_mood_label || moodAnalysis.current_mood_label || 'neutral';
    const moodScore = moodAnalysis.overall_mood_score || moodAnalysis.current_mood_score || 0.5;
    const moodEmoji = musicAPI.getMoodEmoji(currentMood);

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <Leaf className="h-5 w-5 mr-2" /> Mood Summary - Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">{moodEmoji}</div>
            <h3 className="text-2xl font-bold text-gray-800 capitalize mb-2">{currentMood}</h3>
            <p className="text-lg text-gray-600">{(moodScore * 100).toFixed(0)}% mood score</p>
            
            {/* Show how mood affects plant */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                {moodScore > 0.7 ? "🌱 Your positive mood is helping your plant thrive!" :
                 moodScore > 0.5 ? "🌿 Your balanced mood keeps your plant healthy" :
                 moodScore > 0.3 ? "🍂 Your plant needs more positive energy" :
                 "🥀 Your plant is wilting - try some uplifting music!"}
              </p>
            </div>
          </div>
          
          {moodAnalysis.mood_breakdown && moodAnalysis.mood_breakdown.mood_distribution && 
           Object.keys(moodAnalysis.mood_breakdown.mood_distribution).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 mb-3">Mood Breakdown</h4>
              {Object.entries(moodAnalysis.mood_breakdown.mood_distribution)
                .sort(([,a], [,b]) => b - a)
                .map(([mood, count]) => {
                  const total = moodAnalysis.mood_breakdown.total_sessions || 1;
                  const percentage = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={mood} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{musicAPI.getMoodEmoji(mood)}</span>
                        <span className="capitalize">{mood}</span>
                      </div>
                      <span className="font-semibold">{percentage}%</span>
                    </div>
                  );
                })}
            </div>
          )}
          
          {/* Stats summary */}
          {moodAnalysis.mood_breakdown && (
            <div className="mt-4 pt-4 border-t text-sm text-gray-600">
              <p>{moodAnalysis.mood_breakdown.total_sessions || 0} listening sessions analyzed</p>
              <p>{moodAnalysis.mood_breakdown.total_listening_minutes || 0} minutes of music</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTrackList = (tracks, title) => {
    if (!tracks || tracks.length === 0) return null;

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-green-700">
            <Music className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tracks.slice(0, 5).map((item, index) => {
              const track = item.track || item; // Handle both UserTrackHistory and direct track objects
              const isPlayingThisTrackPreview = audio.src === track.preview_url && !audio.paused;

              return (
                <div key={track.id || index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  {track.album_image_url && (
                    <img
                      src={track.album_image_url}
                      alt="Album cover"
                      className="w-12 h-12 rounded-md shadow-sm"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-gray-900">{track.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {track.computed_mood_score !== undefined && (
                      <span className="text-xl">
                        {musicAPI.getMoodEmoji(musicAPI.formatMoodScore(track.computed_mood_score))}
                      </span>
                    )}
                    {track.preview_url && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => togglePlayPreview(track.preview_url)}
                        className="rounded-full hover:bg-green-100"
                      >
                        {isPlayingThisTrackPreview ? <Pause className="h-5 w-5 text-green-600" /> : <Play className="h-5 w-5 text-green-600" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    paymentsAPI.getLeaves().then((res) => setLeaves(res.data.leaves));
  }, []);

  if (isProcessingCallback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4">
        <Loader2 className="h-20 w-20 animate-spin text-green-600 mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Spotify...</h2>
        <p className="text-gray-600 text-lg text-center">Please wait while we set up your music integration.</p>
        {error && (
          <Alert variant="destructive" className="mt-6 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (!connectionStatus.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <SpotifyConnect onConnectionChange={handleConnectionChange} />
        {error && (
          <Alert variant="destructive" className="mt-6 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2 flex items-center">
        <Music className="h-10 w-10 text-green-600 mr-3" />
        Music Mood Tracker
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Your music affects your plant's mood and health - see your mood summary below
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex justify-end">
        <Button 
          onClick={handleSyncData} 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Syncing...' : 'Sync Data'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {renderQuickStats()}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Current Track Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NowPlayingWidget />
          </div>
          <div className="lg:col-span-1">
            <OfflineMusicWidget />
          </div>
        </div>

        {/* Mood Analysis */}
        {renderMoodAnalysis()}

        {/* Settings Section */}
        <Card className="p-6 shadow-lg">
          <CardTitle className="mb-4 text-green-700">Spotify Account Settings</CardTitle>
          <CardDescription className="mb-4">
            Manage your Spotify connection and user profile information.
          </CardDescription>
          {connectionStatus.profile && (
            <div className="space-y-4">
              <p className="text-gray-700">
                <span className="font-semibold">Connected User:</span> {connectionStatus.profile.display_name}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Email:</span> {connectionStatus.profile.email}
              </p>
              {connectionStatus.profile.spotify_url && (
                <p>
                  <a 
                    href={connectionStatus.profile.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-green-600 hover:underline flex items-center"
                  >
                    View Spotify Profile <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </p>
              )}
              <Button 
                variant="destructive" 
                onClick={() => {
                  musicAPI.disconnectSpotify();
                  handleConnectionChange(false, null);
                }}
                className="flex items-center"
              >
                <AlertCircle className="h-4 w-4 mr-2" /> Disconnect Spotify
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Disconnecting will remove all Spotify integration and data from PlantPal.
              </p>
            </div>
          )}
        </Card>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-emerald-950 rounded-lg px-3 py-2 shadow">
            <Leaf className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-emerald-700 dark:text-emerald-100">{leaves} Leaves</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicDashboard; 