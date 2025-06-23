"use client"

import { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import { plantAPI } from "../services/api"
import { useAuth } from "./AuthContext"
import { offlineMusicService } from "../services/offlineMusic"
import { spotifyService } from "../services/spotify"
// Import debug utility for development
// import "../utils/debugPlantAPI" // Disabled to prevent infinite loops

const PlantContext = createContext()

const initialState = {
  plants: [],
  currentPlant: null,
  isLoading: false,
  error: null,
  hasPlants: false,
  spotifyConnected: false,
  lastUpdate: null,
}

function plantReducer(state, action) {
  switch (action.type) {
    case "PLANT_LOADING":
      return { ...state, isLoading: true, error: null }
    case "PLANTS_LOADED":
      return {
        ...state,
        plants: action.payload,
        currentPlant: action.payload[0] || null,
        hasPlants: action.payload.length > 0,
        isLoading: false,
        error: null,
      }
    case "PLANT_CREATED":
      return {
        ...state,
        plants: [action.payload, ...state.plants],
        currentPlant: action.payload,
        hasPlants: true,
        isLoading: false,
        error: null,
      }
    case "PLANT_UPDATED":
      const updatedPlants = state.plants.map((plant) => (plant.id === action.payload.id ? action.payload : plant))
      return {
        ...state,
        plants: updatedPlants,
        currentPlant: state.currentPlant?.id === action.payload.id ? action.payload : state.currentPlant,
        isLoading: false,
        error: null,
      }
    case "PLANT_DELETED":
      const filteredPlants = state.plants.filter((plant) => plant.id !== action.payload)
      return {
        ...state,
        plants: filteredPlants,
        currentPlant: state.currentPlant?.id === action.payload ? filteredPlants[0] || null : state.currentPlant,
        hasPlants: filteredPlants.length > 0,
        isLoading: false,
        error: null,
      }
    case "PLANT_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      }
    case "CLEAR_ERROR":
      return { ...state, error: null }
    case "SET_CURRENT_PLANT":
      return { ...state, currentPlant: action.payload }
    case "SET_SPOTIFY_STATUS":
      return { ...state, spotifyConnected: action.payload }
    case "UPDATE_REAL_TIME":
      return { ...state, lastUpdate: Date.now() }
    default:
      return state
  }
}

export function PlantProvider({ children }) {
  const [state, dispatch] = useReducer(plantReducer, initialState)
  const { isAuthenticated, user } = useAuth()

  // This effect will be defined after all functions are available

  // Set up real-time updates using WebSocket or long polling
  useEffect(() => {
    if (!isAuthenticated || !user) return

    // Use a more efficient update mechanism
    const updatePlantData = async () => {
      try {
        const response = await plantAPI.getPlants()
        if (response.data) {
          dispatch({ type: "PLANTS_LOADED", payload: response.data })
        }
      } catch (error) {
        console.error("Error updating plant data:", error)
      }
    }

    // Update when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePlantData()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Update on user interactions that might change data
    window.addEventListener("focus", updatePlantData)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", updatePlantData)
    }
  }, [isAuthenticated, user])
  
  // Music updates will be handled after all functions are defined



  const fetchPlants = useCallback(async () => {
    dispatch({ type: "PLANT_LOADING" })
    try {
      const response = await plantAPI.getPlants()
      console.log("PlantContext: Raw API response:", response)
      console.log("PlantContext: Response data:", response.data)
      
      // Check for ngrok error first
      if (typeof response.data === 'string' && response.data.includes('ngrok')) {
        console.error("🚨 PlantContext: ngrok browser warning detected!")
        console.error("🔧 API calls are being intercepted by ngrok warning page")
        console.error("💡 The 'ngrok-skip-browser-warning' header should fix this")
        throw new Error("ngrok browser warning blocking API access")
      }
      
      // Handle both old and new API response formats
      let plants = []
      if (Array.isArray(response.data)) {
        // New format: array of plants
        plants = response.data
      } else if (Array.isArray(response.data.results)) {
        // Paginated format
        plants = response.data.results
      } else if (response.data && typeof response.data === 'object') {
        // Old format: single plant object - wrap in array
        plants = [response.data]
      } else {
        // No plants
        plants = []
      }
      
      // Ensure each plant has an ID field and required properties
      const plantsWithIds = plants.map(plant => {
        // Handle missing ID field
        if (!plant.id && plant.pk) {
          plant.id = plant.pk
        }
        
        // Ensure essential fields exist with defaults
        const processedPlant = {
          id: plant.id || plant.pk || null,
          name: plant.name || "My Plant",
          species: plant.species || "unknown",
          health_score: plant.health_score || plant.health || 50,
          water_level: plant.water_level || 50,
          growth_stage: plant.growth_stage || 1,
          growth_level: plant.growth_level || 1,
          current_mood_influence: plant.current_mood_influence || "neutral",
          combined_mood_score: plant.combined_mood_score || 0.5,
          journal_mood_score: plant.journal_mood_score || 0.5,
          spotify_mood_score: plant.spotify_mood_score || 0.5,
          three_d_model_params: plant.three_d_model_params || {},
          fantasy_params: plant.fantasy_params || {},
          created_at: plant.created_at || new Date().toISOString(),
          last_watered_at: plant.last_watered_at || plant.last_watered,
          last_fertilized: plant.last_fertilized,
          last_sunshine: plant.last_sunshine,
          ...plant // Spread original plant to preserve any other fields
        }
        
        console.log("PlantContext: Processed plant object:", processedPlant)
        return processedPlant
      })
      
      // Check if any plants are missing IDs
      const plantsWithoutIds = plantsWithIds.filter(plant => !plant.id)
      if (plantsWithoutIds.length > 0) {
        console.warn("PlantContext: Some plants are missing IDs:", plantsWithoutIds)
        console.warn("PlantContext: This indicates the backend may need to be restarted")
      }
      
      console.log("PlantContext: Final plants array:", plantsWithIds)
      dispatch({ type: "PLANTS_LOADED", payload: plantsWithIds })
    } catch (error) {
      console.error("Error fetching plants:", error)
      dispatch({
        type: "PLANT_ERROR",
        payload: error.response?.data?.detail || "Failed to fetch plants",
      })
    }
  }, [])

  const createPlant = useCallback(async (plantData) => {
    dispatch({ type: "PLANT_LOADING" })
    try {
      const response = await plantAPI.createPlant(plantData)
      dispatch({ type: "PLANT_CREATED", payload: response.data })
      return { success: true, plant: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to create plant"
      dispatch({ type: "PLANT_ERROR", payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [])

  const updatePlant = useCallback(async (plantId, plantData) => {
    dispatch({ type: "PLANT_LOADING" })
    try {
      const response = await plantAPI.updatePlant(plantId, plantData)
      dispatch({ type: "PLANT_UPDATED", payload: response.data })
      return { success: true, plant: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to update plant"
      dispatch({ type: "PLANT_ERROR", payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [])
  
  // Update plant based on Spotify listening
  const updatePlantFromMusic = useCallback(async () => {
    try {
      if (!spotifyService.isConnected()) return
      
      const session = await spotifyService.getListeningSession()
      if (!session) return
      
      // Calculate mood influence from music
      const moodInfluence = session.moodScore > 0.7 ? "happy" : 
                           session.moodScore > 0.5 ? "energetic" :
                           session.moodScore > 0.3 ? "calm" : "sad"
      
      // Update plant if currently playing music
      if (session.isCurrentlyPlaying && state.currentPlant) {
        const updateData = {
          spotify_mood_score: session.moodScore,
          current_mood_influence: moodInfluence,
          // Increase health slightly when listening to music
          health_score: Math.min(100, (state.currentPlant.health_score || 50) + 1)
        }
        
        await updatePlant(state.currentPlant.id, updateData)
      }
    } catch (error) {
      console.error("Error updating plant from music:", error)
    }
  }, [state.currentPlant, updatePlant])

  // Define checkSpotifyStatus after updatePlantFromMusic is available
  const checkSpotifyStatus = useCallback(async () => {
    try {
      // Check if user has Spotify connected using the proper API service
      const { authAPI } = await import("../services/api")
      const response = await authAPI.getProfile()
      const isConnected = !!response.data.spotify_access_token
      dispatch({ type: "SET_SPOTIFY_STATUS", payload: isConnected })
      
      // If connected, update plant based on music
      if (isConnected) {
        updatePlantFromMusic()
      }
    } catch (error) {
      console.error("Error checking Spotify status:", error)
      // Don't fail silently, but don't crash the app either
      dispatch({ type: "SET_SPOTIFY_STATUS", payload: false })
    }
  }, [updatePlantFromMusic])

  const deletePlant = useCallback(async (plantId) => {
    dispatch({ type: "PLANT_LOADING" })
    try {
      await plantAPI.deletePlant(plantId)
      dispatch({ type: "PLANT_DELETED", payload: plantId })
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to delete plant"
      dispatch({ type: "PLANT_ERROR", payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [])

  const setCurrentPlant = useCallback((plant) => {
    dispatch({ type: "SET_CURRENT_PLANT", payload: plant })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" })
  }, [])

  const waterPlant = useCallback(async (plantId, amount = 20) => {
    try {
      const response = await plantAPI.waterPlant(plantId, amount)
      dispatch({ type: "PLANT_UPDATED", payload: response.data.plant })
      return { success: true, plant: response.data.plant }
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to water plant"
      dispatch({ type: "PLANT_ERROR", payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [])

  const fertilizePlant = useCallback(async (plantId) => {
    try {
      const response = await plantAPI.fertilizePlant(plantId)
      dispatch({ type: "PLANT_UPDATED", payload: response.data.plant })
      return { success: true, plant: response.data.plant }
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to fertilize plant"
      dispatch({ type: "PLANT_ERROR", payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [])

  // Fetch plants when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPlants()
      checkSpotifyStatus()
      syncOfflineMusic()
    }
  }, [isAuthenticated, user])

  // Sync offline music sessions when coming online
  const syncOfflineMusic = useCallback(async () => {
    if (!state.currentPlant) return

    try {
      console.log("🎵 Checking for offline music sessions to sync...")
      const result = await offlineMusicService.syncWithPlant(plantAPI, state.currentPlant.id)
      
      if (result.synced > 0) {
        console.log(`🎵 Synced ${result.synced} offline music sessions`)
        // Refresh plants to show updated data
        fetchPlants()
      }
    } catch (error) {
      console.error("Error syncing offline music:", error)
    }
  }, [state.currentPlant, fetchPlants])

  // Music updates effect - defined after all functions
  useEffect(() => {
    if (!state.spotifyConnected || !state.currentPlant) return
    
    // Check music updates every 2 minutes if Spotify is connected
    const musicInterval = setInterval(() => {
      updatePlantFromMusic()
    }, 120000) // 2 minutes

    return () => {
      clearInterval(musicInterval)
    }
  }, [state.spotifyConnected, state.currentPlant, updatePlantFromMusic])

  // Add automatic Spotify mood updates
  const updateSpotifyMood = async () => {
    try {
      // Check if user has Spotify connected
      const spotifyStatus = await spotifyService.getConnectionStatus();
      if (!spotifyStatus.connected || spotifyStatus.is_expired) {
        return;
      }

      // Fetch valence data and update plant mood
      const response = await spotifyService.fetchValenceAndUpdatePlant();
      console.log('🎵 Spotify mood updated:', response);
      
      // Refresh plant data to get updated mood
      await fetchPlants();
      
    } catch (error) {
      console.warn('Could not update Spotify mood:', error.message);
      // Don't show error to user for automatic updates
    }
  };

  // Automatic Spotify mood updates every 2 minutes when music is active
  useEffect(() => {
    let spotifyInterval;
    
    if (state.currentPlant && state.spotifyConnected) {
      // Update Spotify mood every 2 minutes
      spotifyInterval = setInterval(updateSpotifyMood, 2 * 60 * 1000);
      
      // Initial update
      updateSpotifyMood();
    }
    
    return () => {
      if (spotifyInterval) {
        clearInterval(spotifyInterval);
      }
    };
  }, [state.currentPlant, state.spotifyConnected]);

  const value = {
    ...state,
    fetchPlants,
    createPlant,
    updatePlant,
    deletePlant,
    setCurrentPlant,
    clearError,
    waterPlant,
    fertilizePlant,
    checkSpotifyStatus,
    syncOfflineMusic,
  }

  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>
}

export function usePlant() {
  const context = useContext(PlantContext)
  if (context === undefined) {
    throw new Error("usePlant must be used within a PlantProvider")
  }
  return context
}
