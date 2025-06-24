import os
import dj_database_url
from .settings import *

# Production settings for Render
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Allowed hosts configured by environment variable for flexibility
# The string should be a comma-separated list of hostnames.
ALLOWED_HOSTS_STRING = os.environ.get('ALLOWED_HOSTS', 'plantpal-4hx7.onrender.com,localhost,127.0.0.1')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STRING.split(',') if host.strip()]

# Ensure the Render domain is always included
if 'plantpal-4hx7.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('plantpal-4hx7.onrender.com')

# Database configuration for Render
if 'DATABASE_URL' in os.environ:
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }
else:
    # Fallback to SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# CORS settings for production, configured by environment variable
CORS_ALLOWED_ORIGINS_STRING = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://plantpal-three.vercel.app,http://localhost:5173,https://localhost:5173')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_STRING.split(',') if origin.strip()]

# Ensure the Vercel frontend is always included
if 'https://plantpal-three.vercel.app' not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append('https://plantpal-three.vercel.app')

CORS_ALLOW_CREDENTIALS = True

# Additional CORS headers for ngrok/Render
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'ngrok-skip-browser-warning',
]

# Static files settings for production
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files settings
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security settings for production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Spotify settings from environment
SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID', '')
SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET', '')
# This URI must point to your BACKEND callback endpoint
SPOTIFY_REDIRECT_URI = os.environ.get('SPOTIFY_REDIRECT_URI', 'https://plantpal-4hx7.onrender.com/api/accounts/spotify/callback/')

# Gemini API key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Use environment secret key or generate one
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-render-production-key-change-this')

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
    },
} 