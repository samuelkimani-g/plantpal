"use client"

import { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import { authAPI } from "../services/api"

const AuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, isLoading: true, error: null }
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }
    case "CLEAR_ERROR":
      return { ...state, error: null }
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      console.log("🔍 AuthContext: Starting authentication check...")
      const accessToken = localStorage.getItem("access_token")
      
      if (accessToken) {
        console.log("🔑 AuthContext: Access token found, verifying with backend...")
        try {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
          )
          
          const response = await Promise.race([
            authAPI.getProfile(),
            timeoutPromise
          ])
          
          console.log("✅ AuthContext: Authentication successful:", response.data)
          dispatch({
            type: "AUTH_SUCCESS",
            payload: { user: response.data },
          })
        } catch (error) {
          console.error("❌ AuthContext: Auth check failed:", error)
          console.error("Error details:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          })
          
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          dispatch({
            type: "AUTH_FAILURE",
            payload: null, // Clear error on failed checkAuth
          })
        }
      } else {
        console.log("🚫 AuthContext: No access token found, user not authenticated")
        dispatch({ type: "AUTH_FAILURE", payload: null }) // Not authenticated, no error
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (credentials) => {
    dispatch({ type: "AUTH_START" })
    try {
      console.log("Attempting login with:", { email: credentials.email, password: "***" })

      // Since our custom User model uses email as USERNAME_FIELD, djoser expects 'email' and 'password'
      const loginData = {
        email: credentials.email,
        password: credentials.password,
      }

      console.log("Sending login request to:", "/api/auth/jwt/create/")
      const response = await authAPI.login(loginData)
      console.log("Login response:", response.data)

      const { access, refresh } = response.data

      localStorage.setItem("access_token", access)
      localStorage.setItem("refresh_token", refresh)

      // Get user profile after successful login
      const profileResponse = await authAPI.getProfile()
      console.log("Profile response:", profileResponse.data)

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user: profileResponse.data },
      })

      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      let errorMessage = "Login failed. Please try again."

      // Handle different types of errors more safely
      if (error.response && error.response.data) {
        const data = error.response.data
        if (data.detail) {
          errorMessage = data.detail
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0]
        } else if (data.email && Array.isArray(data.email)) {
          errorMessage = data.email[0]
        } else if (data.password && Array.isArray(data.password)) {
          errorMessage = data.password[0]
        }
      } else if (error.message) {
        errorMessage = error.message // General network or other error
      } else if (error.name === 'AxiosError') {
        errorMessage = "Network error. Please check your connection and try again."
      }

      dispatch({
        type: "AUTH_FAILURE",
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  // Register function accepts all 4 fields as individual parameters
  const register = useCallback(async (username, email, password, confirmPassword) => {
    dispatch({ type: "AUTH_START" })
    try {
      console.log("Attempting registration with:", { username, email, password: "***", confirmPassword: "***" })

      // Map frontend fields to djoser expected fields
      const registrationData = {
        username: username,
        email: email,
        password: password,
        re_password: confirmPassword, // djoser uses 're_password' for password confirmation
      }

      console.log("Sending registration request to:", "/api/auth/users/")
      const response = await authAPI.register(registrationData) // Just register, don't auto-login
      console.log("Registration response:", response.data)

      // No AUTH_SUCCESS dispatch here, as we're not auto-logging in.
      // The Register component will handle navigation to login.
      dispatch({ type: "AUTH_FAILURE", payload: null }) // Clear loading state and any previous error
      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      let errorMessage = "Registration failed. Please try again."

      if (error.response?.data) {
        const errors = error.response.data
        if (errors.username) {
          errorMessage = `Username: ${errors.username[0]}`
        } else if (errors.email) {
          errorMessage = `Email: ${errors.email[0]}`
        } else if (errors.password) {
          errorMessage = `Password: ${errors.password[0]}`
        } else if (errors.re_password) {
          errorMessage = `Password confirmation: ${errors.re_password[0]}`
        } else if (errors.non_field_errors) {
          errorMessage = errors.non_field_errors[0]
        } else {
          errorMessage = "Please check all fields." // Generic for unhandled backend errors
        }
      } else if (error.message) {
        errorMessage = error.message // General network or other error
      }

      dispatch({
        type: "AUTH_FAILURE",
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(() => {
    try {
      console.log("Logging out and clearing local tokens.");
    } catch (error) {
      console.error("Error during logout pre-cleanup:", error);
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      dispatch({ type: "AUTH_LOGOUT" })
    }
  }, [])

  const updateProfile = useCallback(async (userData) => {
    dispatch({ type: "AUTH_START" }) // Indicate start of profile update
    try {
      const response = await authAPI.updateProfile(userData)
      dispatch({
        type: "UPDATE_USER",
        payload: response.data,
      })
      // Optionally re-fetch full profile to ensure consistency
      const updatedProfile = await authAPI.getProfile()
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user: updatedProfile.data },
      })
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Profile update failed. Please try again."
      dispatch({ type: "AUTH_FAILURE", payload: errorMessage }) // Dispatch failure for profile update
      return { success: false, error: errorMessage }
    }
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" })
  }, [])

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
