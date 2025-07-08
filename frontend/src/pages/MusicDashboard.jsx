import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  ExternalLink,
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Calendar, 
  BarChart3,
  Headphones, 
  Timer, 
  Star
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
  const [moodData, setMoodData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [isUpdatingPlant, setIsUpdatingPlant] = useState(false);
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
      setMoodData(null);
      setStatsData(null);
      setCurrentTrack(null);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!connectionStatus.isConnected) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Loading dashboard data...");
      
      const results = await Promise.allSettled([
        musicAPI.getMoodAnalysis(selectedPeriod),
        musicAPI.getListeningStats(selectedPeriod),
        musicAPI.getCurrentTrack()
      ]);

      const moodDataResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const statsDataResult = results[1].status === 'fulfilled' ? results[1].value : null;
      const currentTrackResult = results[2].status === 'fulfilled' ? results[2].value : null;

      console.log("🎵 DEBUG - Mood Data:", moodDataResult);
      console.log("📊 DEBUG - Stats Data:", statsDataResult);
      console.log("🎶 DEBUG - Current Track:", currentTrackResult);

      setMoodData(moodDataResult);
      setStatsData(statsDataResult);
      setCurrentTrack(currentTrackResult);

      // If there's a track playing, update plant growth
      if (currentTrackResult && currentTrackResult.track && currentTrackResult.is_playing) {
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
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load music data. Some sections might be empty.');
    } finally {
      setLoading(false);
    }
  }, [connectionStatus.isConnected, selectedPeriod]);

  // Initial data load or reload on connection change
  useEffect(() => {
    if (connectionStatus.isConnected) {
      loadDashboardData();
      // Set up periodic refresh for current track
      const interval = setInterval(() => {
        if (connectionStatus.isConnected) {
          loadCurrentTrack();
        }
      }, 15000); // Check every 15 seconds
      return () => clearInterval(interval);
    }
  }, [connectionStatus.isConnected, loadDashboardData]);

  const loadCurrentTrack = async () => {
    try {
      const response = await musicAPI.getCurrentTrack();
      setCurrentTrack(response);
      console.log("Refreshed Current Track:", response);
      
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

  const handleSync = async () => {
    try {
      setLoading(true);
      await musicAPI.syncListeningData();
      await loadDashboardData();
    } catch (error) {
      console.error('Error syncing data:', error);
      setError('Failed to sync listening data');
    } finally {
      setLoading(false);
    }
  };

  const renderMoodOverview = () => {
    if (!moodData) return null;

    // Safe data extraction with fallbacks
    const moodScore = moodData.overall_mood_score || moodData.overall_mood || 0.5;
    const moodLabel = moodData.overall_mood_label || moodData.mood_label || 'neutral';
    const moodColor = musicAPI.getMoodColor(moodScore);
    const moodEmoji = musicAPI.getMoodEmoji(moodLabel);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Mood Overview</span>
            <Badge variant="secondary" className="ml-auto">
              Last {selectedPeriod} days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-6xl">{moodEmoji}</div>
            <div>
              <h3 className="text-2xl font-bold" style={{ color: moodColor }}>
                {musicAPI.formatMoodScore(moodScore)}
              </h3>
              <p className="text-gray-600">
                {isNaN(moodScore) ? '50%' : (moodScore * 100).toFixed(0) + '%'} mood score
              </p>
            </div>
            
            {moodData.mood_breakdown && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">Sessions</p>
                  <p className="text-2xl font-bold">{moodData.mood_breakdown.total_sessions || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">Listening Time</p>
                  <p className="text-2xl font-bold">
                    {isNaN(moodData.mood_breakdown.total_listening_minutes) ? '0' : Math.round(moodData.mood_breakdown.total_listening_minutes / 60)}h
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTopMoods = () => {
    if (!moodData?.top_moods?.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Mood Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moodData.top_moods.slice(0, 5).map((mood, index) => (
              <div key={mood.mood} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{musicAPI.getMoodEmoji(mood.mood)}</span>
                  <span className="font-medium capitalize">{mood.mood}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${mood.percentage}%`,
                        backgroundColor: musicAPI.getMoodColor(0.5 + (mood.percentage / 100) * 0.5)
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12">{mood.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCurrentTrack = () => {
    if (!currentTrack?.track) {
      return (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-dashed border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700">
              <Headphones className="h-5 w-5" />
              <span>Now Playing</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Music className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600">No track currently playing</p>
              <p className="text-sm text-gray-500 mt-2">Start playing music on Spotify to see it here</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-700">
            <Headphones className="h-5 w-5" />
            <span>Now Playing</span>
            {currentTrack.is_playing && (
              <Badge variant="secondary" className="animate-pulse bg-green-500 text-white">Live</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {currentTrack.track.album_image_url && (
              <img 
                src={currentTrack.track.album_image_url} 
                alt="Album" 
                className="w-20 h-20 rounded-lg shadow-md"
              />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-lg text-gray-900">{currentTrack.track.name}</h4>
              <p className="text-gray-600 font-medium">
                {Array.isArray(currentTrack.track.artists) ? currentTrack.track.artists.join(', ') : currentTrack.track.artists}
              </p>
              <p className="text-sm text-gray-500">{currentTrack.track.album_name}</p>
              {currentTrack.track.mood_label && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-2xl">
                    {musicAPI.getMoodEmoji(currentTrack.track.mood_label)}
                  </span>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {currentTrack.track.mood_label} mood
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center space-y-2">
              {currentTrack.is_playing && (
                <div className="flex space-x-1">
                  <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-8 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              )}
              {isUpdatingPlant && (
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderListeningStats = () => {
    if (!statsData) return null;

    // Safe data extraction with fallbacks
    const totalTracks = statsData.total_tracks_played || statsData.tracks_played || 0;
    const listeningTime = statsData.total_listening_time_minutes || statsData.listening_time_minutes || 0;
    const topArtist = statsData.most_played_artist || statsData.top_artist || 'No data';

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Listening Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Music className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-900">{totalTracks}</p>
              <p className="text-sm text-blue-600">Tracks Played</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Timer className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-900">
                {isNaN(listeningTime) ? '0' : Math.round(listeningTime / 60)}h
              </p>
              <p className="text-sm text-green-600">Listening Time</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg col-span-2">
              <Star className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="font-medium text-purple-900">{topArtist}</p>
              <p className="text-sm text-purple-600">Top Artist</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendations = () => {
    if (!moodData?.recommendations?.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moodData.recommendations.map((rec, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{rec.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                <Badge variant="outline" className="mt-2">
                  {rec.type}
                </Badge>
              </div>
            ))}
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

      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-emerald-950 rounded-lg px-3 py-2 shadow">
            <Leaf className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-emerald-700 dark:text-emerald-100">{leaves} Leaves</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Button onClick={handleSync} variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="space-y-6">
        {/* Current Track - Prominent Display */}
        <div className="w-full">
          {renderCurrentTrack()}
        </div>

        {/* Mood Overview and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {renderMoodOverview()}
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            {renderTopMoods()}
            {renderListeningStats()}
            {renderRecommendations()}
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <Card className="mt-8 p-6 shadow-lg">
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
    </div>
  );
};

export default MusicDashboard; 