#!/usr/bin/env python3
"""
Create test user account with premium status
"""

import os
import django
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from django.utils import timezone

def create_test_user():
    # Check if user already exists
    try:
        user = User.objects.get(email="sam@gmail.com")
        print(f"User {user.username} already exists")
        return user
    except User.DoesNotExist:
        pass
    
    # Create new user
    user = User.objects.create_user(
        username="sam",
        email="sam@gmail.com",
        password="password123",  # You can change this
        plantpal_leaves=10,  # Default leaves
        is_premium=True,  # Grant premium status
        premium_expiry_date=timezone.now() + timedelta(days=30)  # 30 days premium
    )
    
    print(f"✅ Created user: {user.username}")
    print(f"   Email: {user.email}")
    print(f"   Premium: {user.is_premium}")
    print(f"   Premium expires: {user.premium_expiry_date}")
    print(f"   Leaves: {user.plantpal_leaves}")
    
    return user

if __name__ == "__main__":
    create_test_user() 