import { useState, useEffect } from "react"
import { offlineMusicService } from "../services/offlineMusic"
import { usePlant } from "../context/PlantContext"
import { plantAPI } from "../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Music, Play, Pause, Plus, RefreshCw, Clock, Heart } from "lucide-react"

export default function OfflineMusicWidget() {
  const { currentPlant } = usePlant()
  const [sessionSummary, setSessionSummary] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [trackName, setTrackName] = useState("")
  const [artist, setArtist] = useState("")
  const [mood, setMood] = useState(0.5)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)

  useEffect(() => {
    // Load current session on mount
    updateSessionSummary()
    
    // Update every 30 seconds
    const interval = setInterval(updateSessionSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  const updateSessionSummary = () => {
    const summary = offlineMusicService.getSessionSummary()
    setSessionSummary(summary)
    setIsTracking(summary?.isActive || false)
  }

  const startSession = () => {
    offlineMusicService.startOfflineSession()
    setIsTracking(true)
    updateSessionSummary()
  }

  const stopSession = () => {
    offlineMusicService.stopSession()
    setIsTracking(false)
    updateSessionSummary()
  }

  const addTrack = () => {
    if (!trackName.trim()) return

    offlineMusicService.addManualTrack(trackName, artist || "Unknown Artist", mood)
    
    // Clear form
    setTrackName("")
    setArtist("")
    setMood(0.5)
    setShowAddTrack(false)
    
    updateSessionSummary()
  }

  const syncWithPlant = async () => {
    if (!currentPlant) return

    setIsSyncing(true)
    setSyncStatus(null)

    try {
      const result = await offlineMusicService.syncWithPlant(plantAPI, currentPlant.id)
      
      if (result.success) {
        setSyncStatus({
          type: 'success',
          message: `✅ Synced ${result.synced} music sessions with ${currentPlant.name}!`
        })
        updateSessionSummary()
      }
    } catch (error) {
      console.error("Sync error:", error)
      setSyncStatus({
        type: 'error',
        message: `❌ Sync failed: ${error.message}`
      })
    } finally {
      setIsSyncing(false)
      
      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

  const getMoodColor = (moodScore) => {
    if (moodScore >= 0.7) return "text-green-600"
    if (moodScore >= 0.5) return "text-blue-600"
    if (moodScore >= 0.3) return "text-yellow-600"
    return "text-purple-600"
  }

  const getMoodDescription = (score) => {
    if (score >= 0.8) return { text: "Euphoric", emoji: "🎉" }
    if (score >= 0.6) return { text: "Happy", emoji: "😊" }
    if (score >= 0.4) return { text: "Chill", emoji: "😌" }
    if (score >= 0.2) return { text: "Mellow", emoji: "🤔" }
    return { text: "Melancholy", emoji: "😔" }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Music className="h-5 w-5 text-purple-600" />
          Offline Music Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Session Status */}
        {sessionSummary ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isTracking ? (
                  <Play className="h-4 w-4 text-green-500 animate-pulse" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">
                  {isTracking ? "Active Session" : "Last Session"}
                </span>
              </div>
              <Badge className={getMoodColor(sessionSummary.mood)}>
                {(() => {
                  const mood = getMoodDescription(sessionSummary.mood)
                  return `${mood.emoji} ${mood.text}`
                })()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{sessionSummary.minutes}</div>
                <div className="text-xs text-blue-700">minutes</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{sessionSummary.tracks}</div>
                <div className="text-xs text-green-700">tracks</div>
              </div>
            </div>

            {/* Mood Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Session Mood</span>
                <span className={getMoodColor(sessionSummary.mood)}>
                  {Math.round(sessionSummary.mood * 100)}%
                </span>
              </div>
              <Progress value={sessionSummary.mood * 100} className="h-2" />
            </div>

            {/* Last Track */}
            {sessionSummary.lastTrack && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm font-medium truncate">{sessionSummary.lastTrack.name}</div>
                <div className="text-xs text-muted-foreground truncate">{sessionSummary.lastTrack.artists}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No music session active</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={startSession} className="flex-1" variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <Button onClick={stopSession} className="flex-1" variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Stop Session
            </Button>
          )}
          
          <Button 
            onClick={() => setShowAddTrack(!showAddTrack)} 
            variant="outline"
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Track Form */}
        {showAddTrack && (
          <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="font-medium text-purple-800 dark:text-purple-200">Add Track Manually</h4>
            
            <Input
              placeholder="Song name"
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              className="text-sm"
            />
            
            <Input
              placeholder="Artist (optional)"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="text-sm"
            />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mood</span>
                <span className={getMoodColor(mood)}>
                  {getMoodDescription(mood).emoji} {Math.round(mood * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={mood}
                onChange={(e) => setMood(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addTrack} disabled={!trackName.trim()} className="flex-1" size="sm">
                Add Track
              </Button>
              <Button onClick={() => setShowAddTrack(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <div className={`p-3 rounded-lg text-sm ${
            syncStatus.type === 'success' 
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
          }`}>
            {syncStatus.message}
          </div>
        )}

        {/* Sync Button */}
        {currentPlant && (
          <Button 
            onClick={syncWithPlant} 
            disabled={isSyncing || !sessionSummary}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Sync with {currentPlant.name}
              </>
            )}
          </Button>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center">
          Track music offline and sync with your plant when online
        </div>
      </CardContent>
    </Card>
  )
} 