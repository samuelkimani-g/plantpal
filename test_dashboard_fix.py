#!/usr/bin/env python3

import os
import subprocess
import sys

def run_command(command, description):
    """Run a command and print the result"""
    print(f"\n🔧 {description}")
    print(f"Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd="backend")
        if result.returncode == 0:
            print(f"✅ Success: {description}")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"❌ Error: {description}")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    return True

def main():
    print("🌱 PlantPal Dashboard Fix Script")
    print("=" * 50)
    
    # 1. Create migrations
    if not run_command("python manage.py makemigrations plants", "Creating migrations for plant care streak"):
        return
    
    # 2. Apply migrations
    if not run_command("python manage.py migrate", "Applying migrations"):
        return
    
    # 3. Test if the backend starts
    print("\n🚀 Testing backend startup...")
    print("You should now:")
    print("1. Start your Django backend: cd backend && python manage.py runserver 8000")
    print("2. Start your ngrok tunnel: ngrok http 8000")
    print("3. Update your .env file with the new ngrok URL")
    print("4. Test the dashboard to see if the data updates properly")
    
    print("\n📊 Dashboard Changes Made:")
    print("✅ Added care_streak field to Plant model")
    print("✅ Added last_care_date field to Plant model") 
    print("✅ Updated water_plant() to increment care streak")
    print("✅ Updated fertilize endpoint to increment care streak")
    print("✅ Changed dashboard from 'Journal Streak' to 'Care Streak'")
    print("✅ Care streak shows real plant care data (water/fertilize)")
    print("✅ Total Entries shows real journal entry count")
    print("✅ Growth Progress shows real plant growth stage")
    
    print("\n🎯 How Care Streak Works:")
    print("• +1 streak when you water or fertilize your plant each day")
    print("• Only counts once per day (no matter how many times you care)")
    print("• Resets to 1 if you skip a day")
    print("• Continues from previous day if you care consistently")

if __name__ == "__main__":
    main() 