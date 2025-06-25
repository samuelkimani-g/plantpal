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
    # Test data that matches what frontend is sending
    test_data = {
        'username': 'sam',
        'email': 'sam@gmail.com',
        'password': 'kimani@90',
        'password_confirm': 'kimani@90'
    }
    
    print("Testing registration with data:")
    print(test_data)
    
    serializer = RegisterSerializer(data=test_data)
    
    if serializer.is_valid():
        print("✅ Validation passed!")
        user = serializer.save()
        print(f"✅ User created: {user.username}")
        return True
    else:
        print("❌ Validation failed!")
        print("Errors:", serializer.errors)
        return False

if __name__ == '__main__':
    test_registration() 