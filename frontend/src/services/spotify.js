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
  calculateMoodScore(audioFeatures) {
    if (!audioFeatures || audioFeatures.length === 0) {
      return 0.5 // Neutral mood
    }

    // Average the features across all tracks
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

    if (avgFeatures.count === 0) {
      return 0.5 // Neutral mood
    }

    // Calculate averages
    const valence = avgFeatures.valence / avgFeatures.count
    const energy = avgFeatures.energy / avgFeatures.count
    const danceability = avgFeatures.danceability / avgFeatures.count

    // Weighted mood score (valence is most important for mood)
    const moodScore = valence * 0.6 + energy * 0.25 + danceability * 0.15

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, moodScore))
  }

  // Get listening session data for plant growth
  async getListeningSession() {
    try {
      const [recentTracks, currentTrack] = await Promise.all([
        this.getRecentlyPlayed(10),
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

      // Get audio features for mood calculation
      const trackIds = tracks.map((track) => track.id).filter(Boolean)
      const audioFeatures = await this.getAudioFeatures(trackIds)

      const moodScore = this.calculateMoodScore(audioFeatures.audio_features)
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
      const [currentTrack, recentTracks] = await Promise.all([this.getCurrentTrack(), this.getRecentTracks(10)])

      if (!recentTracks || recentTracks.length === 0) {
        return null
      }

      // Get audio features for all tracks
      const trackIds = recentTracks.map((track) => track.id).filter(Boolean)
      const audioFeatures = await this.getAudioFeatures(trackIds)

      // Calculate comprehensive mood metrics
      const moodMetrics = this.calculateMoodMetrics(audioFeatures)

      // Calculate listening time in the last hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentListening = recentTracks.filter((track) => new Date(track.played_at).getTime() > oneHourAgo)

      return {
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
    } catch (error) {
      console.error("Error getting detailed listening session:", error)
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
  calculateMoodMetrics(audioFeatures) {
    if (!audioFeatures || audioFeatures.length === 0) {
      return {
        overallMood: 0.5,
        energy: 0.5,
        valence: 0.5,
        danceability: 0.5,
      }
    }

    const validFeatures = audioFeatures.filter((f) => f !== null)

    if (validFeatures.length === 0) {
      return {
        overallMood: 0.5,
        energy: 0.5,
        valence: 0.5,
        danceability: 0.5,
      }
    }

    const avgValence = validFeatures.reduce((sum, f) => sum + f.valence, 0) / validFeatures.length
    const avgEnergy = validFeatures.reduce((sum, f) => sum + f.energy, 0) / validFeatures.length
    const avgDanceability = validFeatures.reduce((sum, f) => sum + f.danceability, 0) / validFeatures.length

    // Combine metrics for overall mood (weighted toward valence)
    const overallMood = avgValence * 0.6 + avgEnergy * 0.3 + avgDanceability * 0.1

    return {
      overallMood: Math.max(0, Math.min(1, overallMood)),
      energy: avgEnergy,
      valence: avgValence,
      danceability: avgDanceability,
    }
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