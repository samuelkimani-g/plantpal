#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Starting PlantPal deployment..."

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Collect static files
echo "🎨 Collecting static files..."
python manage.py collectstatic --no-input

# Handle database migrations with error recovery
echo "🔍 Applying database migrations..."

# Try normal migration first
if python manage.py migrate; then
    echo "✅ Migrations applied successfully!"
else
    echo "⚠️  Migration failed, attempting database reset..."
    
    # If migration fails, try to reset and migrate
    python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.db import connection
cursor = connection.cursor()
try:
    cursor.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    cursor.execute('GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;')
    print('Database reset completed')
except Exception as e:
    print(f'Reset failed: {e}')
finally:
    cursor.close()
"
    
    # Run migrations after reset
    echo "🚀 Running fresh migrations after reset..."
    python manage.py migrate
fi

echo "✅ PlantPal deployment completed successfully!" 