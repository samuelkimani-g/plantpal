// Spotify Web API configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`
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
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      show_dialog: "true",
    })

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
        client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET, // Note: In production, this should be handled by backend
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
