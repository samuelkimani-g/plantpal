"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { getCurrentUser, loginUser, registerUser, logoutUser } from "../services/api" // Corrected path

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check failed:", error)
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        setIsAuthenticated(false)
      }
    }
    setLoading(false)
  }

  const login = async (username, password) => {
    try {
      const response = await loginUser(username, password)
      const userData = await getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Login failed",
      }
    }
  }

  const register = async (username, email, password) => {
    try {
      await registerUser(username, email, password)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        // The error response for registration might be more detailed (e.g., {'email': ['Enter a valid email address.']})
        error: typeof error.response?.data === 'string' 
               ? error.response.data 
               : (Object.values(error.response?.data || {}).flat().join(' ') || "Registration failed"),
      }
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
