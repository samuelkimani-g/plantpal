#!/usr/bin/env bash

# Run migrations before starting the server
echo "🚀 Running database migrations..."
python manage.py migrate --settings=core.production_settings

# Start the server
echo "🚀 Starting server..."
gunicorn core.wsgi:application --settings=core.production_settings 