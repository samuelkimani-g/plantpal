#!/usr/bin/env python
"""
Setup script for PlantPal backend.
This script will create and apply all necessary migrations.
"""

import os
import sys
import subprocess

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main setup function"""
    print("🌱 PlantPal Backend Setup")
    print("=" * 30)
    
    # Check if we're in the right directory
    if not os.path.exists('manage.py'):
        print("❌ Error: manage.py not found. Please run this script from the Django project root.")
        sys.exit(1)
    
    # Install requirements
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("⚠️  Warning: Failed to install dependencies. Please install manually.")
    
    # Create migrations
    apps = ['accounts', 'plants', 'journal', 'moods', 'reminders']
    for app in apps:
        run_command(f"python manage.py makemigrations {app}", f"Creating migrations for {app}")
    
    # Apply migrations
    if not run_command("python manage.py migrate", "Applying database migrations"):
        print("❌ Migration failed. Please check the error above.")
        sys.exit(1)
    
    # Create superuser (optional)
    print("\n🔐 Would you like to create a superuser account?")
    create_superuser = input("Enter 'yes' to create superuser, or press Enter to skip: ").lower()
    
    if create_superuser == 'yes':
        run_command("python manage.py createsuperuser", "Creating superuser")
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Start the Django server: python manage.py runserver")
    print("2. Start the React frontend: npm run dev")
    print("3. Visit http://localhost:5173 to use the application")

if __name__ == '__main__':
    main()
