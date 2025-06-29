import axios from "axios"

// 🌟 CRITICAL CONFIGURATION 🌟
// VITE_API_URL on Vercel MUST be set to: https://plantpal-4hx7.onrender.com
// This variable should NOT include '/api' at the end or any trailing slash.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

console.log("🌐 API Service: Base URL configured as:", API_BASE_URL)

// Create a general Axios instance with the base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for Render cold starts
  headers: {
    "Content-Type": "application/json",
  },
})

// Request Interceptor: Attach the authorization token to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log("🔑 API Request: Auth token added")
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error("❌ API Request Error:", error)
    return Promise.reject(error)
  },
)

// Response Interceptor: Handle successful and error responses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`)
    return response
  },
  (error) => {
    console.error(`❌ API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`)
    console.error("Error details:", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
    // You might want to handle token refresh logic here if not already in a central place
    // For now, just re-reject the error
    return Promise.reject(error)
  },
)

// ----------------------------------------------------
// Define specific API services/wrappers.
// ALL paths below MUST start with '/api/' because the
// main 'api' instance's baseURL is JUST THE DOMAIN.
// ----------------------------------------------------

// Auth API calls (accounts app)
export const authAPI = {
  register: (userData) => api.post("/api/accounts/register/", userData),
  login: (credentials) => api.post("/api/accounts/login/", credentials),
  logout: (refreshToken) => api.post("/api/accounts/logout/", { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post("/api/accounts/token/refresh/", { refresh: refreshToken }),
  getProfile: () => api.get("/api/accounts/me/"),
  updateProfile: (userData) => api.patch("/api/accounts/me/update/", userData),
  changePassword: (passwordData) => api.post("/api/accounts/change-password/", passwordData),
  deleteAccount: (refreshToken) => api.delete("/api/accounts/delete/", { data: { refresh: refreshToken } }),
  connectSpotify: (spotifyData) => api.post("/api/music/status/", spotifyData),
  getUserStats: () => api.get("/api/accounts/stats/"),
  // Convenience methods for direct API calls
  post: (url, data) => api.post(`/api/accounts${url}`, data),
  delete: (url, config) => api.delete(`/api/accounts${url}`, config),
}

// Journal API calls (journal app)
export const journalAPI = {
  getEntries: (params) => api.get("/api/journal/entries/", { params }),
  createEntry: (entryData) => api.post("/api/journal/entries/", entryData),
  getEntry: (id) => api.get(`/api/journal/entries/${id}/`),
  updateEntry: (id, entryData) => api.patch(`/api/journal/entries/${id}/`, entryData),
  deleteEntry: (id) => api.delete(`/api/journal/entries/${id}/`),
  getLatestEntry: () => api.get("/api/journal/entries/latest_entry/"),
  getStats: () => api.get("/api/journal/entries/stats/"),
  getPrompt: (moodType) => api.get(`/api/journal/prompts/`, { params: { mood: moodType } }),
  markFavorite: (id) => api.post(`/api/journal/entries/${id}/mark_favorite/`),
}

// Plant API calls (plants app)
export const plantAPI = {
  getPlants: () => api.get("/api/plants/plants/"),
  createPlant: (plantData) => api.post("/api/plants/plants/", plantData),
  getPlant: (id) => api.get(`/api/plants/plants/${id}/`),
  updatePlant: (id, plantData) => api.patch(`/api/plants/plants/${id}/`, plantData),
  deletePlant: (id) => api.delete(`/api/plants/plants/${id}/`),
  getLogs: (plantId) => api.get(`/api/plants/logs/?plant=${plantId}`),
  createLog: (logData) => api.post("/api/plants/logs/", logData),
  waterPlant: (plantId, amount = 20) =>
    api.post(`/api/plants/plants/${plantId}/water/`, { amount }),
  fertilizePlant: (plantId) =>
    api.post(`/api/plants/plants/${plantId}/fertilize/`),
  // Public Garden & Social Watering
  getPublicGarden: () => api.get("/api/plants/public-garden/"),
  getPublicPlant: (userId) => api.get(`/api/plants/public/${userId}/`),
  waterOtherPlant: (userId, amount = 10) => api.post(`/api/plants/public/${userId}/water/`, { amount }),
  // Memory Seeds, Fantasy Plants, Mindfulness
  getMemorySeeds: () => api.get("/api/plants/memory-seeds/"),
  createMemorySeed: (data) => api.post("/api/plants/memory-seeds/", data),
  updateFantasyParams: (data) => api.post("/api/plants/fantasy-params/", data),
  rewardMindfulness: (reward_type = 'breathing') => api.post("/api/plants/mindfulness-reward/", { reward_type }),
  sunshine: (plantId) => api.post(`/api/plants/plants/${plantId}/sunshine/`),
}

// Mood API calls (moods app)
export const moodAPI = {
  getMoods: (params) => api.get("/api/moods/moods/", { params }),
  createMood: (moodData) => api.post("/api/moods/moods/", moodData),
  getMood: (id) => api.get(`/api/moods/moods/${id}/`),
  updateMood: (id, moodData) => api.patch(`/api/moods/moods/${id}/`, moodData),
  deleteMood: (id) => api.delete(`/api/moods/moods/${id}/`),
}

// Reminder API calls (reminders app)
export const reminderAPI = {
  getReminders: () => api.get("/api/reminders/reminders/"),
  createReminder: (reminderData) => api.post("/api/reminders/reminders/", reminderData),
  getReminder: (id) => api.get(`/api/reminders/reminders/${id}/`),
  updateReminder: (id, reminderData) => api.patch(`/api/reminders/reminders/${id}/`, reminderData),
  deleteReminder: (id) => api.delete(`/api/reminders/reminders/${id}/`),
}

// Music API calls (music app)
export const musicAPI = {
  // Spotify Authentication
  getAuthUrl: () => api.get("/api/music/auth/"),
  handleCallback: (code, state) => api.post("/api/music/callback/", { code, state }),
  disconnect: () => api.delete("/api/music/disconnect/"),
  getConnectionStatus: () => api.get("/api/music/status/"),
  
  // Spotify Data
  getTopTracks: (timeRange = 'medium_term', limit = 20) => 
    api.get("/api/music/top-tracks/", { params: { time_range: timeRange, limit } }),
  getRecentlyPlayed: (limit = 20) => 
    api.get("/api/music/recently-played/", { params: { limit } }),
  getCurrentTrack: () => api.get("/api/music/current-track/"),
  
  // Mood Analysis
  getMoodAnalysis: (days = 7) => 
    api.get("/api/music/mood/analysis/", { params: { days } }),
  getMoodSummary: () => api.get("/api/music/mood/summary/"),
  getMoodSettings: () => api.get("/api/music/mood/settings/"),
  updateMoodSettings: (settings) => api.put("/api/music/mood/settings/", settings),
  
  // Statistics
  getListeningStats: (days = 30) => 
    api.get("/api/music/stats/", { params: { days } }),
  getWeeklyReport: () => api.get("/api/music/reports/weekly/"),
  
  // Data Management
  syncListeningData: () => api.post("/api/music/sync/"),
}

export default api
