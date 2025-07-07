#!/usr/bin/env python3
"""
Check user premium status and transaction history
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.payments.models import MpesaTransaction

def list_all_users():
    users = User.objects.all()
    print(f"Total users: {users.count()}")
    for user in users:
        print(f"  - {user.username} ({user.email}) - Premium: {user.is_premium}")

def check_user_status(email):
    try:
        user = User.objects.get(email=email)
        print(f"User: {user.username}")
        print(f"Email: {user.email}")
        print(f"Premium: {user.is_premium}")
        print(f"Premium expiry: {user.premium_expiry_date}")
        print(f"Leaves: {user.plantpal_leaves}")
        
        print("\nRecent transactions:")
        transactions = MpesaTransaction.objects.filter(user=user).order_by('-created_at')[:10]
        if transactions:
            for t in transactions:
                print(f"  {t.id}: {t.transaction_type} - {t.status} - KES {t.amount} - Premium Days: {t.premium_days} - {t.created_at}")
        else:
            print("  No transactions found")
            
        return user
    except User.DoesNotExist:
        print(f"User with email {email} not found")
        return None

if __name__ == "__main__":
    print("=== All Users ===")
    list_all_users()
    
    print("\n=== Checking specific user ===")
    check_user_status("sam@gmail.com") 