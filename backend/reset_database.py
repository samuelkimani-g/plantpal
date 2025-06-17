#!/usr/bin/env python
"""
Script to reset the database and create a fresh one.
WARNING: This will delete all existing data!
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

def reset_database():
    """Reset the database"""
    print("WARNING: This will delete all existing data!")
    confirm = input("Are you sure you want to continue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    print("Removing existing database...")
    
    # Remove the database file
    db_path = 'db.sqlite3'
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed {db_path}")
    
    # Remove migration files (except __init__.py)
    apps = ['accounts', 'plants', 'journal', 'moods', 'reminders']
    for app in apps:
        migrations_dir = f'apps/{app}/migrations'
        if os.path.exists(migrations_dir):
            for file in os.listdir(migrations_dir):
                if file.endswith('.py') and file != '__init__.py':
                    file_path = os.path.join(migrations_dir, file)
                    os.remove(file_path)
                    print(f"Removed {file_path}")
    
    print("\nCreating fresh migrations...")
    
    # Create new migrations
    for app in apps:
        execute_from_command_line(['manage.py', 'makemigrations', app])
    
    print("\nApplying migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    print("\nCreating superuser...")
    execute_from_command_line(['manage.py', 'createsuperuser'])
    
    print("\nDatabase reset completed!")

if __name__ == '__main__':
    setup_django()
    reset_database()
