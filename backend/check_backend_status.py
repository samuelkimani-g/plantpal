#!/usr/bin/env python3
"""
Check backend status and user data
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.payments.models import MpesaTransaction, LeafPackage, PremiumPackage
from apps.store.models import StoreItem

def check_backend_status():
    print("=== Backend Status Check ===")
    
    # Check users
    users = User.objects.all()
    print(f"\n👥 Users: {users.count()}")
    for user in users:
        print(f"  - {user.username} ({user.email})")
        print(f"    Premium: {user.is_premium}")
        print(f"    Premium expiry: {user.premium_expiry_date}")
        print(f"    Leaves: {user.plantpal_leaves}")
    
    # Check packages
    leaf_packages = LeafPackage.objects.all()
    print(f"\n🍃 Leaf Packages: {leaf_packages.count()}")
    for pkg in leaf_packages:
        print(f"  - {pkg.name}: {pkg.leaves} leaves for KES {pkg.price}")
    
    premium_packages = PremiumPackage.objects.all()
    print(f"\n⭐ Premium Packages: {premium_packages.count()}")
    for pkg in premium_packages:
        print(f"  - {pkg.name}: {pkg.duration_days} days for KES {pkg.price}")
    
    # Check store items
    store_items = StoreItem.objects.all()
    print(f"\n🛍️ Store Items: {store_items.count()}")
    for item in store_items[:5]:  # Show first 5
        print(f"  - {item.name}: KES {item.price} ({item.item_type})")
    
    # Check recent transactions
    transactions = MpesaTransaction.objects.all().order_by('-created_at')[:5]
    print(f"\n💰 Recent Transactions: {transactions.count()}")
    for txn in transactions:
        print(f"  - {txn.user.username}: {txn.transaction_type} - KES {txn.amount} ({txn.status})")

if __name__ == "__main__":
    check_backend_status() 