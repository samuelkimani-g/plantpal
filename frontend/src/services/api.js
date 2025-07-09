import axios from "axios"

// 🌟 CRITICAL CONFIGURATION 🌟
// VITE_API_URL on Vercel MUST be set to: https://plantpal-4hx7.onrender.com
// This variable should NOT include '/api' at the end or any trailing slash.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

console.log("🌐 API Service: Base URL configured as:", API_BASE_URL)

// Create a general Axios instance with the base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased timeout to 60 seconds for Render cold starts
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
    } else {
      console.log("⚠️ API Request: No auth token found")
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
  async (error) => {
    const originalRequest = error.config;

    const excludedPaths = [
      '/api/auth/jwt/create/',
      '/api/auth/jwt/refresh/'
    ];

    // Handle timeout errors with retry for Render cold starts
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log("⏰ Request timeout detected - may be Render cold start")
      if (!originalRequest._retry && !excludedPaths.includes(originalRequest.url)) {
        originalRequest._retry = true;
        console.log("🔄 Retrying request after timeout...")
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return api(originalRequest);
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest.url &&
      !excludedPaths.includes(originalRequest.url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            console.log("❌ No refresh token found, redirecting to login");
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = '/login';
            return Promise.reject(error);
        }
        
        console.log("🔄 Attempting token refresh...");
        const response = await axios.post(`${API_BASE_URL}/api/auth/jwt/refresh/`, { refresh: refreshToken });
        const { access } = response.data;
        
        if (!access) {
            throw new Error("No access token received from refresh");
        }
        
        console.log("✅ Token refresh successful");
        localStorage.setItem('access_token', access);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + access;
        originalRequest.headers['Authorization'] = 'Bearer ' + access;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        console.error("Refresh error details:", {
          status: refreshError.response?.status,
          data: refreshError.response?.data,
          message: refreshError.message
        });
        
        // Clear all auth data and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    console.error(`❌ API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`)
    console.error("Error details:", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
    return Promise.reject(error)
  },
)

// ----------------------------------------------------
// Define specific API services/wrappers.
// ALL paths below MUST start with '/api/' because the
// main 'api' instance's baseURL is JUST THE DOMAIN.
// ----------------------------------------------------

// Auth API calls (using djoser endpoints)
export const authAPI = {
  register: (userData) => api.post("/api/auth/users/", userData),
  login: (credentials) => api.post("/api/auth/jwt/create/", credentials),
  logout: (refreshToken) => api.post("/api/auth/jwt/logout/", { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post("/api/auth/jwt/refresh/", { refresh: refreshToken }),
  getProfile: () => api.get("/api/auth/users/me/"),
  updateProfile: (userData) => api.patch("/api/auth/users/me/", userData),
  changePassword: (passwordData) => api.post("/api/auth/users/set_password/", passwordData),
  deleteAccount: (refreshToken) => api.delete("/api/auth/users/me/"),
  connectSpotify: (spotifyData) => api.post("/api/music/status/", spotifyData),
  getUserStats: () => api.get("/api/accounts/stats/"),
  // Convenience methods for direct API calls
  post: (url, data) => api.post(`/api/auth${url}`, data),
  delete: (url, config) => api.delete(`/api/auth${url}`, config),
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
  getPublicGarden: (query = "") => paymentsAPI.getGarden(query),
  getPublicPlant: (userId) => api.get(`/api/plants/public/${userId}/`),
  waterOtherPlant: (plantId) => paymentsAPI.waterOtherPlant(plantId),
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
  getAnalytics: () => api.get("/api/moods/analytics/"),
  getFeedback: () => api.get("/api/moods/feedback/"),
}

// Reminder API calls (reminders app)
export const reminderAPI = {
  getReminders: () => api.get("/api/reminders/"),
  createReminder: (reminderData) => api.post("/api/reminders/", reminderData),
  updateReminder: (id, reminderData) => api.put("/api/reminders/", reminderData),
  deleteReminder: (id) => api.delete(`/api/reminders/api/${id}/`),
  // Additional reminder endpoints
  toggleReminder: () => api.post("/api/reminders/disable/"),
  getReminderStatus: () => api.get("/api/reminders/status/"),
  updateReminderTime: (timeData) => api.post("/api/reminders/time/", timeData),
  getReminderStats: () => api.get("/api/reminders/stats/"),
  getReminderLogs: () => api.get("/api/reminders/logs/"),
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
  disconnectSpotify: () => api.delete("/api/music/disconnect/"),
  
  // Plant Integration
  updatePlantFromMusic: () => api.post("/api/music/update-plant/"),
  
  // Helper functions for frontend
  formatDuration: (ms) => {
    if (!ms) return "0:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  },
  
  formatMoodScore: (score) => {
    if (score === null || score === undefined) return 'neutral';
    if (score >= 0.75) return 'happy';
    if (score >= 0.55) return 'energetic';
    if (score >= 0.45) return 'neutral';
    if (score >= 0.25) return 'calm';
    return 'sad';
  },
  
  getMoodEmoji: (moodLabel) => {
    if (!moodLabel) return '❓';
    switch (moodLabel.toLowerCase()) {
      case 'happy': return '😊';
      case 'energetic': return '⚡';
      case 'calm': return '😌';
      case 'sad': return '😢';
      case 'very sad': return '😭';
      case 'neutral': return '😐';
      case 'euphoric': return '🤩';
      case 'upbeat': return '😎';
      case 'melancholy': return '😔';
      case 'low': return '😞';
      case 'positive': return '😊';
      case 'positive mood': return '😊';
      default: return '❓';
    }
  },
  
  getMoodColor: (score) => {
    if (score === null || score === undefined) return '#6B7280'; // gray
    if (score >= 0.8) return '#10B981'; // green
    if (score >= 0.6) return '#3B82F6'; // blue
    if (score >= 0.4) return '#F59E0B'; // yellow
    if (score >= 0.2) return '#F97316'; // orange
    return '#EF4444'; // red
  },
  
  calculatePlantGrowthBonus: (moodScore) => {
    if (!moodScore || moodScore === null || moodScore === undefined) return 0;
    // Example: Positive mood (score > 0.5) gives a bonus, negative (score < 0.5) gives less or none
    if (moodScore > 0.5) {
      return (moodScore - 0.5) * 2; // Scales 0-0.5 to 0-1 (0% to 100% bonus for max positive mood)
    }
    return 0; // No bonus for neutral or negative moods
  }
}

// Chatbot API calls (chatbot app)
export const chatbotAPI = {
  sendMessage: (messages) => api.post("/api/chatbot/chat/", { messages }),
};

// Store API calls (store app)
export const storeAPI = {
  getStoreItems: () => api.get("/api/store/items/"),
  buyStoreItem: (itemId) => api.post(`/api/store/items/${itemId}/buy/`),
  getUserInventory: () => api.get("/api/store/inventory/"),
  equipItem: (inventoryId) => api.post(`/api/store/inventory/${inventoryId}/equip/`),
};

// Payments API calls (payments app)
export const paymentsAPI = {
  // User leaves balance
  getLeaves: () => api.get("/api/payments/leaves/"),
  
  // Premium and packages
  getPackages: () => api.get("/api/payments/packages/"),
  getPremiumPackages: () => api.get("/api/payments/packages/"), // Alias for getPackages
  purchasePremium: (paymentData) => api.post("/api/payments/premium/", paymentData),
  purchaseLeaves: (packageData) => api.post("/api/payments/packages/", packageData),
  
  // Payment initiation
  initiatePayment: (packageId, phoneNumber) => api.post("/api/payments/packages/buy/", { package_id: packageId, phone_number: phoneNumber }),
  initiatePremiumPayment: (packageId, phoneNumber) => api.post("/api/payments/premium/", { package_id: packageId, phone_number: phoneNumber }),
  
  // Water purchase
  purchaseWater: (waterAmount) => api.post("/api/payments/water/purchase/", { water_amount: waterAmount }),
  
  // Transaction management
  getTransactionStatus: () => api.get("/api/payments/transactions/status/"),
  getTransactionHistory: () => api.get("/api/payments/transactions/"),
  completePendingTransactions: () => api.post("/api/payments/transactions/complete-pending/"),
  completeTransaction: (transactionId) => api.post("/api/payments/transactions/complete/", { transaction_id: transactionId }),
  completeAllPending: () => api.post("/api/payments/transactions/complete-pending/"),
  
  // Public garden and social features
  getGarden: (query = "") => api.get(`/api/payments/garden/${query ? `?${query}` : ""}`),
  waterOtherPlant: (plantId) => api.post(`/api/payments/water/${plantId}/`),
  
  // Store and inventory
  getStoreItems: () => api.get("/api/payments/store-items/"),
  getUserInventory: () => api.get("/api/payments/inventory/"),
  getInventory: () => api.get("/api/payments/inventory/"), // Alias for getUserInventory
  purchaseStoreItem: (itemId) => api.post(`/api/payments/store-items/${itemId}/purchase/`),
}

export default api
