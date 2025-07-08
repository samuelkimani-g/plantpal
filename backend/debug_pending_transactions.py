#!/usr/bin/env python3
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.payments.models import MpesaTransaction
from django.contrib.auth.models import User

def check_pending_transactions():
    print("=== Checking Pending Transactions ===")
    
    # Get all pending transactions
    pending_txns = MpesaTransaction.objects.filter(status='PENDING').order_by('-created_at')
    
    if not pending_txns.exists():
        print("No pending transactions found.")
        return
    
    print(f"Found {pending_txns.count()} pending transactions:")
    print()
    
    for txn in pending_txns:
        print(f"Transaction ID: {txn.id}")
        print(f"  User: {txn.user.username} ({txn.user.email})")
        print(f"  Type: {txn.transaction_type}")
        print(f"  Amount: KES {txn.amount}")
        print(f"  Phone: {txn.phone_number}")
        print(f"  Created: {txn.created_at}")
        print(f"  Checkout ID: {txn.checkout_request_id}")
        
        if txn.transaction_type == 'PREMIUM':
            print(f"  Premium Days: {txn.premium_days}")
            print(f"  Premium Package: {txn.premium_package.name if txn.premium_package else 'None'}")
        elif txn.transaction_type == 'LEAVES':
            print(f"  Leaves: {txn.leaves}")
        
        # Check if transaction is older than 2 hours (might be stuck)
        age = datetime.now(txn.created_at.tzinfo) - txn.created_at
        if age > timedelta(hours=2):
            print(f"  ⚠️  WARNING: Transaction is {age} old - might be stuck!")
        
        print()

def manual_complete_transaction(transaction_id, receipt_number="MANUAL_COMPLETE"):
    """Manually complete a pending transaction"""
    try:
        txn = MpesaTransaction.objects.get(id=transaction_id, status='PENDING')
        
        print(f"Manually completing transaction {transaction_id}...")
        print(f"  User: {txn.user.username}")
        print(f"  Type: {txn.transaction_type}")
        print(f"  Amount: KES {txn.amount}")
        
        # Mark as successful
        txn.mark_successful(
            receipt_number=receipt_number,
            result_code='0',
            result_desc='Manually completed by admin'
        )
        
        print(f"✅ Transaction {transaction_id} completed successfully!")
        print(f"   Receipt: {receipt_number}")
        
        if txn.transaction_type == 'PREMIUM':
            print(f"   Premium days granted: {txn.premium_days}")
            print(f"   User premium status: {txn.user.is_premium}")
            print(f"   Premium expires: {txn.user.premium_expiry_date}")
        elif txn.transaction_type == 'LEAVES':
            print(f"   Leaves granted: {txn.leaves}")
            print(f"   User total leaves: {txn.user.plantpal_leaves}")
        
    except MpesaTransaction.DoesNotExist:
        print(f"❌ Transaction {transaction_id} not found or not pending")
    except Exception as e:
        print(f"❌ Error completing transaction: {e}")

def show_recent_successful_transactions():
    print("\n=== Recent Successful Transactions ===")
    
    recent_successful = MpesaTransaction.objects.filter(
        status='SUCCESS'
    ).order_by('-created_at')[:5]
    
    for txn in recent_successful:
        print(f"ID: {txn.id} - {txn.transaction_type} - KES {txn.amount} - {txn.created_at}")
        print(f"  User: {txn.user.username} - Receipt: {txn.receipt_number}")

if __name__ == "__main__":
    check_pending_transactions()
    show_recent_successful_transactions()
    
    print("\n=== Manual Actions ===")
    print("To manually complete a pending transaction, use:")
    print("python debug_pending_transactions.py --complete <transaction_id> [receipt_number]")
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--complete':
        if len(sys.argv) >= 3:
            txn_id = int(sys.argv[2])
            receipt = sys.argv[3] if len(sys.argv) > 3 else f"MANUAL_{txn_id}_{int(datetime.now().timestamp())}"
            manual_complete_transaction(txn_id, receipt)
        else:
            print("Usage: python debug_pending_transactions.py --complete <transaction_id> [receipt_number]") 