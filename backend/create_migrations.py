#!/usr/bin/env python
"""
Script to create and apply migrations for the updated CustomUser model.
Run this script to update your database schema.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

def create_and_apply_migrations():
    """Create and apply migrations"""
    print("Creating migrations...")
    
    # Create migrations
    execute_from_command_line(['manage.py', 'makemigrations', 'accounts'])
    execute_from_command_line(['manage.py', 'makemigrations', 'plants'])
    execute_from_command_line(['manage.py', 'makemigrations', 'journal'])
    execute_from_command_line(['manage.py', 'makemigrations', 'moods'])
    execute_from_command_line(['manage.py', 'makemigrations', 'reminders'])
    
    print("\nApplying migrations...")
    
    # Apply migrations
    execute_from_command_line(['manage.py', 'migrate'])
    
    print("\nMigrations completed successfully!")
    print("You can now start the Django server with: python manage.py runserver")

if __name__ == '__main__':
    setup_django()
    create_and_apply_migrations()
