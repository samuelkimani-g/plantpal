#!/usr/bin/env bash

# Set Django settings module for production
export DJANGO_SETTINGS_MODULE=core.production_settings

# Run migrations before starting the server
echo "🚀 Running database migrations..."
python manage.py migrate --verbosity=2

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed! Check the logs above."
    exit 1
fi

# Show migration status for debugging
echo "📊 Current migration status:"
python manage.py showmigrations

# Start the server
echo "🚀 Starting server..."
gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120 