#!/usr/bin/env python3
"""
Production deployment script for PlantPal
This script should be run after deployment to set up the database
"""

import os
import sys
import subprocess

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def deploy_production():
    """Run production deployment steps"""
    print("🚀 Starting PlantPal production deployment...")
    
    # Run migrations
    if not run_command("python manage.py migrate", "Running database migrations"):
        return False
    
    # Create packages
    if not run_command("python manage.py create_packages", "Creating default packages"):
        return False
    
    # Collect static files (if needed)
    if not run_command("python manage.py collectstatic --noinput", "Collecting static files"):
        print("⚠️ Static files collection failed, but continuing...")
    
    print("🎉 Production deployment completed successfully!")
    return True

if __name__ == "__main__":
    success = deploy_production()
    sys.exit(0 if success else 1) 