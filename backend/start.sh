#!/usr/bin/env bash

# Set Django settings module for production
export DJANGO_SETTINGS_MODULE=core.production_settings

# Run migrations before starting the server
echo "🚀 Running database migrations..."
python manage.py migrate

# Start the server
echo "🚀 Starting server..."
gunicorn core.wsgi:application 