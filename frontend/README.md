# PlantPal Backend

Django REST API backend for the PlantPal mindfulness application with custom user model, AI integration, and plant growth mechanics.

## 🚀 Quick Setup

### 1. Create Virtual Environment
\`\`\`bash
python -m venv plantpal_env
source plantpal_env/bin/activate  # On Windows: plantpal_env\Scripts\activate
\`\`\`

### 2. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 3. Environment Variables
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

### 4. Run Migrations
\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

### 5. Create Superuser
\`\`\`bash
python manage.py createsuperuser
\`\`\`

### 6. Start Development Server
\`\`\`bash
python manage.py runserver
\`\`\`

The API will be available at `http://localhost:8000/api/`

## 📚 API Endpoints

### Authentication
- `POST /api/accounts/register/` - User registration
- `POST /api/accounts/login/` - User login (get JWT tokens)
- `POST /api/token/refresh/` - Refresh JWT token
- `GET/PATCH /api/accounts/profile/` - User profile
- `POST /api/accounts/logout/` - Logout (blacklist token)

### Journal
- `GET/POST /api/journal/entries/` - List/Create journal entries
- `GET/PUT/PATCH/DELETE /api/journal/entries/{id}/` - Manage specific entry
- `GET /api/journal/entries/latest_entry/` - Get latest entry
- `POST /api/journal/entries/{id}/mark_favorite/` - Toggle favorite
- `GET/POST /api/journal/prompts/` - Get journal prompts

### Plants
- `GET/POST /api/plants/plants/` - List/Create plants
- `GET/PUT/PATCH/DELETE /api/plants/plants/{id}/` - Manage specific plant
- `GET/POST /api/plants/logs/` - Plant care logs

### Moods
- `GET/POST /api/moods/moods/` - List/Create mood entries
- `GET/PUT/PATCH/DELETE /api/moods/moods/{id}/` - Manage specific mood

### Reminders
- `GET/POST /api/reminders/reminders/` - List/Create reminders
- `GET/PUT/PATCH/DELETE /api/reminders/reminders/{id}/` - Manage specific reminder

## 🤖 AI Features

### Sentiment Analysis
- Automatic mood detection from journal entries using NLTK VADER
- Creates linked MoodEntry objects with sentiment scores
- Affects plant growth based on emotional state

### Gemini AI Integration
- Journal prompt suggestions based on mood
- Requires `GEMINI_API_KEY` environment variable
- Fallback prompts if API unavailable

## 🌱 Plant Growth System

### Growth Mechanics
- Plants start at level 1 with 100% health
- Journal sentiment affects plant health (+/- based on mood)
- Care activities (watering, fertilizing) boost health
- Plants level up when health reaches 80%
- Maximum growth level: 10

### Health Status
- Excellent (80-100%)
- Good (60-79%)
- Fair (40-59%)
- Poor (20-39%)
- Critical (0-19%)

## 🔧 Configuration

### Custom User Model
Uses `CustomUser` extending Django's `AbstractUser` for future extensibility.

### JWT Settings
- Access token: 60 minutes
- Refresh token: 7 days
- Token rotation enabled
- Blacklisting after rotation

### CORS Settings
Configured for frontend development on ports 3000 and 5173.

## 🗄️ Database Models

### CustomUser
- Extended Django User model
- Future-ready for additional fields

### JournalEntry
- User's journal entries
- Linked to MoodEntry via foreign key
- Automatic sentiment analysis

### MoodEntry
- Mood tracking with type and numerical score
- Auto-generated from journal sentiment
- Manual creation also supported

### Plant
- Virtual plants with growth levels and health
- Species, care tracking, music boost
- Automatic health status calculation

### PlantLog
- Activity logging for plant care
- Growth impact tracking
- Supports various activity types

### Reminder
- User reminders with scheduling
- Optional plant association
- Recurring reminder support

## 🔄 Signals & Automation

### Journal → Mood Analysis
- Automatic sentiment analysis on journal creation
- Creates linked MoodEntry with sentiment score
- Uses NLTK VADER sentiment analyzer

### Mood → Plant Growth
- Journal sentiment affects plant health
- Positive moods boost health, negative moods reduce it
- Health threshold triggers growth level increases

### Plant Care Logging
- Watering and fertilizing activities logged
- Automatic health boosts from care activities
- Timestamp tracking for last care actions

## 🧪 Testing

### Test Registration
\`\`\`bash
curl -X POST http://localhost:8000/api/accounts/register/ \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "email": "test@example.com", "password": "testpass123", "password2": "testpass123"}'
\`\`\`

### Test Login
\`\`\`bash
curl -X POST http://localhost:8000/api/accounts/login/ \
-H "Content-Type: application/json" \
-d '{"username": "testuser", "password": "testpass123"}'
\`\`\`

### Test Journal Entry
\`\`\`bash
curl -X POST http://localhost:8000/api/journal/entries/ \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-d '{"text": "I feel amazing today! Everything is going well."}'
\`\`\`

## 📝 Development Notes

- All endpoints require authentication except registration and login
- Automatic sentiment analysis requires NLTK installation
- Plant growth mechanics are configurable via signal constants
- API documentation available at `/swagger/` and `/redoc/`
- SQLite for development, easily changeable to PostgreSQL

## 🚀 Production Deployment

1. Set `DEBUG=False` in environment
2. Configure PostgreSQL database
3. Set proper `ALLOWED_HOSTS`
4. Configure static file serving
5. Set up SSL/HTTPS
6. Configure proper CORS settings
7. Set up Gemini API key for AI features

---

**PlantPal Backend** - Where emotional growth nurtures virtual life 🌱✨
\`\`\`

Now let me update the frontend to work with your backend structure:

```typescriptreact file="src/services/api.js"
[v0-no-op-code-block-prefix]import axios from "axios"

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
  login: (credentials) => api.post("/accounts/login/", credentials),
  logout: (refreshToken) => api.post("/accounts/logout/", { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post("/token/refresh/", { refresh: refreshToken }),
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
