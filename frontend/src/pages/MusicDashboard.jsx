import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import SpotifyConnect from '../components/SpotifyConnect';
import MoodAnalysisDashboard from '../components/MoodAnalysisDashboard';
import { musicAPI } from '../services/api';

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
  const [audio] = useState(new Audio()); // For playing preview_url

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
      setTopTracks([]);
      setListeningStats(null);
      setMoodSummary(null);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      console.log("🔄 Loading dashboard data...");
      
      // Use Promise.allSettled to allow some fetches to fail without stopping others
      const results = await Promise.allSettled([
        musicAPI.getCurrentTrack(),
        musicAPI.getRecentlyPlayed(10),
        musicAPI.getTopTracks('medium_term', 10),
        musicAPI.getListeningStats(30),
        musicAPI.getMoodSummary()
      ]);

      console.log("📊 API Results:", results.map((r, i) => ({
        index: i,
        status: r.status,
        value: r.status === 'fulfilled' ? r.value : r.reason
      })));

      const currentTrackData = results[0].status === 'fulfilled' ? results[0].value.track : null;
      const recentTracksData = results[1].status === 'fulfilled' ? (results[1].value.tracks || []) : [];
      const topTracksData = results[2].status === 'fulfilled' ? (results[2].value.tracks || []) : [];
      const listeningStatsData = results[3].status === 'fulfilled' ? results[3].value : null;
      const moodSummaryData = results[4].status === 'fulfilled' ? results[4].value : null;

      console.log("🎵 Current Track Data:", currentTrackData);
      console.log("📻 Recent Tracks Data:", recentTracksData);
      console.log("🏆 Top Tracks Data:", topTracksData);
      console.log("📈 Listening Stats Data:", listeningStatsData);
      console.log("😊 Mood Summary Data:", moodSummaryData);

      setCurrentTrack(currentTrackData);
      setRecentTracks(recentTracksData);
      setTopTracks(topTracksData);
      setListeningStats(listeningStatsData);
      setMoodSummary(moodSummaryData);

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
      const track = await musicAPI.getCurrentTrack();
      setCurrentTrack(track);
    } catch (err) {
      console.error('Error loading current track:', err);
      // Don't set a global error for individual failures that might recover
      setCurrentTrack(null);
    }
  };

  const handleSyncData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await musicAPI.syncListeningData();
      await loadDashboardData(); // Reload all data after sync
    } catch (err) {
      console.error('Error syncing data:', err);
      setError('Failed to sync listening data. Please ensure you are playing music on Spotify.');
    } finally {
      setIsLoading(false);
    }
  };

  // Audio Playback
  const togglePlayPreview = (url) => {
    if (!url) {
      alert("No preview URL available for this track.");
      return;
    }

    if (audio.src === url && !audio.paused) {
      audio.pause();
      audio.src = ''; // Clear source to stop buffering
    } else {
      audio.pause(); // Pause any currently playing track
      audio.src = url;
      audio.play().catch(e => console.error("Error playing audio preview:", e));
    }
  };

  const renderCurrentTrack = () => {
    console.log("🎵 Rendering current track with data:", currentTrack);
    console.log("🎵 Is loading:", isLoading);
    
    if (isLoading && !currentTrack) { // Only show loader if no data yet
      return (
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500 mb-4" />
            <p className="text-gray-600">Loading current track...</p>
          </CardContent>
        </Card>
      );
    }
    if (!currentTrack || Object.keys(currentTrack).length === 0) { // Check if object is empty
      console.log("🎵 No current track data, showing empty state");
      return (
        <Card className="col-span-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-gray-500 py-8">
              <Music className="h-16 w-16 mb-4 text-green-400" />
              <p className="text-lg font-semibold">No track playing</p>
              <p className="text-sm text-center mt-2">Start playing music on Spotify to see it here.</p>
              <Button 
                className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.open('https://open.spotify.com/', '_blank')}
              >
                Open Spotify <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    console.log("🎵 Rendering current track with data:", currentTrack);
    const isPlayingThisPreview = audio.src === currentTrack.preview_url && !audio.paused;

    return (
      <Card className="col-span-full shadow-lg border-green-200">
        <CardHeader className="bg-green-50 rounded-t-lg">
          <CardTitle className="flex items-center text-green-800">
            <Volume2 className="h-5 w-5 mr-2" />
            Currently Playing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            {currentTrack.album_image_url && (
              <img
                src={currentTrack.album_image_url}
                alt="Album cover"
                className="w-20 h-20 rounded-lg shadow-md"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl truncate">{currentTrack.name}</h3>
              <p className="text-gray-700 truncate">
                {Array.isArray(currentTrack.artists) ? currentTrack.artists.join(', ') : currentTrack.artists}
              </p>
              <p className="text-sm text-gray-500 truncate">{currentTrack.album_name}</p>
              {currentTrack.external_urls?.spotify && (
                <a 
                  href={currentTrack.external_urls.spotify} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-green-600 hover:underline text-sm flex items-center mt-1"
                >
                  View on Spotify <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
            {currentTrack.computed_mood_score !== undefined && (
              <div className="text-center">
                <div className="text-4xl mb-1">
                  {musicAPI.getMoodEmoji(musicAPI.formatMoodScore(currentTrack.computed_mood_score))}
                </div>
                <Badge variant="secondary" className="px-3 py-1 text-base capitalize">
                  {musicAPI.formatMoodScore(currentTrack.computed_mood_score)}
                </Badge>
              </div>
            )}
          </div>
          
          {currentTrack.progress_ms !== undefined && currentTrack.duration_ms !== undefined && (
            <div className="mt-4">
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
          
          {currentTrack.preview_url && (
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => togglePlayPreview(currentTrack.preview_url)}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                {isPlayingThisPreview ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlayingThisPreview ? 'Pause Preview' : 'Play Preview'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderQuickStats = () => {
    if (isLoading && (!listeningStats || !moodSummary)) {
      return (
        <Card className="col-span-full md:col-span-3">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500 mb-4" />
            <p className="text-gray-600">Loading stats...</p>
          </CardContent>
        </Card>
      );
    }
    if (!listeningStats || !moodSummary) return null; // Render nothing if data is not available

    return (
      <>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Listening Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{listeningStats.total_listening_time}</div>
            <p className="text-xs text-gray-600">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Mood</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="text-3xl">
                {musicAPI.getMoodEmoji(moodSummary.current_mood_label)}
              </span>
              <div>
                <div className="font-bold capitalize text-gray-800">{moodSummary.current_mood_label}</div>
                <div className="text-xs text-gray-600">
                  {Math.round(moodSummary.current_mood_score * 100)}% confidence
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plant Growth Boost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Leaf className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-bold text-green-700 text-2xl">
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
    console.log(`📻 Rendering ${title} with data:`, tracks);
    console.log(`📻 Is loading:`, isLoading);
    
    if (isLoading && tracks.length === 0) {
      return (
        <Card className="col-span-1">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-500 mb-4" />
            <p className="text-gray-600">Loading {title.toLowerCase()}...</p>
          </CardContent>
        </Card>
      );
    }
    if (!tracks || tracks.length === 0) {
      console.log(`📻 No ${title} data, showing empty state`);
      return (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Music className="h-5 w-5 mr-2 text-blue-500" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm">No {title.toLowerCase()} available.</p>
          </CardContent>
        </Card>
      );
    }

    console.log(`📻 Rendering ${title} with ${tracks.length} tracks`);
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Music className="h-5 w-5 mr-2 text-blue-500" />
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

  if (isProcessingCallback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4">
        <Loader2 className="h-20 w-20 animate-spin text-green-600 mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Spotify...</h2>
        <p className="text-gray-600 text-lg text-center">Please wait while we set up your music integration.</p>
        {error && (
          <Alert variant="destructive" className="mt-6 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
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
            <AlertTitle>Connection Error</AlertTitle>
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
        Music Dashboard
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Connect your Spotify to see your listening habits and how they influence your plant's mood!
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {renderQuickStats()}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3 gap-2">
            <TabsTrigger value="overview" className="flex items-center text-md">
              <Music className="h-4 w-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="mood" className="flex items-center text-md">
              <Leaf className="h-4 w-4 mr-2" /> Mood Analysis
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center text-md">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>
          <Button 
            onClick={handleSyncData} 
            disabled={isLoading}
            className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderCurrentTrack()}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {renderTrackList(topTracks, 'Top Tracks (Medium Term)')}
              {renderTrackList(recentTracks, 'Recently Played')}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mood">
          <MoodAnalysisDashboard isLoading={isLoading} moodSummary={moodSummary} />
        </TabsContent>

        <TabsContent value="settings">
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
                    handleConnectionChange(false, null); // Manually update state
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MusicDashboard; 