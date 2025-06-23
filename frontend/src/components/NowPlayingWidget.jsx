import { useState, useEffect } from "react"
import { spotifyService } from "../services/spotify"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Play } from "lucide-react"

export default function NowPlayingWidget() {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check if Spotify is connected
    setIsConnected(spotifyService.isConnected())

    if (spotifyService.isConnected()) {
      // Update current track immediately
      updateCurrentTrack()

      // Update every 15 seconds
      const interval = setInterval(updateCurrentTrack, 15000)
      return () => clearInterval(interval)
    }
  }, [])

  const updateCurrentTrack = async () => {
    try {
      const track = await spotifyService.getCurrentTrack()
      setCurrentTrack(track)
    } catch (err) {
      // Silently handle errors for this widget
      console.log("Now Playing widget: Could not fetch current track")
    }
  }

  if (!isConnected || !currentTrack) {
    return null
  }

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {currentTrack.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.album}
                className="w-12 h-12 rounded-md"
              />
            ) : (
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Play className="h-3 w-3 text-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Now Playing</span>
            </div>
            <p className="text-sm font-medium truncate">{currentTrack.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artists}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 