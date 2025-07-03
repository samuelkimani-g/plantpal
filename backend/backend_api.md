🌳 PlantPal Backend Development: Weeks 1 & 2 Summary
This document provides a concise overview of the backend features developed for the PlantPal application during the first two weeks. The backend is built using Django and Django Rest Framework (DRF), designed to be a robust API for a future frontend application.

Week 1: Foundations & Core Journaling
In Week 1, we laid the essential groundwork for the entire backend and developed the core journaling functionality.

🛠️ Project Setup & Core Configuration
Django Project Initialized: Set up the main plantpal/backend Django project.

Virtual Environment: Ensured a clean development environment using my_env.

Django Rest Framework (DRF): Integrated DRF for building powerful RESTful APIs.

CORS Headers: Configured django-cors-headers to allow communication with the frontend.

🔐 User Authentication System
Custom User Model: Created a CustomUser model extending Django's AbstractUser for future flexibility.

JWT Authentication: Implemented JSON Web Token (JWT) based authentication using djangorestframework-simplejwt for secure user login and API access.

Endpoints for user registration, login (obtaining access/refresh tokens), and token refreshing.

📝 Journaling Feature
JournalEntry Model: Defined a model to store user-specific journal entries, including text, date, and a favorite flag.

API Endpoints: Created full CRUD (Create, Retrieve, Update, Delete) API endpoints for JournalEntry records.

Custom Permissions: Implemented IsOwner permission to ensure users can only manage their own journal entries.

Utility Functions: Added actions like latest_entry and mark_favorite.

Week 2: Enhanced Features & Robustness
Week 2 significantly expanded the application's capabilities by introducing plant tracking, mood logging, reminders, smart suggestions, and a focus on security and maintainability.

🌿 Plant Tracking Module
Plant Model: Introduced a model to track individual real-world plants (e.g., name, species, date added), linked to a User.

PlantLog Model: Created a model to record care activities for specific plants (e.g., watering, fertilizing, notes), linked to Plant.

CRUD APIs: Developed comprehensive CRUD endpoints for both /api/plants/plants/ and /api/plants/logs/.

Nested Serializers: Implemented nested PlantLogSerializer within PlantSerializer to show logs when a plant is retrieved.

🧠 Mood Tracking Module
MoodEntry Model: Designed a model to log a user's mood at a specific timestamp, along with an optional note.

CRUD API: Provided full CRUD functionality for /api/mood/moods/ endpoint.

Journal-Mood Link: Integrated a ForeignKey from JournalEntry to MoodEntry, preparing for future sentiment analysis to auto-assign moods.

⏰ Daily Reminders System
Reminder Model: Created a model to allow users to schedule reminders for themselves or specific plants, including title, description, and scheduled time.

CRUD API: Implemented API endpoints for /api/reminders/reminders/.

💡 Smart Suggestions Integration (Foundation)
get_suggestion Utility: Developed a utility function to provide basic, mood-based suggestions (e.g., "Take a walk in your garden" for "stressed" mood).

API Integration: Integrated this suggestion directly into the JournalEntry API response, making journal entries "smarter" with contextual advice.

🔒 Permissions, Validation & Deployment Prep
Rigorous Testing: Conducted extensive manual testing of all new API endpoints, verifying:

Permissions: Ensuring IsAuthenticated and IsOwner rules are correctly applied, limiting users to their own data.

Validation: Confirming serializer-level validations (e.g., minimum text length, future dates for reminders) are enforced.

Code Cleanup: Reviewed for modularity and consistent use of request.user.

Environment Variables: Configured SECRET_KEY, DEBUG, and ALLOWED_HOSTS to load securely from a .env file, preparing the project for production deployment.

Postman Collection: Generated a comprehensive Postman collection for streamlined API testing and interaction.

Next Steps: With this robust backend complete, the project is well-positioned to move into Week 3: Frontend Development (Vite react), where these powerful APIs will be consumed to build the user-facing application.

# PlantPal Backend API

Django REST API backend for the PlantPal mindfulness application with custom user model, AI integration, and plant growth mechanics.

## 💳 M-Pesa Payment System

### Payment Flow
PlantPal integrates with Safaricom's M-Pesa Daraja API for seamless mobile payments. All payments are routed to **0707953603**.

#### How it Works:
1. **User selects a leaf package** on the frontend
2. **User enters their M-Pesa phone number** (the number that will pay)
3. **Payment is initiated** via STK Push to user's phone
4. **User receives PIN prompt** on their phone
5. **Money is transferred** from user's M-Pesa to **0707953603**
6. **Leaves are automatically credited** to user's account
7. **SMS notifications** sent to both user and business owner

#### Payment Packages:
- **Starter Pack**: 10 leaves for KES 20 (KES 2.00 per leaf)
- **Growth Pack**: 25 leaves for KES 45 (KES 1.80 per leaf)
- **Garden Pack**: 50 leaves for KES 80 (KES 1.60 per leaf) 
- **Premium Pack**: 100 leaves for KES 150 (KES 1.50 per leaf)
- **Super Pack**: 200 leaves for KES 280 (KES 1.40 per leaf)

#### Key Configuration:
```python
# In mpesa_service.py
self.target_phone = '254707953603'  # All payments go here (0707953603)
self.business_shortcode = '174379'   # Sandbox shortcode
```

### API Endpoints

#### Payments
- `GET /api/payments/packages/` - List available leaf packages
- `POST /api/payments/initiate/` - Initiate M-Pesa payment
- `POST /api/payments/callback/` - M-Pesa callback handler
- `GET /api/payments/transactions/` - User's payment history
- `GET /api/payments/leaves/` - User's current leaf balance

#### Payment Flow Example:
```bash
# 1. Get available packages
GET /api/payments/packages/

# 2. Initiate payment
POST /api/payments/initiate/
{
  "package_id": 1,
  "phone_number": "0701234567"
}

# 3. User gets STK push on 0701234567
# 4. User enters PIN
# 5. Money goes to 0707953603
# 6. Callback updates transaction status
# 7. Leaves credited to user account
```

## 📚 API Endpoints