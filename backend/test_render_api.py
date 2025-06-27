#!/usr/bin/env python
"""
Test the Render API directly to see what error is returned
"""
import requests
import json
import time

def test_render_registration():
    url = "https://plantpal-4hx7.onrender.com/api/accounts/register/"
    
    # Test with a very strong password that should pass all validators
    data = {
        'username': 'testuser789',
        'email': 'testuser789@gmail.com',
        'password': 'SuperSecurePassword123!@#',
        'password_confirm': 'SuperSecurePassword123!@#'
    }
    
    print(f"Testing Render API: {url}")
    print(f"Data: {data}")
    
    try:
        # Add timeout and better error handling
        response = requests.post(
            url, 
            json=data, 
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Registration successful!")
            print(f"Response: {response.json()}")
        elif response.status_code == 502:
            print("❌ Service unavailable (502 Bad Gateway)")
            print("This means the Render service is down or still deploying")
            print("Raw response:", response.text[:500])
        else:
            print("❌ Registration failed!")
            try:
                error_data = response.json()
                print(f"Error Response: {error_data}")
                
                # Check specific error details
                if 'password_confirm' in error_data:
                    print(f"Password confirm error: {error_data['password_confirm']}")
                if 'password' in error_data:
                    print(f"Password error: {error_data['password']}")
                    
            except:
                print(f"Raw Response: {response.text[:500]}")
                
    except requests.exceptions.Timeout:
        print("❌ Request timed out - service may be down")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - service may be down")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def test_service_status():
    """Test if the service is responding at all"""
    try:
        response = requests.get("https://plantpal-4hx7.onrender.com/", timeout=10)
        print(f"Service status check: {response.status_code}")
        return response.status_code != 502
    except:
        print("Service is not responding")
        return False

if __name__ == '__main__':
    print("=== Testing Render Service Status ===")
    service_up = test_service_status()
    
    print("\n=== Testing Registration API ===")
    if service_up:
        test_render_registration()
    else:
        print("Skipping registration test - service appears to be down")
        print("This is likely because:")
        print("1. Render is still deploying the latest changes")
        print("2. Database migration issues are preventing startup")
        print("3. Temporary service outage")
        print("\nPlease wait a few minutes and try again.") 