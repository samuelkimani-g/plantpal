#!/usr/bin/env python3
"""
Test premium transaction processing
"""

import os
import django
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.payments.models import MpesaTransaction, PremiumPackage
from django.utils import timezone

def test_premium_transaction():
    # Get the user
    try:
        user = User.objects.get(email="sam@gmail.com")
    except User.DoesNotExist:
        print("User not found, creating test user...")
        user = User.objects.create_user(
            username="sam",
            email="sam@gmail.com",
            password="password123",
            plantpal_leaves=10
        )
    
    # Get or create a premium package
    premium_package, created = PremiumPackage.objects.get_or_create(
        name="30 Day Premium",
        defaults={
            'duration_days': 30,
            'price': 500,
            'bonus_leaves': 50,
            'description': "30 days of premium access + 50 bonus leaves"
        }
    )
    
    if created:
        print(f"Created premium package: {premium_package}")
    
    # Create a test transaction
    transaction = MpesaTransaction.objects.create(
        user=user,
        premium_package=premium_package,
        transaction_type='PREMIUM',
        amount=premium_package.price,
        leaves=0,  # No direct leaves for premium
        premium_days=premium_package.duration_days,
        phone_number="254707953603",
        checkout_request_id="test_checkout_123",
        status='PENDING'
    )
    
    print(f"Created test transaction: {transaction}")
    print(f"User before transaction:")
    print(f"  - Premium: {user.is_premium}")
    print(f"  - Premium expiry: {user.premium_expiry_date}")
    print(f"  - Leaves: {user.plantpal_leaves}")
    
    # Simulate successful callback
    success = transaction.mark_successful(
        receipt_number="TEST123456",
        result_code="0",
        result_desc="Success"
    )
    
    # Refresh user from database
    user.refresh_from_db()
    
    print(f"\nTransaction processing result: {success}")
    print(f"User after transaction:")
    print(f"  - Premium: {user.is_premium}")
    print(f"  - Premium expiry: {user.premium_expiry_date}")
    print(f"  - Leaves: {user.plantpal_leaves}")
    print(f"  - Transaction status: {transaction.status}")
    
    return transaction

if __name__ == "__main__":
    test_premium_transaction() 