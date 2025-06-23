#!/usr/bin/env python
"""
Fix migration state for Render deployment
This script will be run on Render to fix the database migration issues
"""

import os
import django
from django.conf import settings
from django.core.management import execute_from_command_line
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.production_settings')
django.setup()

def fix_migrations():
    """Fix migration state and ensure all tables exist"""
    
    print("🔧 Starting migration fix...")
    
    with connection.cursor() as cursor:
        # Check what tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"📊 Existing tables: {existing_tables}")
        
        # Check if plants_plant table exists and what columns it has
        if 'plants_plant' in existing_tables:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'plants_plant';
            """)
            plant_columns = [row[0] for row in cursor.fetchall()]
            print(f"🌱 Plants table columns: {plant_columns}")
            
            # If columns already exist, mark migrations as fake applied
            if 'combined_mood_score' in plant_columns:
                print("✅ Plant schema appears complete, marking migrations as applied...")
                os.system('python manage.py migrate plants 0004 --fake')
                os.system('python manage.py migrate plants 0005 --fake') 
                os.system('python manage.py migrate plants 0006 --fake')
        
        # Ensure all core Django tables exist
        print("🚀 Ensuring all Django tables exist...")
        os.system('python manage.py migrate')
        
    print("✅ Migration fix completed!")

if __name__ == '__main__':
    fix_migrations() 