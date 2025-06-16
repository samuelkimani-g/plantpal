"use client"

import { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import { plantAPI } from "../services/api"
import { useAuth } from "./AuthContext"

const PlantContext = createContext()

const initialState = {
  plants: [],
  currentPlant: null,
  isLoading: false,
  error: null,
  hasPlants: false,
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
    default:
      return state
  }
}

export function PlantProvider({ children }) {
  const [state, dispatch] = useReducer(plantReducer, initialState)
  const { isAuthenticated, user } = useAuth()

  // Fetch plants when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPlants()
    }
  }, [isAuthenticated, user])

  const fetchPlants = useCallback(async () => {
    dispatch({ type: "PLANT_LOADING" })
    try {
      const response = await plantAPI.getPlants()
      const plants = response.data.results || response.data || []
      dispatch({ type: "PLANTS_LOADED", payload: plants })
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

  const value = {
    ...state,
    fetchPlants,
    createPlant,
    updatePlant,
    deletePlant,
    setCurrentPlant,
    clearError,
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
