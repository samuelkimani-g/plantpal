import axios from "axios"

// Create axios instance with base configuration
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"
console.log("🌐 API Service: Base URL configured as:", baseURL)

const api = axios.create({
  baseURL: baseURL,
  timeout: 15000, // 15 second timeout
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // Skip ngrok browser warning
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log("🔑 API Request: Auth token added")
    }
    return config
  },
  (error) => {
    console.error("❌ API Request Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`)
    return response
  },
  async (error) => {
    console.error(`❌ API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`)
    console.error("Error details:", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })

    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/accounts/token/refresh/")
    ) {
      originalRequest._retry = true

      try {
        console.log("🔄 Attempting token refresh...")
        const refreshToken = localStorage.getItem("refresh_token")
        if (refreshToken) {
          const response = await axios.post(
            `${baseURL}/accounts/token/refresh/`,
            { refresh: refreshToken },
          )

          const { access, refresh } = response.data
          localStorage.setItem("access_token", access)
          localStorage.setItem("refresh_token", refresh)

          originalRequest.headers.Authorization = `Bearer ${access}`
          console.log("✅ Token refreshed successfully")
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError.response?.data || refreshError.message)
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

// Auth API calls (accounts app)
export const authAPI = {
  register: (userData) => api.post("/accounts/register/", userData),
  login: (credentials) => api.post("/accounts/login/", credentials),
  logout: (refreshToken) => api.post("/accounts/logout/", { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post("/token/refresh/", { refresh: refreshToken }),
  getProfile: () => api.get("/accounts/profile/"),
  updateProfile: (userData) => api.patch("/accounts/profile/", userData),
  changePassword: (passwordData) => api.post("/accounts/change-password/", passwordData),
  deleteAccount: (refreshToken) => api.delete("/accounts/delete-account/", { data: { refresh: refreshToken } }),
  connectSpotify: (spotifyData) => api.post("/accounts/spotify/", spotifyData),
  // Convenience methods for direct API calls
  post: (url, data) => api.post(`/accounts${url}`, data),
  delete: (url, config) => api.delete(`/accounts${url}`, config),
}

// Journal API calls (journal app)
export const journalAPI = {
  getEntries: (params) => api.get("/journal/entries/", { params }),
  createEntry: (entryData) => api.post("/journal/entries/", entryData),
  getEntry: (id) => api.get(`/journal/entries/${id}/`),
  updateEntry: (id, entryData) => api.patch(`/journal/entries/${id}/`, entryData),
  deleteEntry: (id) => api.delete(`/journal/entries/${id}/`),
  getLatestEntry: () => api.get("/journal/entries/latest_entry/"),
  getStats: () => api.get("/journal/entries/stats/"),
  getPrompt: (moodType) => api.get(`/journal/prompts/`, { params: { mood: moodType } }),
  markFavorite: (id) => api.post(`/journal/entries/${id}/mark_favorite/`),
}

// Plant API calls (plants app)
export const plantAPI = {
  getPlants: () => api.get("/plants/plants/"),
  createPlant: (plantData) => api.post("/plants/plants/", plantData),
  getPlant: (id) => api.get(`/plants/plants/${id}/`),
  updatePlant: (id, plantData) => api.patch(`/plants/plants/${id}/`, plantData),
  deletePlant: (id) => api.delete(`/plants/plants/${id}/`),
  getLogs: (plantId) => api.get(`/plants/logs/?plant=${plantId}`),
  createLog: (logData) => api.post("/plants/logs/", logData),
  waterPlant: (plantId, amount = 20) =>
    api.post(`/plants/plants/${plantId}/water/`, { amount }),
  fertilizePlant: (plantId) =>
    api.post(`/plants/plants/${plantId}/fertilize/`),
  // Public Garden & Social Watering
  getPublicGarden: () => api.get("/plants/public-garden/"),
  getPublicPlant: (userId) => api.get(`/plants/public/${userId}/`),
  waterOtherPlant: (userId, amount = 10) => api.post(`/plants/public/${userId}/water/`, { amount }),
  // Memory Seeds, Fantasy Plants, Mindfulness
  getMemorySeeds: () => api.get("/plants/memory-seeds/"),
  createMemorySeed: (data) => api.post("/plants/memory-seeds/", data),
  updateFantasyParams: (data) => api.post("/plants/fantasy-params/", data),
  rewardMindfulness: (reward_type = 'breathing') => api.post("/plants/mindfulness-reward/", { reward_type }),
  sunshine: (plantId) => api.post(`/plants/plants/${plantId}/sunshine/`),
}

// Mood API calls (moods app)
export const moodAPI = {
  getMoods: (params) => api.get("/moods/moods/", { params }),
  createMood: (moodData) => api.post("/moods/moods/", moodData),
  getMood: (id) => api.get(`/moods/moods/${id}/`),
  updateMood: (id, moodData) => api.patch(`/moods/moods/${id}/`, moodData),
  deleteMood: (id) => api.delete(`/moods/moods/${id}/`),
}

// Reminder API calls (reminders app)
export const reminderAPI = {
  getReminders: () => api.get("/reminders/reminders/"),
  createReminder: (reminderData) => api.post("/reminders/reminders/", reminderData),
  getReminder: (id) => api.get(`/reminders/reminders/${id}/`),
  updateReminder: (id, reminderData) => api.patch(`/reminders/reminders/${id}/`, reminderData),
  deleteReminder: (id) => api.delete(`/reminders/reminders/${id}/`),
}

export default api
