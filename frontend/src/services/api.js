import axios from "axios"

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Ensure it's a 401 and not already retried, and not the refresh token endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/accounts/token/refresh/")
    ) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("refresh_token")
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/accounts/token/refresh/`,
            { refresh: refreshToken },
          )

          const { access, refresh } = response.data // Get new access and refresh tokens
          localStorage.setItem("access_token", access)
          localStorage.setItem("refresh_token", refresh) // Store new refresh token for rotation

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error("Token refresh failed:", refreshError.response?.data || refreshError.message)
        localStorage.removeItem("access_token")
        localStorage.removeToken("refresh_token")
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
  login: (credentials) => api.post("/accounts/login/", credentials), // This should match your Django URL
  logout: (refreshToken) => api.post("/accounts/logout/", { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post("/accounts/token/refresh/", { refresh: refreshToken }),
  getProfile: () => api.get("/accounts/profile/"),
  updateProfile: (userData) => api.patch("/accounts/profile/", userData),
}

// Journal API calls (journal app)
export const journalAPI = {
  getEntries: (params) => api.get("/journal/entries/", { params }),
  createEntry: (entryData) => api.post("/journal/entries/", entryData),
  getEntry: (id) => api.get(`/journal/entries/${id}/`),
  updateEntry: (id, entryData) => api.patch(`/journal/entries/${id}/`, entryData),
  deleteEntry: (id) => api.delete(`/journal/entries/${id}/`),
  getLatestEntry: () => api.get("/journal/entries/latest_entry/"),
  getPrompt: (moodType) => api.get(`/journal/prompts/`, { params: { mood_type: moodType } }),
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
