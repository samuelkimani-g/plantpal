"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { spotifyService } from "../../services/spotify"
import { offlineMusicService } from "../../services/offlineMusic"
import { authAPI, plantAPI } from "../../services/api"
import OfflineMusicWidget from "../../components/OfflineMusicWidget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Music, Play, Pause, Heart, Leaf, Sparkles, LinkIcon, Unlink, RefreshCw, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function SpotifyIntegration() {
  const { user, updateProfile } = useAuth()
  const { plants, currentPlant } = usePlant()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [listeningData, setListeningData] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already connected
    setIsConnected(spotifyService.isConnected() || user?.spotify_connected)

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")
    const error = urlParams.get("error")
    const state = urlParams.get("state") // Contains return path

    if (code) {
      handleSpotifyCallback(code, state)
    } else if (error) {
      setError(`Spotify authorization failed: ${error}`)
    }
  }, [user])

  useEffect(() => {
    let interval
    if (isConnected) {
      // Update current track every 10 seconds for real-time display
      interval = setInterval(() => {
        updateCurrentTrack()
        if (currentPlant) {
          updateListeningData()
        }
      }, 10000)

      // Initial update
      updateCurrentTrack()
      if (currentPlant) {
        updateListeningData()
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isConnected, currentPlant])

  const handleSpotifyCallback = async (code, state) => {
    setIsLoading(true)
    try {
      // Exchange code for tokens
      const tokenData = await spotifyService.getAccessToken(code)

      // Store refresh token in backend
      await authAPI.post("/spotify/", {
        spotify_refresh_token: tokenData.refresh_token,
      })

      setIsConnected(true)
      setError(null)

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)

      // Redirect to the previous page or saved tab
      const returnPath = state || localStorage.getItem("spotify_return_path") || "/dashboard"
      localStorage.removeItem("spotify_return_path") // Clean up
      navigate(returnPath)
    } catch (err) {
      console.error("Spotify callback error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const connectSpotify = () => {
    // Save current location to return after auth
    const currentPath = window.location.pathname
    localStorage.setItem("spotify_return_path", currentPath)
    
    // Get auth URL with state parameter
    const authUrl = spotifyService.getAuthUrl(currentPath)
    window.location.href = authUrl
  }

  const disconnectSpotify = async () => {
    try {
      setIsLoading(true)
      spotifyService.disconnect()

      // Remove from backend
      await authAPI.delete("/spotify/")

      setIsConnected(false)
      setListeningData(null)
    } catch (err) {
      console.error("Disconnect error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCurrentTrack = async () => {
    try {
      const track = await spotifyService.getCurrentTrack()
      setCurrentTrack(track)
      setLastUpdate(new Date())
      
      // Add to offline tracking if we got track info
      if (track) {
        offlineMusicService.addTrackToSession({
          name: track.name,
          artists: track.artists,
          album: track.album,
          albumArt: track.albumArt,
          spotifyTrack: true
        })
      }
    } catch (err) {
      console.error("Error getting current track:", err)
      // Don't show error for API restrictions
      if (err.message.includes("403") || err.message.includes("429")) {
        return
      }
    }
  }

  const updateListeningData = async () => {
    try {
      const sessionData = await spotifyService.getDetailedListeningSession()

      if (sessionData && currentPlant) {
        setListeningData(sessionData)
        setLastUpdate(new Date())

        // Apply music effect to plant if there's been significant listening time
        if (sessionData.minutesListened >= 5) {
          await applyMusicToPlan(sessionData)
        }
      }
    } catch (err) {
      console.error("Error updating listening data:", err)
      // Don't show error for API rate limits or temporary issues
      if (err.message.includes("429") || err.message.includes("502") || err.message.includes("403")) {
        return
      }
      setError(err.message)
    }
  }

  const applyMusicToPlan = async (sessionData) => {
    try {
      // Create plant log for music effect
      await plantAPI.createLog({
        plant: currentPlant.id,
        activity_type: "music_boost",
        note: `Music mood: ${sessionData.moodScore.toFixed(2)}, Minutes: ${sessionData.minutesListened}`,
        value: sessionData.moodScore,
        growth_impact: sessionData.moodScore * sessionData.minutesListened * 0.1,
      })

      // The backend will handle the actual plant growth calculation
    } catch (err) {
      console.error("Error applying music to plant:", err)
    }
  }

  const getMoodDescription = (score) => {
    if (score >= 0.8) return { text: "Euphoric", color: "text-pink-500", emoji: "🎉" }
    if (score >= 0.6) return { text: "Happy", color: "text-green-500", emoji: "😊" }
    if (score >= 0.4) return { text: "Chill", color: "text-blue-500", emoji: "😌" }
    if (score >= 0.2) return { text: "Mellow", color: "text-yellow-500", emoji: "🤔" }
    return { text: "Melancholy", color: "text-purple-500", emoji: "😔" }
  }

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Connect to Spotify</CardTitle>
          <CardDescription>
            Let your music nurture your virtual plants! Connect Spotify to let your listening habits influence your
            plant's growth and mood.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <Button
              onClick={connectSpotify}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg"
            >
              {isLoading ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <LinkIcon className="h-5 w-5 mr-2" />}
              Connect Spotify
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center p-4">
              <Heart className="h-6 w-6 mb-2 text-red-400" />
              <span>Mood Detection</span>
              <p className="text-xs">Analyze the emotional tone of your music</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Leaf className="h-6 w-6 mb-2 text-green-400" />
              <span>Plant Growth</span>
              <p className="text-xs">Happy music helps your plants thrive</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <Sparkles className="h-6 w-6 mb-2 text-yellow-400" />
              <span>Real-time Sync</span>
              <p className="text-xs">Your current listening affects your plant instantly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Spotify Connected</CardTitle>
                <CardDescription>Your music is nurturing your plants</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={disconnectSpotify} disabled={isLoading}>
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Currently Playing Track */}
      {currentTrack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500 animate-pulse" />
              Now Playing
            </CardTitle>
            <CardDescription>Your current Spotify track</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
              {currentTrack.albumArt && (
                <img
                  src={currentTrack.albumArt}
                  alt={currentTrack.album}
                  className="w-16 h-16 rounded-lg shadow-md"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{currentTrack.name}</h3>
                <p className="text-muted-foreground truncate">{currentTrack.artists}</p>
                <p className="text-sm text-muted-foreground truncate">{currentTrack.album}</p>
                {currentTrack.progress_ms && currentTrack.duration_ms && (
                  <div className="mt-2">
                    <Progress 
                      value={(currentTrack.progress_ms / currentTrack.duration_ms) * 100} 
                      className="h-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{Math.floor(currentTrack.progress_ms / 60000)}:{String(Math.floor((currentTrack.progress_ms % 60000) / 1000)).padStart(2, '0')}</span>
                      <span>{Math.floor(currentTrack.duration_ms / 60000)}:{String(Math.floor((currentTrack.duration_ms % 60000) / 1000)).padStart(2, '0')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Listening Data */}
      {listeningData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {listeningData.isCurrentlyPlaying ? (
                <Play className="h-5 w-5 text-green-500" />
              ) : (
                <Pause className="h-5 w-5 text-gray-400" />
              )}
              Music Mood Analysis
            </CardTitle>
            <CardDescription>How your recent listening session affects your plants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mood Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Music Mood</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const mood = getMoodDescription(listeningData.moodScore)
                    return (
                      <>
                        <span className="text-lg">{mood.emoji}</span>
                        <Badge className={mood.color}>{mood.text}</Badge>
                      </>
                    )
                  })()}
                </div>
              </div>
              <Progress value={listeningData.moodScore * 100} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>😔 Sad</span>
                <span>😊 Happy</span>
              </div>
            </div>

            {/* Listening Time */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Minutes Listened</p>
                <p className="text-xs text-muted-foreground">In the last hour</p>
              </div>
              <div className="text-2xl font-bold text-emerald-600">{listeningData.minutesListened}</div>
            </div>

            {/* Recent Tracks */}
            {listeningData.tracks && listeningData.tracks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Recent Tracks</h4>
                <div className="space-y-2">
                  {listeningData.tracks.slice(0, 3).map((track, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                      {track.album?.images?.[2] && (
                        <img
                          src={track.album.images[2].url || "/placeholder.svg"}
                          alt={track.album.name}
                          className="w-10 h-10 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artists?.map((artist) => artist.name).join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plant Impact */}
            {currentPlant && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Impact on {currentPlant.name}</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Your {getMoodDescription(listeningData.moodScore).text.toLowerCase()} music is
                  {listeningData.moodScore > 0.5 ? " boosting" : " gently affecting"} your plant's growth!
                </p>
              </div>
            )}

            {lastUpdate && (
              <p className="text-xs text-muted-foreground text-center">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

              {/* Offline Music Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-600" />
              Offline Music Tracking
            </CardTitle>
            <CardDescription>
              Track your music listening even when Spotify API is restricted or you're offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OfflineMusicWidget />
          </CardContent>
        </Card>

        {/* No Current Activity */}
        {!listeningData && (
          <Card>
            <CardContent className="text-center py-8">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No recent Spotify activity</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use the offline tracker above to manually add songs that affect your plants!
              </p>
              <Button onClick={() => { updateCurrentTrack(); updateListeningData(); }} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Check Spotify
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
