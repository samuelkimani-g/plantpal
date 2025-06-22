// Debug utility to test plant API response format
import { plantAPI } from '../services/api'

export const debugPlantAPI = async () => {
  try {
    console.log("🔍 Testing Plant API Response Format...")
    const response = await plantAPI.getPlants()
    
    console.log("📡 Raw API Response:", response)
    console.log("📊 Response Data:", response.data)
    console.log("🔢 Data Type:", typeof response.data)
    console.log("📋 Is Array:", Array.isArray(response.data))
    
    if (typeof response.data === 'string' && response.data.includes('ngrok')) {
      console.log("🚨 NGROK ERROR DETECTED!")
      console.log("🔧 The API call is being intercepted by ngrok's browser warning")
      console.log("💡 Fix: Add 'ngrok-skip-browser-warning: true' header to API requests")
      console.log("📋 This has been automatically applied to api.js")
    } else if (Array.isArray(response.data)) {
      console.log("✅ Backend is returning array format (NEW)")
      console.log("🌱 Plants in array:", response.data.length)
      response.data.forEach((plant, index) => {
        console.log(`🌿 Plant ${index + 1}:`, { id: plant.id, name: plant.name })
      })
    } else if (response.data && typeof response.data === 'object') {
      console.log("⚠️ Backend is returning object format (OLD)")
      console.log("🌱 Single plant:", { id: response.data.id, name: response.data.name })
      console.log("💡 Backend restart needed to fix API format")
    } else {
      console.log("❌ Unexpected response format:", response.data)
    }
    
    return response
  } catch (error) {
    console.error("🚨 API Error:", error)
    throw error
  }
}

// Auto-run debug when imported in development
if (process.env.NODE_ENV === 'development') {
  // Delay to ensure authentication is ready
  setTimeout(() => {
    if (localStorage.getItem('access_token')) {
      debugPlantAPI().catch(console.error)
    }
  }, 2000)
} 