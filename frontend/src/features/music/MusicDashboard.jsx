import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('overview');
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

  useEffect(() => {
    if (connectionStatus.isConnected) {
      loadDashboardData();
      // Set up periodic refresh for current track
      const interval = setInterval(loadCurrentTrack, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [connectionStatus.isConnected]);

  const loadDashboardData = async () => {
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
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load music data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentTrack = async () => {
    try {
      const track = await musicAPI.getCurrentTrack();
      setCurrentTrack(track);
    } catch (err) {
      console.error('Error loading current track:', err);
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
        <Card className="col-span-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-gray-500">
              <Music className="h-12 w-12 mr-3" />
              <div>
                <p className="text-lg font-medium">No track playing</p>
                <p className="text-sm">Start playing music on Spotify to see it here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="h-5 w-5 mr-2" />
            Currently Playing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {currentTrack.album?.images?.[0] && (
              <img
                src={currentTrack.album.images[0].url}
                alt="Album cover"
                className="w-16 h-16 rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{currentTrack.name}</h3>
              <p className="text-gray-600 truncate">
                {currentTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
              <p className="text-sm text-gray-500 truncate">{currentTrack.album?.name}</p>
            </div>
            {currentTrack.mood_score && (
              <div className="text-center">
                <div className="text-2xl mb-1">
                  {musicAPI.getMoodEmoji(musicAPI.formatMoodScore(currentTrack.mood_score))}
                </div>
                <Badge variant="outline">
                  {musicAPI.formatMoodScore(currentTrack.mood_score)}
                </Badge>
              </div>
            )}
          </div>
          {currentTrack.progress_ms && currentTrack.duration_ms && (
            <div className="mt-4">
              <Progress 
                value={(currentTrack.progress_ms / currentTrack.duration_ms) * 100} 
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{musicAPI.formatDuration(currentTrack.progress_ms)}</span>
                <span>{musicAPI.formatDuration(currentTrack.duration_ms)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderQuickStats = () => {
    if (!listeningStats || !moodSummary) return null;

    return (
      <>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Listening Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listeningStats.total_listening_time}</div>
            <p className="text-xs text-gray-600">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {musicAPI.getMoodEmoji(moodSummary.current_mood_label)}
              </span>
              <div>
                <div className="font-bold capitalize">{moodSummary.current_mood_label}</div>
                <div className="text-xs text-gray-600">
                  {Math.round(moodSummary.current_mood_score * 100)}% confidence
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plant Growth Boost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Leaf className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-bold text-green-600">
                  +{Math.round(musicAPI.calculatePlantGrowthBonus(moodSummary.current_mood_score) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Growth bonus</div>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Music className="h-5 w-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tracks.slice(0, 5).map((item, index) => {
              const track = item.track || item;
              return (
                <div key={track.id || index} className="flex items-center space-x-3">
                  {track.album?.images?.[0] && (
                    <img
                      src={track.album.images[0].url}
                      alt="Album cover"
                      className="w-10 h-10 rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {track.artists?.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                  {track.mood_score && (
                    <div className="text-right">
                      <span className="text-lg">
                        {musicAPI.getMoodEmoji(musicAPI.formatMoodScore(track.mood_score))}
                      </span>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mood">Mood Analysis</TabsTrigger>
            <TabsTrigger value="tracks">Music Library</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Track */}
            <div className="grid gap-6">
              {renderCurrentTrack()}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderQuickStats()}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderTrackList(recentTracks, 'Recently Played')}
              {renderTrackList(topTracks, 'Top Tracks')}
            </div>
          </TabsContent>

          <TabsContent value="mood">
            <MoodAnalysisDashboard />
          </TabsContent>

          <TabsContent value="tracks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderTrackList(topTracks, 'Your Top Tracks')}
              {renderTrackList(recentTracks, 'Recently Played')}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <SpotifyConnect onConnectionChange={handleConnectionChange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MusicDashboard; 