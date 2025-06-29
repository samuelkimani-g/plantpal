#!/usr/bin/env python
"""
Script to apply database migrations on Render production database.
This script should be run on the Render backend to ensure the preview_url field is nullable.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.production_settings')
django.setup()

from django.core.management import execute_from_command_line

def apply_migrations():
    """Apply all pending migrations"""
    print("Applying database migrations...")
    
    try:
        # Apply all migrations
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ All migrations applied successfully!")
        
        # Show migration status
        print("\nMigration status:")
        execute_from_command_line(['manage.py', 'showmigrations'])
        
    except Exception as e:
        print(f"❌ Error applying migrations: {e}")
        return False
    
    return True

if __name__ == '__main__':
    success = apply_migrations()
    sys.exit(0 if success else 1) 