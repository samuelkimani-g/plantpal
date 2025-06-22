#!/usr/bin/env python3
"""
PlantPal ngrok Setup Script
Helps set up ngrok tunneling for Spotify integration
"""

import subprocess
import sys
import time
import requests
import json
import os
from pathlib import Path

def check_ngrok_installed():
    """Check if ngrok is installed and accessible"""
    try:
        result = subprocess.run(['ngrok', 'version'], capture_output=True, text=True)
        print(f"✅ ngrok found: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("❌ ngrok not found. Please install ngrok first:")
        print("   1. Download from https://ngrok.com/download")
        print("   2. Extract to a folder in your PATH")
        print("   3. Run 'ngrok authtoken YOUR_TOKEN' with your auth token")
        return False

def start_ngrok_tunnel(port=8000):
    """Start ngrok tunnel for the specified port"""
    print(f"🚀 Starting ngrok tunnel for port {port}...")
    
    try:
        # Start ngrok in background
        process = subprocess.Popen([
            'ngrok', 'http', str(port),
            '--log=stdout'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Wait a moment for ngrok to start
        time.sleep(3)
        
        # Get tunnel info from ngrok API
        try:
            response = requests.get('http://127.0.0.1:4040/api/tunnels')
            tunnels = response.json()
            
            if tunnels['tunnels']:
                public_url = tunnels['tunnels'][0]['public_url']
                print(f"✅ ngrok tunnel active: {public_url}")
                
                # Update environment file if it exists
                update_env_file(public_url)
                
                print("\n" + "="*60)
                print("🎵 SPOTIFY SETUP INSTRUCTIONS")
                print("="*60)
                print(f"1. Go to https://developer.spotify.com/dashboard")
                print(f"2. Select your app or create a new one")
                print(f"3. Go to 'Edit Settings'")
                print(f"4. Add this Redirect URI:")
                print(f"   {public_url}/music")
                print(f"5. Save the settings")
                print(f"6. Your app will be accessible at: {public_url}")
                print("="*60)
                
                return process, public_url
            else:
                print("❌ No tunnels found")
                return None, None
                
        except requests.exceptions.ConnectionError:
            print("❌ Could not connect to ngrok API. Make sure ngrok is running.")
            return None, None
            
    except Exception as e:
        print(f"❌ Error starting ngrok: {e}")
        return None, None

def update_env_file(public_url):
    """Update environment file with ngrok URL"""
    env_files = ['.env', '.env.local', 'frontend/.env', 'frontend/.env.local']
    
    for env_file in env_files:
        if os.path.exists(env_file):
            print(f"📝 Updating {env_file} with ngrok URL...")
            
            # Read existing content
            with open(env_file, 'r') as f:
                lines = f.readlines()
            
            # Update or add VITE_API_URL
            updated = False
            for i, line in enumerate(lines):
                if line.startswith('VITE_API_URL='):
                    lines[i] = f'VITE_API_URL={public_url}/api\n'
                    updated = True
                    break
            
            if not updated:
                lines.append(f'VITE_API_URL={public_url}/api\n')
            
            # Write back
            with open(env_file, 'w') as f:
                f.writelines(lines)
            
            print(f"✅ Updated {env_file}")
            break

def monitor_tunnel(process):
    """Monitor the tunnel and provide helpful information"""
    print("\n🔄 Tunnel is running. Press Ctrl+C to stop.")
    print("💡 Tips:")
    print("   - Keep this terminal open while testing Spotify")
    print("   - Your Django server should be running on port 8000")
    print("   - Your React app should be running on port 5173")
    print("   - Use the ngrok URL for Spotify redirect URI")
    
    try:
        while True:
            # Check if process is still running
            if process.poll() is not None:
                print("❌ ngrok process stopped unexpectedly")
                break
            
            time.sleep(5)
            
            # Optionally check tunnel status
            try:
                response = requests.get('http://127.0.0.1:4040/api/tunnels', timeout=2)
                if response.status_code != 200:
                    print("⚠️ ngrok API not responding")
            except:
                pass
                
    except KeyboardInterrupt:
        print("\n🛑 Stopping ngrok tunnel...")
        process.terminate()
        process.wait()
        print("✅ Tunnel stopped")

def main():
    print("🌱 PlantPal ngrok Setup")
    print("=" * 30)
    
    # Check if ngrok is installed
    if not check_ngrok_installed():
        sys.exit(1)
    
    # Check if Django server is likely running
    try:
        response = requests.get('http://localhost:8000/api/', timeout=2)
        print("✅ Django server detected on port 8000")
    except:
        print("⚠️ Django server not detected on port 8000")
        print("   Make sure to run: python manage.py runserver 8000")
        print("   Continue anyway? (y/n): ", end="")
        if input().lower() != 'y':
            sys.exit(1)
    
    # Start tunnel
    process, public_url = start_ngrok_tunnel()
    
    if process and public_url:
        monitor_tunnel(process)
    else:
        print("❌ Failed to start ngrok tunnel")
        sys.exit(1)

if __name__ == "__main__":
    main() 