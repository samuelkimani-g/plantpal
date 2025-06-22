#!/usr/bin/env python3
"""
PlantPal API Testing Script
Tests all required APIs and services to ensure everything is working correctly.
"""

import os
import requests
import json
from datetime import datetime
import google.generativeai as genai
from firebase_admin import credentials, initialize_app, firestore
import spotipy
from spotipy.oauth2 import SpotifyOAuth

def test_environment_variables():
    """Test if all required environment variables are set."""
    print("🔍 Testing Environment Variables...")
    
    required_vars = {
        'DJANGO_SECRET_KEY': 'Django Secret Key',
        'GEMINI_API_KEY': 'Google Gemini API Key',
        'SPOTIFY_CLIENT_ID': 'Spotify Client ID',
        'SPOTIFY_CLIENT_SECRET': 'Spotify Client Secret',
        'FIREBASE_PROJECT_ID': 'Firebase Project ID',
        'FIREBASE_PRIVATE_KEY': 'Firebase Private Key',
        'FIREBASE_CLIENT_EMAIL': 'Firebase Client Email',
    }
    
    missing_vars = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing_vars.append(f"❌ {description} ({var})")
        else:
            print(f"✅ {description}")
    
    if missing_vars:
        print("\n❌ Missing Environment Variables:")
        for var in missing_vars:
            print(f"   {var}")
        return False
    
    print("✅ All environment variables are set!")
    return True

def test_gemini_api():
    """Test Google Gemini API connection."""
    print("\n🤖 Testing Google Gemini API...")
    
    try:
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Hello! Please respond with 'PlantPal is working!'")
        
        if "PlantPal is working" in response.text:
            print("✅ Gemini API is working correctly!")
            return True
        else:
            print(f"❌ Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Gemini API Error: {str(e)}")
        return False

def test_spotify_api():
    """Test Spotify API connection."""
    print("\n🎵 Testing Spotify API...")
    
    try:
        client_id = os.getenv('SPOTIFY_CLIENT_ID')
        client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        
        # Test basic API connection
        auth_url = "https://accounts.spotify.com/api/token"
        auth_response = requests.post(auth_url, {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
        })
        
        if auth_response.status_code == 200:
            print("✅ Spotify API credentials are valid!")
            return True
        else:
            print(f"❌ Spotify API Error: {auth_response.status_code} - {auth_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Spotify API Error: {str(e)}")
        return False

def test_firebase_connection():
    """Test Firebase connection."""
    print("\n🔥 Testing Firebase Connection...")
    
    try:
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
        })
        
        app = initialize_app(cred)
        db = firestore.client()
        
        # Test write operation
        test_doc = db.collection('test').document('api_test')
        test_doc.set({
            'timestamp': datetime.now().isoformat(),
            'message': 'PlantPal API test successful'
        })
        
        # Test read operation
        doc = test_doc.get()
        if doc.exists:
            print("✅ Firebase connection and operations working!")
            # Clean up test document
            test_doc.delete()
            return True
        else:
            print("❌ Firebase read operation failed")
            return False
            
    except Exception as e:
        print(f"❌ Firebase Error: {str(e)}")
        return False

def test_django_server():
    """Test Django server endpoints."""
    print("\n🐍 Testing Django Server...")
    
    try:
        # Test if Django server is running
        response = requests.get('http://localhost:8000/admin/', timeout=5)
        if response.status_code in [200, 302]:  # 302 is redirect to login
            print("✅ Django server is running!")
            return True
        else:
            print(f"❌ Django server returned status: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Django server is not running. Start it with: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ Django server error: {str(e)}")
        return False

def test_api_endpoints():
    """Test Django REST API endpoints."""
    print("\n🌐 Testing API Endpoints...")
    
    base_url = "http://localhost:8000/api"
    endpoints = [
        "/accounts/register/",
        "/accounts/login/",
        "/journal/entries/",
        "/plants/plants/",
        "/moods/moods/",
        "/reminders/reminders/",
    ]
    
    working_endpoints = 0
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code in [200, 401, 405]:  # 401 = auth required, 405 = method not allowed
                print(f"✅ {endpoint} - Status: {response.status_code}")
                working_endpoints += 1
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {str(e)}")
    
    if working_endpoints == len(endpoints):
        print("✅ All API endpoints are accessible!")
        return True
    else:
        print(f"❌ {len(endpoints) - working_endpoints} endpoints failed")
        return False

def main():
    """Run all API tests."""
    print("🌱 PlantPal API Testing Suite")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Google Gemini API", test_gemini_api),
        ("Spotify API", test_spotify_api),
        ("Firebase Connection", test_firebase_connection),
        ("Django Server", test_django_server),
        ("API Endpoints", test_api_endpoints),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} - Unexpected error: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Your PlantPal setup is ready to go!")
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")
    
    return passed == len(results)

if __name__ == "__main__":
    main() 