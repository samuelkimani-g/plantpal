import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  ExternalLink, 
  Loader2,
  Heart,
  Leaf
} from "lucide-react";
import { musicAPI } from "../services/api";

export default function NowPlayingWidget() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio());

  useEffect(() => {
    let intervalId;
    let mounted = true;

    const updateCurrentTrack = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        const response = await musicAPI.getCurrentTrack();
        
        if (mounted) {
          setCurrentTrack(response);
          setIsPlaying(response?.is_playing || false);
        }
      } catch (error) {
        if (mounted) {
          console.error("Error getting current track:", error);
          setCurrentTrack(null);
          setIsPlaying(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial update
    updateCurrentTrack();

    // Set up interval for updates
    intervalId = setInterval(updateCurrentTrack, 5000);

    // Cleanup function
    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const togglePlayPreview = (url) => {
    if (!url) {
      alert("No preview URL available for this track.");
      return;
    }

    if (audio.src === url && !audio.paused) {
      audio.pause();
      audio.src = '';
    } else {
      audio.pause();
      audio.src = url;
      audio.play().catch(e => console.error("Error playing audio preview:", e));
    }
  };

  const getMoodEmoji = (moodScore) => {
    if (!moodScore) return '❓';
    if (moodScore >= 0.75) return '😊';
    if (moodScore >= 0.55) return '⚡';
    if (moodScore >= 0.45) return '😐';
    if (moodScore >= 0.25) return '😌';
    return '😢';
  };

  const formatMoodScore = (score) => {
    if (score === null || score === undefined) return 'neutral';
    if (score >= 0.75) return 'happy';
    if (score >= 0.55) return 'energetic';
    if (score >= 0.45) return 'neutral';
    if (score >= 0.25) return 'calm';
    return 'sad';
  };

  if (isLoading) {
    return (
      <Card className="w-full bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-green-600 mr-2" />
            <span className="text-green-700">Loading current track...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentTrack || !currentTrack.track) {
    return (
      <Card className="w-full bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-700">
            <Music className="h-5 w-5 mr-2" />
            Now Playing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-gray-500 py-8">
            <Music className="h-16 w-16 mb-4 text-gray-400" />
            <p className="text-lg font-semibold">No track playing</p>
            <p className="text-sm text-center mt-2">Start playing music on Spotify to see it here</p>
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

  const track = currentTrack.track;
  const isPlayingThisPreview = audio.src === track.preview_url && !audio.paused;

  return (
    <Card className="w-full bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-green-800">
          <Volume2 className="h-5 w-5 mr-2" />
          Now Playing
          {isPlaying && (
            <div className="ml-2 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Album Art */}
          <div className="flex-shrink-0">
            {track.album_image_url ? (
              <img
                src={track.album_image_url}
                alt="Album cover"
                className="w-16 h-16 rounded-lg shadow-md"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg shadow-md flex items-center justify-center">
                <Music className="h-8 w-8 text-green-600" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate text-gray-900">{track.name}</h3>
            <p className="text-gray-700 truncate">
              {Array.isArray(track.artists) ? track.artists.join(', ') : track.artists}
            </p>
            <p className="text-sm text-gray-500 truncate">{track.album_name}</p>
            
            {/* Mood Badge */}
            {track.computed_mood_score !== undefined && (
              <div className="flex items-center mt-2">
                <Badge variant="secondary" className="mr-2">
                  <span className="mr-1">{getMoodEmoji(track.computed_mood_score)}</span>
                  {formatMoodScore(track.computed_mood_score)}
                </Badge>
                <div className="flex items-center text-green-600 text-sm">
                  <Leaf className="h-4 w-4 mr-1" />
                  <span>Plant Growing</span>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {currentTrack.progress_ms !== undefined && track.duration_ms !== undefined && (
              <div className="mt-3">
                <Progress 
                  value={(currentTrack.progress_ms / track.duration_ms) * 100} 
                  className="w-full h-2 bg-gray-200 rounded-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{musicAPI.formatDuration(currentTrack.progress_ms)}</span>
                  <span>{musicAPI.formatDuration(track.duration_ms)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2">
            {track.preview_url && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => togglePlayPreview(track.preview_url)}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                {isPlayingThisPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
            
            {track.external_url && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(track.external_url, '_blank')}
                className="border-blue-500 text-blue-700 hover:bg-blue-50"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 