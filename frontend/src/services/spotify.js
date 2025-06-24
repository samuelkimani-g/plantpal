console.log("SPOTIFY_CLIENT_ID:", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
console.log("ALL ENV VARS:", import.meta.env);

// Import API service for backend calls
import { authAPI } from './api.js';

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
    this.backendMode = true // Use backend endpoints
    this.reconnectionAttempted = false // Prevent infinite reconnection loops
    this.reconnectionTimeout = null // Track reconnection timeout
  }

  // Get Spotify authorization URL from backend
  async getAuthUrl(state = null) {
    try {
      const response = await authAPI.post('/spotify/auth-url/', {});
      return response.data.auth_url;
    } catch (error) {
      console.error('Failed to get Spotify auth URL:', error);
      // Fallback to direct URL generation
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
  }

  // Exchange authorization code via backend
  async connectWithCode(code) {
    try {
      const response = await authAPI.post('/spotify/callback/', {
        code: code,
        redirect_uri: this.redirectUri
      });
      
      console.log('✅ Spotify connected via backend:', response);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to connect Spotify via backend:', error);
      throw error;
    }
  }

  // Check Spotify connection status via backend
  async getConnectionStatus() {
    try {
      // Use the default api instance for GET request since authAPI only supports POST/DELETE
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/accounts/spotify/status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to get Spotify status:', error);
      return { connected: false, is_expired: true };
    }
  }

  // Fetch valence data and update plant via backend
  async fetchValenceAndUpdatePlant() {
    try {
      const response = await authAPI.post('/spotify/fetch-valence/', {
        limit: 10
      });
      
      console.log('🎵 Valence data fetched and plant updated:', response);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch valence data:', error);
      throw error;
    }
  }

  // Disconnect Spotify via backend
  async disconnect() {
    try {
      const response = await authAPI.delete('/spotify/disconnect/', {});
      console.log('Spotify disconnected via backend:', response);
      return response.data;
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility (using localStorage for frontend-only features)
  
  // Exchange authorization code for access token (legacy - now uses backend)
  async getAccessToken(code) {
    // Use backend instead
    return this.connectWithCode(code);
  }

  // Refresh access token (legacy - now handled by backend)
  async refreshAccessToken(refreshToken) {
    // Backend handles token refresh automatically
    console.log('Token refresh is now handled by backend');
    return null;
  }

  // Get valid access token (legacy - now handled by backend)
  async getValidAccessToken() {
    const status = await this.getConnectionStatus();
    if (!status.connected || status.is_expired) {
      throw new Error("Spotify not connected or token expired");
    }
    return "backend_managed"; // Placeholder since backend manages tokens
  }

  // Make authenticated Spotify API request (legacy - now uses backend when possible)
  async apiRequest(endpoint, options = {}) {
    // For now, keep the original implementation for features not yet moved to backend
    // This allows gradual migration
    
    // Rate limiting: ensure minimum delay between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()

    // Check if we have locally stored tokens (for backward compatibility)
    const accessToken = localStorage.getItem("spotify_access_token")
    if (!accessToken) {
      throw new Error("No Spotify access token available - please reconnect via backend")
    }

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
        // Token might be invalid - suggest reconnection
        throw new Error("Spotify token expired - please reconnect")
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
  async getCurrentTrack() {
    try {
      const response = await this.apiRequest('GET', '/me/player/currently-playing');
      
      if (response.status === 401) {
        // Token expired - try reconnection once
        if (!this.reconnectionAttempted) {
          console.log('🔄 Token expired, attempting reconnection...');
          const reconnected = await this.attemptReconnection();
          if (reconnected) {
            // Retry the request once after successful reconnection
            return await this.apiRequest('GET', '/me/player/currently-playing');
          }
        }
        // If reconnection failed or already attempted, throw error
        throw new Error('Spotify token expired - please reconnect');
      }
      
      if (response.status === 204) {
        return null; // No track playing
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting current track:', error);
      throw error;
    }
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
      // Import dynamically to avoid circular dependencies
      const textMood = this.estimateMoodFromTrack(trackInfo)
      
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
        this.getCurrentTrack().catch(() => null),
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
      // Ensure connection before making API calls
      const isConnected = await this.ensureConnection();
      if (!isConnected) {
        console.log('❌ Spotify not connected, cannot fetch listening session');
        return null;
      }

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
      // Calculate text-based mood for all tracks
      const textMoods = trackInfo.map(track => this.estimateMoodFromTrack(track))
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

  // Estimate mood from track information (same as offlineMusic service)
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

  // Check if user is connected to Spotify (now uses backend)
  async isConnected() {
    try {
      const status = await this.getConnectionStatus();
      return status.connected && !status.is_expired;
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
      return false;
    }
  }

  // Attempt automatic reconnection if tokens are expired
  async attemptReconnection() {
    // Prevent multiple simultaneous reconnection attempts
    if (this.reconnectionAttempted) {
      console.log('🔄 Reconnection already attempted, skipping...');
      return false;
    }

    try {
      console.log('🔄 Attempting automatic Spotify reconnection...');
      this.reconnectionAttempted = true;
      
      // Check current status
      const status = await this.getConnectionStatus();
      
      if (status.connected && status.is_expired) {
        console.log('🔄 Spotify tokens expired, attempting refresh...');
        
        // Try to refresh tokens via backend
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/accounts/spotify/refresh/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            console.log('✅ Spotify tokens refreshed automatically');
            this.reconnectionAttempted = false; // Reset flag on success
            return true;
          } else {
            console.log('❌ Token refresh failed with status:', response.status);
          }
        } catch (refreshError) {
          console.log('❌ Automatic token refresh failed:', refreshError.message);
        }
      }
      
      // Reset flag after a delay to allow future attempts
      this.reconnectionTimeout = setTimeout(() => {
        this.reconnectionAttempted = false;
        console.log('🔄 Reconnection flag reset, can attempt again');
      }, 30000); // 30 second cooldown
      
      return status.connected && !status.is_expired;
    } catch (error) {
      console.error('Error during automatic reconnection:', error);
      
      // Reset flag after error
      this.reconnectionTimeout = setTimeout(() => {
        this.reconnectionAttempted = false;
      }, 30000);
      
      return false;
    }
  }

  // Enhanced connection check with automatic reconnection
  async ensureConnection() {
    const isConnected = await this.isConnected();
    
    if (!isConnected) {
      console.log('🔄 Spotify not connected, attempting automatic reconnection...');
      return await this.attemptReconnection();
    }
    
    return true;
  }

  // Legacy isConnected method (synchronous)
  isConnectedSync() {
    return !!(localStorage.getItem("spotify_access_token") && localStorage.getItem("spotify_refresh_token"))
  }

  // Clear local storage (for cleanup)
  clearLocalTokens() {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_expires_at")
  }

  // Cleanup method to clear timeouts and reset flags
  cleanup() {
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
    this.reconnectionAttempted = false;
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService()
export default SpotifyService