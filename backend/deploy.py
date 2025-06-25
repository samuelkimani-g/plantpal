#!/usr/bin/env python
"""
Deployment script for Render.com
This script handles database migrations and initial setup
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

def deploy():
    """Execute deployment tasks"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
    
    print("Starting deployment...")
    
    # Run migrations
    print("Running database migrations...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    # Collect static files
    print("Collecting static files...")
    execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
    
    print("Deployment completed successfully!")

if __name__ == '__main__':
    deploy() 