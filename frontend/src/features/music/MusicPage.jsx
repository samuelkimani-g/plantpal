"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { apiService } from "../../services/api"
import { spotifyService } from "../../services/spotify"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Heart,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Headphones,
  TrendingUp,
  Calendar,
  Sparkles
} from "lucide-react"

const MusicPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { currentPlant, spotifyConnected, checkSpotifyStatus, fetchPlants } = usePlant()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recentTracks, setRecentTracks] = useState([])
  const [moodAnalysis, setMoodAnalysis] = useState(null)
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)

  // Handle Spotify callback
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')
    const returnTo = urlParams.get('state') || '/dashboard'

    if (code) {
      handleSpotifyCallback(code, returnTo)
    } else if (error) {
      setConnectionError(`Spotify connection failed: ${error}`)
    }
  }, [location])

  // Check connection status on mount
  useEffect(() => {
    checkSpotifyStatus()
    if (spotifyConnected) {
      loadMusicData()
    }
  }, [spotifyConnected])

  const handleSpotifyCallback = async (code, returnTo) => {
    setIsConnecting(true)
    try {
      const response = await spotifyService.connectWithCode(code)
      
      if (response.connected) {
        await checkSpotifyStatus()
        await fetchPlants() // Refresh plant data
        
        // Clean URL and redirect
        window.history.replaceState({}, document.title, "/music")
        
        // Navigate back to the original page after 2 seconds
        setTimeout(() => {
          navigate(returnTo)
        }, 2000)
      }
    } catch (error) {
      console.error("Spotify connection error:", error)
      setConnectionError(error.message || "Failed to connect to Spotify")
    } finally {
      setIsConnecting(false)
    }
  }

  const connectSpotify = async () => {
    setIsConnecting(true)
    setConnectionError(null)
    
    try {
      // Store current page for redirect after connection
      const currentPage = location.pathname
      
      // Get auth URL from backend
      const authUrl = await spotifyService.getAuthUrl(currentPage)
      
      window.location.href = authUrl
    } catch (error) {
      console.error("Error getting Spotify auth URL:", error)
      setConnectionError("Failed to get Spotify authorization URL")
      setIsConnecting(false)
    }
  }

  const disconnectSpotify = async () => {
    try {
      await spotifyService.disconnect()
      await checkSpotifyStatus()
      setCurrentTrack(null)
      setRecentTracks([])
      setMoodAnalysis(null)
    } catch (error) {
      console.error("Error disconnecting Spotify:", error)
    }
  }

  const loadMusicData = async () => {
    setIsLoadingMusic(true)
    try {
      // Fetch valence data and update plant via backend
      const response = await spotifyService.fetchValenceAndUpdatePlant()
      
      if (response.valence_scores && response.valence_scores.length > 0) {
        // Update mood analysis with real data
        const avgValence = response.average_valence
        setMoodAnalysis({
          averageValence: avgValence,
          mood: avgValence > 0.7 ? 'happy' : avgValence > 0.5 ? 'neutral' : 'sad',
          totalTracks: response.valence_scores.length
        })
        
        // Refresh plant data to get updated mood scores
        await fetchPlants()
      }
      
      // Try to get current track info (using legacy method for now)
      try {
        const currentTrackData = await spotifyService.getCurrentTrack()
        if (currentTrackData) {
          setCurrentTrack(currentTrackData)
        }
      } catch (error) {
        console.warn("Could not fetch current track:", error.message)
      }
      
      // Try to get recent tracks (using legacy method for now)
      try {
        const recentTracksData = await spotifyService.getRecentTracks(5)
        if (recentTracksData && recentTracksData.length > 0) {
          setRecentTracks(recentTracksData.map(track => ({
            ...track,
            valence: 0.6 // Default valence since we can't get audio features in dev mode
          })))
        }
      } catch (error) {
        console.warn("Could not fetch recent tracks:", error.message)
      }
      
    } catch (error) {
      console.error("Error loading music data:", error)
      setConnectionError(error.message || "Failed to load music data")
    } finally {
      setIsLoadingMusic(false)
    }
  }

  const getMoodColor = (valence) => {
    if (valence > 0.7) return "text-green-500"
    if (valence > 0.5) return "text-yellow-500"
    return "text-blue-500"
  }

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😊'
      case 'neutral': return '😐'
      case 'sad': return '😔'
      default: return '🎵'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            🎵 Music & Mood
          </h1>
          <p className="text-muted-foreground">Connect your music to nurture your digital plant</p>
        </div>

        {/* Connection Status */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Spotify Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Spotify Connection
                </span>
                {spotifyConnected && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnecting && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Connecting to Spotify... You'll be redirected back automatically.
                  </AlertDescription>
                </Alert>
              )}

              {connectionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}

              {!spotifyConnected ? (
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">🎵</div>
                  <h3 className="text-xl font-semibold">Connect Your Spotify</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Connect your Spotify account to let your music influence your plant's mood and growth. 
                    Positive music helps your plant thrive!
                  </p>
                  <Button 
                    onClick={connectSpotify} 
                    disabled={isConnecting}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Music className="h-4 w-4 mr-2" />
                    )}
                    Connect Spotify
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Music className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Spotify Connected</h3>
                        <p className="text-sm text-muted-foreground">Your music is influencing your plant's mood</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadMusicData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm" onClick={disconnectSpotify}>
                        Disconnect
                      </Button>
                    </div>
                  </div>

                  {/* Plant Mood Impact */}
                  {currentPlant && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Plant Mood Impact</span>
                        <Badge variant="outline">
                          {((currentPlant.spotify_mood_score || 0.5) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={(currentPlant.spotify_mood_score || 0.5) * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Your music is making your plant feel {currentPlant.current_mood_influence || 'neutral'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Music Dashboard - Only show if connected */}
          {spotifyConnected && (
            <>
              {/* Current Track */}
              {currentTrack && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Headphones className="h-5 w-5" />
                      Now Playing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                        <Music className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{currentTrack.name}</h3>
                        <p className="text-muted-foreground">{currentTrack.artist}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Mood:</span>
                            <span className={`text-sm font-medium ${getMoodColor(currentTrack.valence)}`}>
                              {getMoodEmoji(currentTrack.valence > 0.7 ? 'happy' : currentTrack.valence > 0.5 ? 'neutral' : 'sad')} 
                              {(currentTrack.valence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Energy:</span>
                            <span className="text-sm font-medium">{(currentTrack.energy * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm">
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mood Analysis */}
              {moodAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Music Mood Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl mb-2">{getMoodEmoji(moodAnalysis.mood)}</div>
                        <div className="font-semibold capitalize">{moodAnalysis.mood}</div>
                        <div className="text-sm text-muted-foreground">Overall Mood</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {(moodAnalysis.averageValence * 100).toFixed(0)}%
                        </div>
                        <div className="font-semibold">Positivity</div>
                        <div className="text-sm text-muted-foreground">Average Valence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-2">{moodAnalysis.totalTracks}</div>
                        <div className="font-semibold">Tracks Analyzed</div>
                        <div className="text-sm text-muted-foreground">Recent Listening</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Tracks */}
              {recentTracks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Tracks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentTracks.map((track, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-muted-foreground">{track.artist}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${getMoodColor(track.valence)}`}>
                              {getMoodEmoji(track.valence > 0.7 ? 'happy' : track.valence > 0.5 ? 'neutral' : 'sad')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {(track.valence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plant Impact */}
              {currentPlant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Plant Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Music Mood Influence</span>
                        <Badge className="capitalize">
                          {currentPlant.current_mood_influence || 'neutral'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Spotify Mood Score</span>
                          <span>{((currentPlant.spotify_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.spotify_mood_score || 0.5) * 100} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Combined Mood Score</span>
                          <span>{((currentPlant.combined_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.combined_mood_score || 0.5) * 100} className="h-2" />
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Tip:</strong> Listening to upbeat, positive music helps boost your plant's mood and growth! 
                          Your recent music has a {((moodAnalysis?.averageValence || 0.5) * 100).toFixed(0)}% positivity rating.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🎵 Music Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    We analyze the mood of your recently played tracks using Spotify's audio features like valence (positivity) and energy.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🌱 Plant Growth</h4>
                  <p className="text-sm text-muted-foreground">
                    Positive, upbeat music contributes to your plant's happiness and growth, while sad music may slow its progress.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🔄 Real-time Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Your plant's mood updates automatically based on your listening habits, creating a living reflection of your music taste.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">📊 Combined Influence</h4>
                  <p className="text-sm text-muted-foreground">
                    Music mood combines with your journal entries to create a comprehensive mood score that influences your plant's appearance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MusicPage 