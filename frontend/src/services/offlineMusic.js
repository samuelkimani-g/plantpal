// Offline Music Tracking Service
// Stores listening sessions locally and syncs with plant when online

class OfflineMusicService {
  constructor() {
    this.storageKey = 'plantpal_offline_music'
    this.sessionKey = 'plantpal_current_session'
    this.isTracking = false
    this.currentSession = null
    this.trackingInterval = null
  }

  // Start tracking offline music session
  startOfflineSession(trackInfo = null) {
    console.log("🎵 Starting offline music session...")
    
    const session = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      tracks: trackInfo ? [trackInfo] : [],
      totalMinutes: 0,
      averageMood: 0.5, // Default neutral mood
      isActive: true,
      lastUpdate: new Date().toISOString()
    }

    this.currentSession = session
    this.isTracking = true
    
    // Save to localStorage
    localStorage.setItem(this.sessionKey, JSON.stringify(session))
    
    // Start tracking interval (every 30 seconds)
    this.trackingInterval = setInterval(() => {
      this.updateCurrentSession()
    }, 30000)

    return session
  }

  // Add track to current session
  addTrackToSession(trackInfo) {
    if (!this.currentSession) {
      this.startOfflineSession(trackInfo)
      return
    }

    console.log("🎵 Adding track to offline session:", trackInfo.name)
    
    this.currentSession.tracks.push({
      ...trackInfo,
      playedAt: new Date().toISOString(),
      duration: 3 // Estimate 3 minutes per track
    })

    // Update mood based on track name/genre heuristics
    const estimatedMood = this.estimateMoodFromTrack(trackInfo)
    this.currentSession.averageMood = this.calculateAverageMood(estimatedMood)
    
    this.currentSession.lastUpdate = new Date().toISOString()
    localStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession))
  }

  // Update current session duration
  updateCurrentSession() {
    if (!this.currentSession) return

    const now = new Date()
    const startTime = new Date(this.currentSession.startTime)
    const minutesElapsed = Math.floor((now - startTime) / (1000 * 60))
    
    this.currentSession.totalMinutes = minutesElapsed
    this.currentSession.lastUpdate = now.toISOString()
    
    localStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession))
    
    console.log(`🎵 Offline session updated: ${minutesElapsed} minutes`)
  }

  // Stop current session
  stopSession() {
    if (!this.currentSession) return

    console.log("🎵 Stopping offline music session")
    
    this.currentSession.isActive = false
    this.currentSession.endTime = new Date().toISOString()
    
    // Save to offline sessions history
    this.saveToHistory(this.currentSession)
    
    // Clear current session
    localStorage.removeItem(this.sessionKey)
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
    }
    
    this.currentSession = null
    this.isTracking = false
  }

  // Save session to history
  saveToHistory(session) {
    const history = this.getOfflineHistory()
    history.push(session)
    
    // Keep only last 50 sessions
    if (history.length > 50) {
      history.splice(0, history.length - 50)
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(history))
  }

  // Get offline listening history
  getOfflineHistory() {
    try {
      const history = localStorage.getItem(this.storageKey)
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error("Error reading offline music history:", error)
      return []
    }
  }

  // Get current session
  getCurrentSession() {
    if (this.currentSession) return this.currentSession

    try {
      const stored = localStorage.getItem(this.sessionKey)
      if (stored) {
        this.currentSession = JSON.parse(stored)
        return this.currentSession
      }
    } catch (error) {
      console.error("Error reading current session:", error)
    }
    
    return null
  }

  // Estimate mood from track information
  estimateMoodFromTrack(trackInfo) {
    const trackName = (trackInfo.name || '').toLowerCase()
    const artist = (trackInfo.artists || trackInfo.artist || '').toLowerCase()
    
    // Happy/energetic keywords (weighted by strength)
    const happyWords = [
      { words: ['happy', 'joy', 'celebration', 'party', 'good vibes', 'sunshine', 'bright'], weight: 0.4 },
      { words: ['love', 'dance', 'good', 'fun', 'smile', 'laugh', 'blessed'], weight: 0.3 },
      { words: ['upbeat', 'positive', 'cheerful', 'amazing', 'wonderful'], weight: 0.2 }
    ]
    
    const energeticWords = [
      { words: ['energy', 'power', 'fire', 'electric', 'wild', 'pump', 'hype'], weight: 0.3 },
      { words: ['rock', 'beat', 'bass', 'drop', 'loud', 'intense', 'hardcore'], weight: 0.2 },
      { words: ['fast', 'speed', 'rush', 'adrenaline', 'extreme'], weight: 0.2 }
    ]
    
    // Sad/dark keywords (weighted by strength)
    const sadWords = [
      { words: ['sad!', 'depression', 'suicide', 'death', 'kill', 'die', 'pain'], weight: 0.5 },
      { words: ['sad', 'cry', 'tears', 'broken', 'hurt', 'lonely', 'empty'], weight: 0.4 },
      { words: ['goodbye', 'miss', 'lost', 'alone', 'dark', 'cold', 'numb'], weight: 0.3 },
      { words: ['sorry', 'regret', 'mistake', 'wrong', 'hate', 'angry'], weight: 0.2 }
    ]
    
    const mellowWords = [
      { words: ['slow', 'soft', 'gentle', 'calm', 'peaceful', 'quiet'], weight: 0.1 },
      { words: ['acoustic', 'piano', 'ballad', 'chill', 'relax'], weight: 0.1 }
    ]
    
    // Known sad/dark artists (XXXTentacion, Juice WRLD, etc.)
    const sadArtists = [
      { artists: ['xxxtentacion', 'juice wrld', 'lil peep', 'nothing,nowhere'], weight: 0.3 },
      { artists: ['billie eilish', 'the weeknd', 'radiohead', 'nine inch nails'], weight: 0.2 },
      { artists: ['nirvana', 'linkin park', 'my chemical romance'], weight: 0.2 }
    ]
    
    // Known happy/energetic artists
    const happyArtists = [
      { artists: ['pharrell williams', 'bruno mars', 'dua lipa', 'lizzo'], weight: 0.3 },
      { artists: ['justin timberlake', 'maroon 5', 'ed sheeran'], weight: 0.2 }
    ]
    
    let moodScore = 0.5 // Default neutral
    
    // Check for mood indicators in track name and artist
    const text = `${trackName} ${artist}`
    
    // Check sad words (strongest negative impact)
    sadWords.forEach(category => {
      category.words.forEach(word => {
        if (text.includes(word)) {
          moodScore -= category.weight
          console.log(`🎵 Detected sad word "${word}" in "${trackName}" - reducing mood by ${category.weight}`)
        }
      })
    })
    
    // Check happy words
    happyWords.forEach(category => {
      category.words.forEach(word => {
        if (text.includes(word)) {
          moodScore += category.weight
          console.log(`🎵 Detected happy word "${word}" in "${trackName}" - increasing mood by ${category.weight}`)
        }
      })
    })
    
    // Check energetic words
    energeticWords.forEach(category => {
      category.words.forEach(word => {
        if (text.includes(word)) {
          moodScore += category.weight
          console.log(`🎵 Detected energetic word "${word}" in "${trackName}" - increasing mood by ${category.weight}`)
        }
      })
    })
    
    // Check mellow words
    mellowWords.forEach(category => {
      category.words.forEach(word => {
        if (text.includes(word)) {
          moodScore -= category.weight
          console.log(`🎵 Detected mellow word "${word}" in "${trackName}" - reducing mood by ${category.weight}`)
        }
      })
    })
    
    // Check artist mood associations
    sadArtists.forEach(category => {
      category.artists.forEach(artistName => {
        if (artist.includes(artistName)) {
          moodScore -= category.weight
          console.log(`🎵 Detected sad artist "${artistName}" - reducing mood by ${category.weight}`)
        }
      })
    })
    
    happyArtists.forEach(category => {
      category.artists.forEach(artistName => {
        if (artist.includes(artistName)) {
          moodScore += category.weight
          console.log(`🎵 Detected happy artist "${artistName}" - increasing mood by ${category.weight}`)
        }
      })
    })
    
    // Special case for punctuation that indicates intensity
    if (trackName.includes('!') && (trackName.includes('sad') || trackName.includes('mad') || trackName.includes('angry'))) {
      moodScore -= 0.2
      console.log(`🎵 Detected intense punctuation in sad context - reducing mood by 0.2`)
    }
    
    // Clamp between 0 and 1
    const finalScore = Math.max(0, Math.min(1, moodScore))
    console.log(`🎵 Final mood score for "${trackName}" by ${artist}: ${finalScore.toFixed(2)}`)
    
    return finalScore
  }

  // Calculate average mood for session
  calculateAverageMood(newMood) {
    if (!this.currentSession || this.currentSession.tracks.length === 0) {
      return newMood
    }
    
    const currentAvg = this.currentSession.averageMood
    const trackCount = this.currentSession.tracks.length
    
    // Weighted average with new track
    return (currentAvg * trackCount + newMood) / (trackCount + 1)
  }

  // Sync offline sessions with plant when online
  async syncWithPlant(plantAPI, plantId) {
    const history = this.getOfflineHistory()
    const unsynced = history.filter(session => !session.synced)
    
    if (unsynced.length === 0) {
      console.log("🎵 No offline sessions to sync")
      return { success: true, synced: 0 }
    }

    console.log(`🎵 Syncing ${unsynced.length} offline music sessions...`)
    
    let syncedCount = 0
    
    for (const session of unsynced) {
      try {
        // Apply music effect to plant
        await plantAPI.createLog({
          plant: plantId,
          activity_type: "offline_music",
          note: `Offline music session: ${session.totalMinutes} min, mood: ${session.averageMood.toFixed(2)}`,
          value: session.averageMood,
          growth_impact: session.averageMood * session.totalMinutes * 0.05, // Smaller impact for offline
        })

        // Mark as synced
        session.synced = true
        session.syncedAt = new Date().toISOString()
        syncedCount++
        
      } catch (error) {
        console.error("Error syncing session:", error)
        break // Stop on first error
      }
    }

    // Update localStorage with synced sessions
    localStorage.setItem(this.storageKey, JSON.stringify(history))
    
    console.log(`🎵 Successfully synced ${syncedCount} offline sessions`)
    return { success: true, synced: syncedCount }
  }

  // Manual track entry for completely offline use
  addManualTrack(trackName, artist, estimatedMood = 0.5) {
    const trackInfo = {
      name: trackName,
      artists: artist,
      artist: artist,
      manual: true,
      estimatedMood
    }

    if (!this.currentSession) {
      this.startOfflineSession(trackInfo)
    } else {
      this.addTrackToSession(trackInfo)
    }

    return trackInfo
  }

  // Get session summary for display
  getSessionSummary() {
    const session = this.getCurrentSession()
    if (!session) return null

    return {
      isActive: session.isActive,
      minutes: session.totalMinutes,
      tracks: session.tracks.length,
      mood: session.averageMood,
      moodDescription: this.getMoodDescription(session.averageMood),
      lastTrack: session.tracks[session.tracks.length - 1] || null
    }
  }

  // Get mood description
  getMoodDescription(score) {
    if (score >= 0.8) return { text: "Euphoric", emoji: "🎉" }
    if (score >= 0.6) return { text: "Happy", emoji: "😊" }
    if (score >= 0.4) return { text: "Chill", emoji: "😌" }
    if (score >= 0.2) return { text: "Mellow", emoji: "🤔" }
    return { text: "Melancholy", emoji: "😔" }
  }

  // Clear all offline data
  clearOfflineData() {
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.sessionKey)
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval)
    }
    this.currentSession = null
    this.isTracking = false
    console.log("🎵 Cleared all offline music data")
  }
}

// Export singleton instance
export const offlineMusicService = new OfflineMusicService()
export default OfflineMusicService 