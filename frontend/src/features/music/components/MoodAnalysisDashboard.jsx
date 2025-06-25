import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  TrendingUp, TrendingDown, Music, Heart, Brain, 
  Loader2, RefreshCw, Calendar, BarChart3,
  Headphones, Timer, Star
} from 'lucide-react';
import musicAPI from '../../../services/music/musicApi';

const MoodAnalysisDashboard = ({ isConnected }) => {
  const [moodData, setMoodData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  useEffect(() => {
    if (isConnected) {
      loadMoodData();
      loadStatsData();
      loadCurrentTrack();
    }
  }, [isConnected, selectedPeriod]);

  const loadMoodData = async () => {
    try {
      setLoading(true);
      const data = await musicAPI.getMoodAnalysis(selectedPeriod);
      setMoodData(data);
      setError(null);
    } catch (error) {
      console.error('Error loading mood data:', error);
      setError('Failed to load mood analysis');
    } finally {
      setLoading(false);
    }
  };

  const loadStatsData = async () => {
    try {
      const data = await musicAPI.getListeningStats(selectedPeriod);
      setStatsData(data);
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  };

  const loadCurrentTrack = async () => {
    try {
      const data = await musicAPI.getCurrentTrack();
      setCurrentTrack(data);
    } catch (error) {
      console.error('Error loading current track:', error);
    }
  };

  const handleRefresh = () => {
    loadMoodData();
    loadStatsData();
    loadCurrentTrack();
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await musicAPI.syncListeningData();
      // Reload data after sync
      await loadMoodData();
      await loadStatsData();
    } catch (error) {
      console.error('Error syncing data:', error);
      setError('Failed to sync listening data');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Music className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="text-gray-600">Connect Spotify to see your mood analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !moodData) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Analyzing your music mood...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !moodData) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderMoodOverview = () => {
    if (!moodData) return null;

    const moodColor = musicAPI.getMoodColor(moodData.overall_mood_score);
    const moodEmoji = musicAPI.getMoodEmoji(moodData.overall_mood_label);

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
                {musicAPI.formatMoodScore(moodData.overall_mood_score)}
              </h3>
              <p className="text-gray-600">
                {(moodData.overall_mood_score * 100).toFixed(0)}% mood score
              </p>
            </div>
            
            {moodData.mood_breakdown && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">Sessions</p>
                  <p className="text-2xl font-bold">{moodData.mood_breakdown.total_sessions}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">Listening Time</p>
                  <p className="text-2xl font-bold">
                    {Math.round(moodData.mood_breakdown.total_listening_minutes / 60)}h
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
    if (!currentTrack?.track) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Headphones className="h-5 w-5" />
            <span>Now Playing</span>
            {currentTrack.is_playing && (
              <Badge variant="secondary" className="animate-pulse">Live</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            {currentTrack.track.album_image_url && (
              <img 
                src={currentTrack.track.album_image_url} 
                alt="Album" 
                className="w-16 h-16 rounded-lg"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium">{currentTrack.track.name}</h4>
              <p className="text-sm text-gray-600">
                {currentTrack.track.artists?.join(', ')}
              </p>
              {currentTrack.track.mood_label && (
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-xs">
                    {musicAPI.getMoodEmoji(currentTrack.track.mood_label)}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {currentTrack.track.mood_label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderListeningStats = () => {
    if (!statsData) return null;

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
              <p className="text-2xl font-bold text-blue-900">{statsData.total_tracks_played}</p>
              <p className="text-sm text-blue-600">Tracks Played</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Timer className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-900">
                {Math.round(statsData.total_listening_time_minutes / 60)}h
              </p>
              <p className="text-sm text-green-600">Listening Time</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg col-span-2">
              <Star className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="font-medium text-purple-900">{statsData.most_played_artist}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Music Mood Analysis</h2>
          <p className="text-gray-600">Insights from your Spotify listening habits</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {renderMoodOverview()}
          {renderCurrentTrack()}
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {renderTopMoods()}
          {renderListeningStats()}
          {renderRecommendations()}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default MoodAnalysisDashboard; 