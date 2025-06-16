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