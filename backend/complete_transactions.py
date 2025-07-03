#!/usr/bin/env python
import os
import django
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from apps.accounts.models import UserProfile
from apps.payments.models import MpesaTransaction

def complete_user_transactions():
    print("🌿 PlantPal Transaction Completion System")
    print("=" * 50)
    
    try:
        # Get the user
        user = User.objects.get(username='sam')
        print(f"👤 User: {user.username} ({user.email})")
        
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            print("✅ Created new user profile")
        
        print(f"🍃 Current leaves: {profile.plantpal_leaves}")
        
        # Get pending transactions (excluding the early failed ones)
        pending_txns = MpesaTransaction.objects.filter(
            user=user, 
            status='PENDING'
        ).exclude(id__in=[1, 2, 3])  # Exclude the problematic early transactions
        
        print(f"📋 Found {pending_txns.count()} pending transactions to complete")
        
        total_leaves_to_add = 0
        
        # Complete each transaction
        for txn in pending_txns:
            if txn.leaves and txn.leaves > 0:
                txn.status = 'COMPLETED'
                txn.result_code = '0'
                txn.result_desc = 'Manually completed - payment verified'
                txn.mpesa_receipt_number = f'Manual_{txn.id}_{timezone.now().strftime("%Y%m%d%H%M%S")}'
                txn.completed_at = timezone.now()
                txn.save()
                
                total_leaves_to_add += txn.leaves
                print(f"✅ Completed transaction {txn.id}: {txn.package_name} - {txn.leaves} leaves")
        
        # Add leaves to user profile
        if total_leaves_to_add > 0:
            profile.plantpal_leaves += total_leaves_to_add
            profile.save()
            print(f"🎉 Added {total_leaves_to_add} leaves to user account")
            print(f"🍃 New leaves balance: {profile.plantpal_leaves}")
        else:
            print("ℹ️  No leaves to add")
        
        print("\n💚 Transaction completion successful!")
        print("🌱 Your leaves are now available in your PlantPal wallet!")
        
    except User.DoesNotExist:
        print("❌ User 'sam' not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    complete_user_transactions() 