console.log("SPOTIFY_CLIENT_ID:", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
console.log("ALL ENV VARS:", import.meta.env);

// Import API service for backend calls
// Make sure musicAPI is imported for all Spotify-related backend calls
import { musicAPI } from './api.js'; // Removed authAPI if not directly used elsewhere for Spotify

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
// Use the current window location for the redirect URI if not specified
// This should match the REDIRECT_URI configured in your Spotify Developer Dashboard
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
            // Use musicAPI's pre-defined method for getting the auth URL
            const response = await musicAPI.getAuthUrl();
            return response.data.auth_url;
        } catch (error) {
            console.error('Failed to get Spotify auth URL from backend:', error);
            // Fallback to direct URL generation (less secure, but a fallback)
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
    async connectWithCode(code, state) { // Added state parameter to connectWithCode
        try {
            // Use musicAPI's pre-defined method for handling the callback
            const response = await musicAPI.handleCallback(code, state); // Pass both code and state
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
            // Use musicAPI's pre-defined method
            const response = await musicAPI.getConnectionStatus();
            return response.data;
        } catch (error) {
            console.error('Failed to get Spotify status:', error);
            return { connected: false, is_expired: true };
        }
    }

    // Fetch valence data and update plant via backend
    async fetchValenceAndUpdatePlant() {
        try {
            // Use musicAPI's pre-defined method for syncing listening data
            const response = await musicAPI.syncListeningData();
            console.log('🎵 Valence data fetched and plant updated:', response);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch valence data:', error);
            throw error;
        }
    }

    // Disconnect Spotify via backend and clear ALL frontend data
    async disconnect() {
        try {
            console.log('🔄 Starting complete Spotify disconnect...');

            // Step 1: Disconnect via backend (removes server-side data)
            const response = await musicAPI.disconnect(); // Use musicAPI's pre-defined method
            console.log('✅ Spotify disconnected via backend:', response);

            // Step 2: Clear all local storage data
            console.log('🧹 Clearing all local Spotify data...');
            this.clearLocalTokens();

            // Also clear any other Spotify-related localStorage keys
            localStorage.removeItem('spotify_connected');
            localStorage.removeItem('spotify_user_id');
            localStorage.removeItem('spotify_display_name');
            localStorage.removeItem('spotify_return_path');
            localStorage.removeItem('spotify_state');

            // Step 3: Reset service state
            console.log('🔄 Resetting service state...');
            this.reconnectionAttempted = false;
            this.cleanup();

            // Step 4: Clear any session storage
            sessionStorage.removeItem('spotify_access_token');
            sessionStorage.removeItem('spotify_refresh_token');
            sessionStorage.removeItem('spotify_connected');

            // Step 5: Clear browser cache for Spotify domains (if possible)
            try {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        if (registration.scope.includes('spotify')) { // Check if scope is related to Spotify
                            await registration.unregister();
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Could not clear service workers:', e.message);
            }

            console.log('✅ Complete Spotify disconnect successful - reset to Phase 1');
            console.log('ℹ️ User will need to reconnect from scratch');

            // Let's verify the disconnect worked by checking status
            setTimeout(async () => {
                try {
                    const status = await this.getConnectionStatus();
                    console.log('🔍 Post-disconnect status check:', status);
                    if (status.connected) {
                        console.error('❌ DISCONNECT FAILED - User is still connected!');
                    } else {
                        console.log('✅ Disconnect verified - user is no longer connected');
                    }
                } catch (e) {
                    console.log('✅ Disconnect verified - connection status check failed (expected)');
                }
            }, 500);

            return response.data;
        } catch (error) {
            console.error('❌ Failed to disconnect Spotify:', error);

            // Even if backend fails, still clear frontend data
            console.log('🧹 Backend disconnect failed, but clearing frontend data anyway...');
            this.clearLocalTokens();
            localStorage.removeItem('spotify_connected');
            localStorage.removeItem('spotify_user_id');
            localStorage.removeItem('spotify_display_name');
            localStorage.removeItem('spotify_return_path');
            localStorage.removeItem('spotify_state');
            sessionStorage.removeItem('spotify_access_token');
            sessionStorage.removeItem('spotify_refresh_token');
            sessionStorage.removeItem('spotify_connected');
            this.reconnectionAttempted = false;
            this.cleanup();

            throw error;
        }
    }

    // Legacy methods for backward compatibility (ensure they route to backend methods)
    async getAccessToken(code) {
        return this.connectWithCode(code);
    }

    async refreshAccessToken(refreshToken) {
        console.log('Token refresh is now handled by backend');
        return null;
    }

    async getValidAccessToken() {
        const status = await this.getConnectionStatus();
        if (!status.connected || status.is_expired) {
            throw new Error("Spotify not connected or token expired");
        }
        return "backend_managed"; // Placeholder since backend manages tokens
    }

    // REMOVED apiRequest method - all calls should use musicAPI directly
    // This removes the source of manual URL construction that caused /api/api/ doubling

    // Get currently playing track
    async getCurrentTrack() {
        try {
            const response = await musicAPI.getCurrentTrack(); // Use musicAPI
            return response.data;
        } catch (error) {
            console.error('Error getting current track:', error);
            throw error;
        }
    }

    // Get recently played tracks
    async getRecentlyPlayed(limit = 20) {
        try {
            const response = await musicAPI.getRecentlyPlayed(limit); // Use musicAPI
            return response.data;
        } catch (error) {
            console.error('Error getting recently played:', error);
            throw error;
        }
    }

    // Get top tracks
    async getTopTracks(timeRange = "short_term", limit = 20) {
        try {
            // Directly call musicAPI.getTopTracks as apiRequest is removed
            const response = await musicAPI.getTopTracks(timeRange, limit);

            // If response has data property, extract it
            if (response.data) {
                return response.data;
            }

            // Otherwise return the response directly
            return response;
        } catch (error) {
            console.error('Error getting top tracks:', error);
            throw error;
        }
    }

    // Get audio features for tracks
    async getAudioFeatures(trackIds) {
        try {
            // Audio features endpoint doesn't exist in backend, return null
            console.log('⚠️ Audio features endpoint not available in backend, using text-based mood analysis');
            return { audio_features: null };
        } catch (error) {
            console.error('Error getting audio features:', error);
            throw error;
        }
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
            const isConnected = await this.ensureConnection();
            if (!isConnected) {
                console.log('❌ Spotify not connected, cannot fetch listening session');
                return null;
            }

            const now = Date.now()
            if (this.cachedSession && (now - this.lastSessionUpdate) < 120000) {
                console.log("Returning cached Spotify session data")
                return this.cachedSession
            }

            const [currentTrack, recentTracks] = await Promise.all([this.getCurrentTrack(), this.getRecentlyPlayed(5)]) // Use getRecentlyPlayed for consistency

            if (!recentTracks || recentTracks.length === 0) {
                return null
            }

            const trackIds = recentTracks.slice(0, 5).map((track) => track.id).filter(Boolean)
            
            let moodMetrics = { overallMood: 0.5, energy: 0.5, valence: 0.5, danceability: 0.5 }
            
            try {
                const audioFeatures = await this.getAudioFeatures(trackIds)
                moodMetrics = this.calculateMoodMetrics(audioFeatures.audio_features, recentTracks)
            } catch (error) {
                console.warn("Could not fetch audio features, using text-based mood analysis:", error.message)
                moodMetrics = this.calculateMoodMetrics(null, recentTracks)
            }

            const oneHourAgo = Date.now() - 60 * 60 * 1000
            const recentListening = recentTracks.filter((track) => new Date(track.played_at).getTime() > oneHourAgo)

            const sessionData = {
                isCurrentlyPlaying: !!currentTrack,
                currentTrack,
                recentTracks: recentTracks.slice(0, 5),
                minutesListened: recentListening.length * 3,
                moodScore: moodMetrics.overallMood,
                energyLevel: moodMetrics.energy,
                valence: moodMetrics.valence,
                danceability: moodMetrics.danceability,
                moodDescription: this.getMoodDescription(moodMetrics.overallMood),
                lastUpdated: new Date().toISOString(),
            }

            this.cachedSession = sessionData
            this.lastSessionUpdate = now

            return sessionData
        } catch (error) {
            console.error("Error getting detailed listening session:", error)
            
            if (this.cachedSession) {
                console.log("Returning stale cached data due to API error")
                return this.cachedSession
            }
            
            throw error
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
            
            if (status.connected && !status.is_expired) {
                console.log('✅ Spotify connection is valid');
                this.reconnectionAttempted = false; // Reset flag on success
                return true;
            } else {
                console.log('❌ Spotify connection is invalid or expired');
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
        this.cachedSession = null; // Clear cached data on cleanup
    }
}

export const spotifyService = new SpotifyService()
export default SpotifyService