console.log("SPOTIFY_CLIENT_ID:", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
console.log("ALL ENV VARS:", import.meta.env);

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Use the current window location for the redirect URI if not specified
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/music`;
const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
  "user-library-read",
].join(" ")

export class SpotifyService {
  constructor() {
    this.clientId = SPOTIFY_CLIENT_ID
    this.redirectUri = SPOTIFY_REDIRECT_URI
    this.scopes = SPOTIFY_SCOPES
    this.lastSessionUpdate = 0
    this.cachedSession = null
    this.rateLimitDelay = 1000 // 1 second between requests
    this.lastRequestTime = 0
  }

  // Generate Spotify authorization URL
  getAuthUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      show_dialog: "true",
    })
    
    // Add state parameter if provided
    if (state) {
      params.append("state", state)
    }

    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async getAccessToken(code) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error_description || "Failed to get access token")
    }

    // Store tokens
    localStorage.setItem("spotify_access_token", data.access_token)
    localStorage.setItem("spotify_refresh_token", data.refresh_token)
    localStorage.setItem("spotify_expires_at", Date.now() + data.expires_in * 1000)

    return data
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error_description || "Failed to refresh token")
    }

    // Update stored tokens
    localStorage.setItem("spotify_access_token", data.access_token)
    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token)
    }
    localStorage.setItem("spotify_expires_at", Date.now() + data.expires_in * 1000)

    return data
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken() {
    const accessToken = localStorage.getItem("spotify_access_token")
    const refreshToken = localStorage.getItem("spotify_refresh_token")
    const expiresAt = localStorage.getItem("spotify_expires_at")

    if (!accessToken || !refreshToken) {
      throw new Error("No Spotify tokens found")
    }

    // Check if token is expired (with 5 minute buffer)
    if (Date.now() >= Number.parseInt(expiresAt) - 300000) {
      console.log("Refreshing Spotify token...")
      await this.refreshAccessToken(refreshToken)
      return localStorage.getItem("spotify_access_token")
    }

    return accessToken
  }

  // Make authenticated Spotify API request
  async apiRequest(endpoint, options = {}) {
    // Rate limiting: ensure minimum delay between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()

    const accessToken = await this.getValidAccessToken()

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid, try refreshing once more
        const refreshToken = localStorage.getItem("spotify_refresh_token")
        if (refreshToken) {
          await this.refreshAccessToken(refreshToken)
          const newAccessToken = localStorage.getItem("spotify_access_token")

          // Retry request with new token
          const retryResponse = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              "Content-Type": "application/json",
              ...options.headers,
            },
          })

          if (!retryResponse.ok) {
            throw new Error(`Spotify API error: ${retryResponse.status}`)
          }

          return retryResponse.json()
        }
      } else if (response.status === 403) {
        // Handle development mode restrictions
        console.warn('Spotify API 403: Development mode restrictions. Add user to your Spotify app or request quota extension.')
        throw new Error('Spotify API access restricted. Please check app permissions.')
      } else if (response.status === 429) {
        // Rate limit exceeded
        console.warn('Spotify API rate limit exceeded. Please try again later.')
        throw new Error('Too many requests. Please wait before trying again.')
      }
      throw new Error(`Spotify API error: ${response.status}`)
    }

    return response.json()
  }

  // Get currently playing track
  async getCurrentlyPlaying() {
    return this.apiRequest("/me/player/currently-playing")
  }

  // Get recently played tracks
  async getRecentlyPlayed(limit = 20) {
    return this.apiRequest(`/me/player/recently-played?limit=${limit}`)
  }

  // Get user's top tracks (for mood analysis)
  async getTopTracks(timeRange = "short_term", limit = 20) {
    return this.apiRequest(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`)
  }

  // Get audio features for tracks (for mood calculation)
  async getAudioFeatures(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds.join(",") : trackIds
    return this.apiRequest(`/audio-features?ids=${ids}`)
  }

  // Calculate mood score from audio features
  calculateMoodScore(audioFeatures, trackInfo = null) {
    let spotifyMood = 0.5 // Default neutral
    
    // Try to get Spotify audio features first
    if (audioFeatures && audioFeatures.length > 0) {
      const avgFeatures = audioFeatures.reduce(
        (acc, features) => {
          if (!features) return acc // Skip null features

          return {
            valence: acc.valence + (features.valence || 0.5),
            energy: acc.energy + (features.energy || 0.5),
            danceability: acc.danceability + (features.danceability || 0.5),
            count: acc.count + 1,
          }
        },
        { valence: 0, energy: 0, danceability: 0, count: 0 },
      )

      if (avgFeatures.count > 0) {
        // Calculate averages
        const valence = avgFeatures.valence / avgFeatures.count
        const energy = avgFeatures.energy / avgFeatures.count
        const danceability = avgFeatures.danceability / avgFeatures.count

        // Weighted mood score (valence is most important for mood)
        spotifyMood = valence * 0.6 + energy * 0.25 + danceability * 0.15
      }
    }
    
    // If we have track info, use enhanced text-based mood detection as fallback/enhancement
    if (trackInfo) {
      const { offlineMusicService } = require('./offlineMusic')
      const textMood = offlineMusicService.estimateMoodFromTrack(trackInfo)
      
      // If we have Spotify data, blend it with text analysis (70% Spotify, 30% text)
      // If no Spotify data, use 100% text analysis
      if (audioFeatures && audioFeatures.length > 0) {
        const blendedMood = spotifyMood * 0.7 + textMood * 0.3
        console.log(`🎵 Blended mood: Spotify (${spotifyMood.toFixed(2)}) + Text (${textMood.toFixed(2)}) = ${blendedMood.toFixed(2)}`)
        return Math.max(0, Math.min(1, blendedMood))
      } else {
        console.log(`🎵 Using text-based mood analysis: ${textMood.toFixed(2)}`)
        return textMood
      }
    }

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, spotifyMood))
  }

  // Get listening session data for plant growth
  async getListeningSession() {
    try {
      // Use cached data if available to reduce API calls
      if (this.cachedSession && (Date.now() - this.lastSessionUpdate) < 120000) {
        return {
          moodScore: this.cachedSession.moodScore,
          minutesListened: this.cachedSession.minutesListened,
          tracks: this.cachedSession.recentTracks || [],
          isCurrentlyPlaying: this.cachedSession.isCurrentlyPlaying,
        }
      }

      const [recentTracks, currentTrack] = await Promise.all([
        this.getRecentlyPlayed(5), // Reduced from 10 to 5
        this.getCurrentlyPlaying().catch(() => null),
      ])

      const tracks = []
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Add recent tracks from the last hour
      if (recentTracks?.items) {
        tracks.push(
          ...recentTracks.items
            .filter((item) => new Date(item.played_at).getTime() > oneHourAgo)
            .map((item) => item.track),
        )
      }

      // Add currently playing track if exists
      if (currentTrack?.item && currentTrack.is_playing) {
        tracks.push(currentTrack.item)
      }

      if (tracks.length === 0) {
        return null
      }

      // Get audio features for mood calculation (with error handling)
      let moodScore = 0.5 // Default neutral mood
      try {
        const trackIds = tracks.slice(0, 5).map((track) => track.id).filter(Boolean) // Limit to 5 tracks
        const audioFeatures = await this.getAudioFeatures(trackIds)
        moodScore = this.calculateMoodScore(audioFeatures.audio_features, tracks.slice(0, 5))
      } catch (error) {
        console.warn("Could not fetch audio features for listening session, using text-based mood analysis:", error.message)
        // Use text-based mood analysis as fallback
        moodScore = this.calculateMoodScore(null, tracks.slice(0, 5))
      }

      const minutesListened = Math.min(tracks.length * 3, 60) // Estimate minutes, cap at 60

      return {
        moodScore,
        minutesListened,
        tracks: tracks.slice(0, 5), // Return up to 5 tracks for display
        isCurrentlyPlaying: currentTrack?.is_playing || false,
      }
    } catch (error) {
      console.error("Error getting listening session:", error)
      return null
    }
  }

  // Get detailed listening session with mood analysis
  async getDetailedListeningSession() {
    try {
      // Return cached data if recent (within 2 minutes)
      const now = Date.now()
      if (this.cachedSession && (now - this.lastSessionUpdate) < 120000) {
        console.log("Returning cached Spotify session data")
        return this.cachedSession
      }

      const [currentTrack, recentTracks] = await Promise.all([this.getCurrentTrack(), this.getRecentTracks(5)]) // Reduced from 10 to 5

      if (!recentTracks || recentTracks.length === 0) {
        return null
      }

      // Limit audio features request to max 5 tracks to reduce API calls
      const trackIds = recentTracks.slice(0, 5).map((track) => track.id).filter(Boolean)
      
      let moodMetrics = { overallMood: 0.5, energy: 0.5, valence: 0.5, danceability: 0.5 }
      
      try {
        const audioFeatures = await this.getAudioFeatures(trackIds)
        moodMetrics = this.calculateMoodMetrics(audioFeatures.audio_features, recentTracks)
      } catch (error) {
        console.warn("Could not fetch audio features, using text-based mood analysis:", error.message)
        // Use text-based mood analysis as fallback
        moodMetrics = this.calculateMoodMetrics(null, recentTracks)
      }

      // Calculate listening time in the last hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentListening = recentTracks.filter((track) => new Date(track.played_at).getTime() > oneHourAgo)

      const sessionData = {
        isCurrentlyPlaying: !!currentTrack,
        currentTrack,
        recentTracks: recentTracks.slice(0, 5),
        minutesListened: recentListening.length * 3, // Approximate
        moodScore: moodMetrics.overallMood,
        energyLevel: moodMetrics.energy,
        valence: moodMetrics.valence,
        danceability: moodMetrics.danceability,
        moodDescription: this.getMoodDescription(moodMetrics.overallMood),
        lastUpdated: new Date().toISOString(),
      }

      // Cache the session data
      this.cachedSession = sessionData
      this.lastSessionUpdate = now

      return sessionData
    } catch (error) {
      console.error("Error getting detailed listening session:", error)
      
      // Return cached data if available, even if stale
      if (this.cachedSession) {
        console.log("Returning stale cached data due to API error")
        return this.cachedSession
      }
      
      throw error
    }
  }

  // Get current track
  async getCurrentTrack() {
    try {
      const response = await this.apiRequest("/me/player/currently-playing")

      if (!response || !response.item) {
        return null
      }

      return {
        id: response.item.id,
        name: response.item.name,
        artists: response.item.artists.map((artist) => artist.name).join(", "),
        album: response.item.album.name,
        albumArt: response.item.album.images[0]?.url,
        duration_ms: response.item.duration_ms,
        progress_ms: response.progress_ms,
      }
    } catch (error) {
      console.error("Error getting current track:", error)
      return null
    }
  }

  // Get recent tracks
  async getRecentTracks(limit = 5) {
    try {
      const response = await this.apiRequest(`/me/player/recently-played?limit=${limit}`)

      if (!response || !response.items) {
        return []
      }

      return response.items.map((item) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((artist) => artist.name).join(", "),
        album: item.track.album.name,
        albumArt: item.track.album.images[0]?.url,
        played_at: item.played_at,
      }))
    } catch (error) {
      console.error("Error getting recent tracks:", error)
      return []
    }
  }

  // Calculate mood metrics from audio features
  calculateMoodMetrics(audioFeatures, trackInfo = null) {
    let spotifyMetrics = {
      overallMood: 0.5,
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
    }

    // Try to get Spotify audio features
    if (audioFeatures && audioFeatures.length > 0) {
      const validFeatures = audioFeatures.filter((f) => f !== null)

      if (validFeatures.length > 0) {
        const avgValence = validFeatures.reduce((sum, f) => sum + f.valence, 0) / validFeatures.length
        const avgEnergy = validFeatures.reduce((sum, f) => sum + f.energy, 0) / validFeatures.length
        const avgDanceability = validFeatures.reduce((sum, f) => sum + f.danceability, 0) / validFeatures.length

        // Combine metrics for overall mood (weighted toward valence)
        const overallMood = avgValence * 0.6 + avgEnergy * 0.3 + avgDanceability * 0.1

        spotifyMetrics = {
          overallMood: Math.max(0, Math.min(1, overallMood)),
          energy: avgEnergy,
          valence: avgValence,
          danceability: avgDanceability,
        }
      }
    }

    // If we have track info, enhance with text-based analysis
    if (trackInfo && trackInfo.length > 0) {
      const { offlineMusicService } = require('./offlineMusic')
      
      // Calculate text-based mood for all tracks
      const textMoods = trackInfo.map(track => offlineMusicService.estimateMoodFromTrack(track))
      const avgTextMood = textMoods.reduce((sum, mood) => sum + mood, 0) / textMoods.length
      
      // Blend Spotify data with text analysis if available
      if (audioFeatures && audioFeatures.length > 0) {
        // 70% Spotify, 30% text analysis
        const blendedMood = spotifyMetrics.overallMood * 0.7 + avgTextMood * 0.3
        console.log(`🎵 Enhanced mood analysis: Spotify (${spotifyMetrics.overallMood.toFixed(2)}) + Text (${avgTextMood.toFixed(2)}) = ${blendedMood.toFixed(2)}`)
        
        return {
          ...spotifyMetrics,
          overallMood: Math.max(0, Math.min(1, blendedMood)),
        }
      } else {
        // Use text analysis only
        console.log(`🎵 Using text-based mood analysis for tracks: ${avgTextMood.toFixed(2)}`)
        
        return {
          overallMood: avgTextMood,
          energy: avgTextMood > 0.6 ? 0.7 : 0.4, // Estimate energy from mood
          valence: avgTextMood,
          danceability: avgTextMood > 0.5 ? 0.6 : 0.3, // Estimate danceability
        }
      }
    }

    return spotifyMetrics
  }

  // Get mood description
  getMoodDescription(moodScore) {
    if (moodScore >= 0.8) return "euphoric"
    if (moodScore >= 0.6) return "happy"
    if (moodScore >= 0.4) return "neutral"
    if (moodScore >= 0.2) return "melancholy"
    return "sad"
  }

  // Check if user is connected to Spotify
  isConnected() {
    return !!(localStorage.getItem("spotify_access_token") && localStorage.getItem("spotify_refresh_token"))
  }

  // Disconnect from Spotify
  disconnect() {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_expires_at")
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService()
export default SpotifyService