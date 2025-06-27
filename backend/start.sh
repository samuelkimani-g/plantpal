#!/usr/bin/env bash

# Run migrations before starting the server
echo "🚀 Running database migrations..."
python manage.py migrate

# Start the server
echo "🚀 Starting server..."
gunicorn core.wsgi:application 