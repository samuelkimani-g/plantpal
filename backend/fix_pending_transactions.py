#!/usr/bin/env python3
import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.payments.models import MpesaTransaction
from django.contrib.auth.models import User

def check_and_fix_pending_transactions():
    print("=== FIXING PENDING TRANSACTIONS ===")
    
    # Get all pending transactions
    pending_txns = MpesaTransaction.objects.filter(status='PENDING').order_by('-created_at')
    
    if not pending_txns.exists():
        print("No pending transactions found in local database.")
        print("The pending transactions you're seeing are likely in the production database.")
        print("\n=== PRODUCTION TRANSACTION FIX ===")
        print("To fix the production pending transactions, you need to:")
        print("1. Access the production database")
        print("2. Manually complete the transactions")
        print("3. Or fix the M-Pesa callback URL")
        return
    
    print(f"Found {pending_txns.count()} pending transactions in local database:")
    print()
    
    for txn in pending_txns:
        print(f"Transaction ID: {txn.id}")
        print(f"  User: {txn.user.username} ({txn.user.email})")
        print(f"  Type: {txn.transaction_type}")
        print(f"  Amount: KES {txn.amount}")
        print(f"  Phone: {txn.phone_number}")
        print(f"  Created: {txn.created_at}")
        print(f"  Checkout ID: {txn.checkout_request_id}")
        
        # Check if transaction is older than 1 hour (definitely stuck)
        age = datetime.now(txn.created_at.tzinfo) - txn.created_at
        if age > timedelta(hours=1):
            print(f"  ⚠️  STUCK TRANSACTION: {age} old - completing manually...")
            
            # Manually complete the transaction
            receipt_number = f"MANUAL_{txn.id}_{int(datetime.now().timestamp())}"
            txn.mark_successful(
                receipt_number=receipt_number,
                result_code='0',
                result_desc='Manually completed - M-Pesa callback issue'
            )
            
            print(f"  ✅ COMPLETED: Receipt {receipt_number}")
            
            if txn.transaction_type == 'PREMIUM':
                print(f"  ✅ Premium days granted: {txn.premium_days}")
                print(f"  ✅ User premium status: {txn.user.is_premium}")
            elif txn.transaction_type == 'LEAVES':
                print(f"  ✅ Leaves granted: {txn.leaves}")
                print(f"  ✅ User total leaves: {txn.user.plantpal_leaves}")
        else:
            print(f"  ⏳ Recent transaction: {age} old - might complete automatically")
        
        print()

def check_mpesa_configuration():
    print("\n=== M-PESA CONFIGURATION CHECK ===")
    
    from django.conf import settings
    
    print(f"Callback URL: {getattr(settings, 'MPESA_CALLBACK_URL', 'NOT SET')}")
    print(f"Environment: {getattr(settings, 'MPESA_ENV', 'NOT SET')}")
    print(f"Business Shortcode: {getattr(settings, 'MPESA_BUSINESS_SHORTCODE', 'NOT SET')}")
    print(f"Consumer Key: {'SET' if getattr(settings, 'MPESA_CONSUMER_KEY', '') else 'NOT SET'}")
    print(f"Consumer Secret: {'SET' if getattr(settings, 'MPESA_CONSUMER_SECRET', '') else 'NOT SET'}")
    print(f"Passkey: {'SET' if getattr(settings, 'MPESA_PASSKEY', '') else 'NOT SET'}")
    
    # Check if callback URL is accessible
    callback_url = getattr(settings, 'MPESA_CALLBACK_URL', '')
    if callback_url:
        print(f"\nCallback URL Status: {callback_url}")
        print("This URL should be accessible by M-Pesa servers")
        print("If callbacks are not working, check:")
        print("1. URL is publicly accessible")
        print("2. Server is running and responding")
        print("3. M-Pesa credentials are correct")
        print("4. Business shortcode is active")

def create_test_callback():
    print("\n=== TESTING CALLBACK ENDPOINT ===")
    
    # Create a test callback payload
    test_callback = {
        "ResultCode": "0",
        "ResultDesc": "Success",
        "MerchantRequestID": "TEST_MERCHANT_ID",
        "CheckoutRequestID": "TEST_CHECKOUT_ID",
        "CallbackMetadata": {
            "Item": [
                {"Name": "MpesaReceiptNumber", "Value": f"TEST_RECEIPT_{int(datetime.now().timestamp())}"},
                {"Name": "TransactionAmount", "Value": 20},
                {"Name": "TransactionDate", "Value": "20250708134237"}
            ]
        }
    }
    
    print("Test callback payload created:")
    print(f"  ResultCode: {test_callback['ResultCode']}")
    print(f"  CheckoutRequestID: {test_callback['CheckoutRequestID']}")
    print(f"  Receipt: {test_callback['CallbackMetadata']['Item'][0]['Value']}")
    
    print("\nTo test the callback endpoint manually:")
    print("1. Create a pending transaction")
    print("2. Use this payload to test the callback")
    print("3. Check if the transaction gets completed")

def provide_solutions():
    print("\n=== IMMEDIATE SOLUTIONS ===")
    print("\n1. MANUAL COMPLETION (Recommended for stuck transactions):")
    print("   - Access production database")
    print("   - Find pending transactions")
    print("   - Mark them as successful manually")
    print("   - Update user premium status and leaves")
    
    print("\n2. FIX M-PESA CALLBACK URL:")
    print("   - Ensure callback URL is publicly accessible")
    print("   - Check server logs for callback attempts")
    print("   - Verify M-Pesa credentials")
    
    print("\n3. ALTERNATIVE SOLUTION:")
    print("   - Implement webhook retry mechanism")
    print("   - Add manual completion endpoint")
    print("   - Set up monitoring for stuck transactions")
    
    print("\n4. FOR PRODUCTION DATABASE:")
    print("   - Connect to production database")
    print("   - Run: UPDATE payments_mpesatransaction SET status='SUCCESS' WHERE status='PENDING'")
    print("   - Update user premium status accordingly")

if __name__ == "__main__":
    check_and_fix_pending_transactions()
    check_mpesa_configuration()
    create_test_callback()
    provide_solutions()
    
    print("\n=== SUMMARY ===")
    print("The pending transactions you're seeing are in the PRODUCTION database.")
    print("The local database doesn't have them because they were created on production.")
    print("You need to either:")
    print("1. Manually complete them in production database")
    print("2. Fix the M-Pesa callback system")
    print("3. Implement a retry mechanism") 