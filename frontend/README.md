# PlantPal Backend

Django REST API backend for the PlantPal mindfulness application with custom user model, AI integration, and plant growth mechanics.



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

