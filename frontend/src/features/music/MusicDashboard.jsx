import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';

import { 
  Music, 
  Heart, 
  TrendingUp, 
  Leaf, 
  Calendar,
  BarChart3,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Volume2,
  AlertCircle
} from 'lucide-react';

import SpotifyConnect from './components/SpotifyConnect';
import MoodAnalysisDashboard from './components/MoodAnalysisDashboard';
import musicAPI from '../../services/music/musicApi';

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
  const [topTracks, setTopTracks] = useState([]);
  const [listeningStats, setListeningStats] = useState(null);
  const [moodSummary, setMoodSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Handle Spotify OAuth callback
  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      // Check for error from Spotify (e.g., user denied access)
      if (error) {
        console.error('Spotify Authorization Error:', error);
        setError(`Spotify authorization failed: ${error}`);
        // Clean up URL
        navigate('/music', { replace: true });
        return;
      }

      // If we have a code, process the callback
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
            throw new Error('Connection failed after callback');
          }
        } catch (err) {
          console.error('❌ Spotify connection failed on backend callback:', err);
          setError('Failed to complete Spotify connection. Please try again.');
          // Clean up URL
          navigate('/music', { replace: true });
        } finally {
          setIsProcessingCallback(false);
        }
      }
    };

    // Only process callback if we have URL parameters
    if (location.search) {
      handleSpotifyCallback();
    }
  }, [location.search, navigate]);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        console.log('🔍 Checking connection status...');
        const status = await musicAPI.getConnectionStatus();
        console.log('📡 Connection status:', status);
        
        if (status.is_connected) {
          console.log('✅ User is connected, setting connection status');
          setConnectionStatus({
            isConnected: true,
            profile: status.profile || null,
            moodProfile: status.mood_profile || null
          });
        } else {
          console.log('❌ User is not connected');
        }
      } catch (err) {
        console.error('❌ Error checking connection status:', err);
      }
    };

    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (connectionStatus.isConnected) {
      loadDashboardData();
      // Set up periodic refresh for current track
      const interval = setInterval(loadCurrentTrack, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [connectionStatus.isConnected]);

  const loadDashboardData = async () => {
    console.log('🚀 Loading dashboard data...');
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadCurrentTrack(),
        loadRecentTracks(),
        loadTopTracks(),
        loadListeningStats(),
        loadMoodSummary()
      ]);
      console.log('✅ Dashboard data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      setError('Failed to load music data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentTrack = async () => {
    try {
      console.log('🎵 Loading current track...');
      const track = await musicAPI.getCurrentTrack();
      console.log('🎵 Current track:', track);
      setCurrentTrack(track);
    } catch (err) {
      console.error('❌ Error loading current track:', err);
      setCurrentTrack(null);
    }
  };

  const loadRecentTracks = async () => {
    try {
      const tracks = await musicAPI.getRecentlyPlayed(10);
      setRecentTracks(tracks.items || []);
    } catch (err) {
      console.error('Error loading recent tracks:', err);
    }
  };

  const loadTopTracks = async () => {
    try {
      const tracks = await musicAPI.getTopTracks('medium_term', 10);
      setTopTracks(tracks.items || []);
    } catch (err) {
      console.error('Error loading top tracks:', err);
    }
  };

  const loadListeningStats = async () => {
    try {
      const stats = await musicAPI.getListeningStats(30);
      setListeningStats(stats);
    } catch (err) {
      console.error('Error loading listening stats:', err);
    }
  };

  const loadMoodSummary = async () => {
    try {
      const summary = await musicAPI.getMoodSummary();
      setMoodSummary(summary);
    } catch (err) {
      console.error('Error loading mood summary:', err);
    }
  };

  const handleConnectionChange = (isConnected, data) => {
    setConnectionStatus({
      isConnected,
      profile: data?.profile || null,
      moodProfile: data?.mood_profile || null
    });

    if (isConnected) {
      loadDashboardData();
    } else {
      // Clear all data when disconnected
      setCurrentTrack(null);
      setRecentTracks([]);
      setTopTracks([]);
      setListeningStats(null);
      setMoodSummary(null);
    }
  };

  const handleSyncData = async () => {
    setIsLoading(true);
    try {
      await musicAPI.syncListeningData();
      await loadDashboardData();
    } catch (err) {
      console.error('Error syncing data:', err);
      setError('Failed to sync listening data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentTrack = () => {
    if (!currentTrack) {
      return (
        <Card className="col-span-full bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-gray-500 py-8">
              <Music className="h-16 w-16 mb-4 text-gray-400" />
              <p className="text-lg font-semibold">No track playing</p>
              <p className="text-sm text-center mt-2">Start playing music on Spotify to see it here</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="col-span-full bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-green-800">
            <Volume2 className="h-5 w-5 mr-2" />
            Currently Playing
            <div className="ml-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Album Art */}
            <div className="flex-shrink-0">
              {currentTrack.album?.images?.[0] ? (
                <img
                  src={currentTrack.album.images[0].url}
                  alt="Album cover"
                  className="w-20 h-20 rounded-lg shadow-md"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg shadow-md flex items-center justify-center">
                  <Music className="h-10 w-10 text-green-600" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl truncate text-gray-900">{currentTrack.name}</h3>
              <p className="text-gray-700 truncate text-lg">
                {currentTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
              <p className="text-sm text-gray-500 truncate">{currentTrack.album?.name}</p>
              
              {/* Mood Badge */}
              {currentTrack.mood_score && (
                <div className="flex items-center mt-3">
                  <Badge variant="secondary" className="mr-3">
                    <span className="mr-1">{musicAPI.getMoodEmoji(musicAPI.formatMoodScore(currentTrack.mood_score))}</span>
                    {musicAPI.formatMoodScore(currentTrack.mood_score)}
                  </Badge>
                  <div className="flex items-center text-green-600 text-sm">
                    <Leaf className="h-4 w-4 mr-1" />
                    <span>Plant Growing</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {currentTrack.progress_ms && currentTrack.duration_ms && (
              <div className="w-full mt-4">
                <Progress 
                  value={(currentTrack.progress_ms / currentTrack.duration_ms) * 100} 
                  className="w-full h-2 bg-gray-200 rounded-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{musicAPI.formatDuration(currentTrack.progress_ms)}</span>
                  <span>{musicAPI.formatDuration(currentTrack.duration_ms)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderQuickStats = () => {
    if (!listeningStats || !moodSummary) return null;

    return (
      <>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Listening Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{listeningStats.total_listening_time}</div>
            <p className="text-xs text-blue-600">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Current Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <span className="text-3xl">
                {musicAPI.getMoodEmoji(moodSummary.current_mood_label)}
              </span>
              <div>
                <div className="font-bold capitalize text-purple-900 text-lg">{moodSummary.current_mood_label}</div>
                <div className="text-xs text-purple-600">
                  {Math.round(moodSummary.current_mood_score * 100)}% confidence
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Plant Growth Boost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="font-bold text-green-700 text-2xl">
                  +{Math.round(musicAPI.calculatePlantGrowthBonus(moodSummary.current_mood_score) * 100)}%
                </div>
                <div className="text-xs text-green-600">Growth bonus</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderTrackList = (tracks, title) => {
    if (!tracks.length) return null;

    return (
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Music className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tracks.slice(0, 5).map((item, index) => {
              const track = item.track || item;
              return (
                <div key={track.id || index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200">
                  {/* Album Art */}
                  <div className="flex-shrink-0">
                    {track.album?.images?.[0] ? (
                      <img
                        src={track.album.images[0].url}
                        alt="Album cover"
                        className="w-12 h-12 rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm flex items-center justify-center">
                        <Music className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{track.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {track.artists?.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                  
                  {/* Mood Indicator */}
                  {track.mood_score && (
                    <div className="flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">
                          {musicAPI.getMoodEmoji(musicAPI.formatMoodScore(track.mood_score))}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {musicAPI.formatMoodScore(track.mood_score)}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!connectionStatus.isConnected) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Music className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold mb-2">Music & Mood Analysis</h1>
            <p className="text-gray-600 mb-6">
              Connect your Spotify account to track your music mood and boost your plant growth
            </p>
          </div>
          
          {/* Show loading state when processing callback */}
          {isProcessingCallback ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Connecting to Spotify...</h2>
              <p className="text-gray-600">Please wait while we establish your connection.</p>
            </div>
          ) : (
            <>
              {error && (
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <SpotifyConnect onConnectionChange={handleConnectionChange} />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Music Dashboard</h1>
            <p className="text-gray-600">Track your music mood and plant growth integration</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Single Unified View */}
        <div className="space-y-6">
          {/* Current Track */}
          <div className="grid gap-6">
            {renderCurrentTrack()}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderQuickStats()}
          </div>

          {/* Mood Analysis */}
          <MoodAnalysisDashboard />

          {/* Music Library */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTrackList(topTracks, 'Your Top Tracks')}
            {renderTrackList(recentTracks, 'Recently Played')}
          </div>

          {/* Settings */}
          <SpotifyConnect onConnectionChange={handleConnectionChange} />
        </div>
      </div>
    </div>
  );
};

export default MusicDashboard; 