#!/usr/bin/env python
"""
Test registration serializer to debug validation issues
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.serializers import RegisterSerializer

def test_registration():
    # Test different passwords
    test_cases = [
        {
            'name': 'Original password',
            'data': {
                'username': 'sam',
                'email': 'sam@gmail.com',
                'password': 'kimani@90',
                'password_confirm': 'kimani@90'
            }
        },
        {
            'name': 'Strong password',
            'data': {
                'username': 'sam2',
                'email': 'sam2@gmail.com',
                'password': 'StrongPassword123!',
                'password_confirm': 'StrongPassword123!'
            }
        },
        {
            'name': 'Different user, same original password',
            'data': {
                'username': 'testuser',
                'email': 'test@gmail.com',
                'password': 'kimani@90',
                'password_confirm': 'kimani@90'
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        print(f"Data: {test_case['data']}")
        
        serializer = RegisterSerializer(data=test_case['data'])
        
        if serializer.is_valid():
            print("✅ Validation passed!")
            try:
                user = serializer.save()
                print(f"✅ User created: {user.username}")
            except Exception as e:
                print(f"❌ User creation failed: {e}")
        else:
            print("❌ Validation failed!")
            print("Errors:", serializer.errors)

if __name__ == '__main__':
    test_registration() 