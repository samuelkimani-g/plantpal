import requests
import json
import base64
from datetime import datetime
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class MpesaService:
    """Service for handling M-Pesa Daraja API integration"""
    
    def __init__(self):
        self.consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
        self.consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')
        self.business_shortcode = getattr(settings, 'MPESA_BUSINESS_SHORTCODE', '174379')
        self.passkey = getattr(settings, 'MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')
        self.callback_url = getattr(settings, 'MPESA_CALLBACK_URL', '')
        
        # Target phone number for payments - ALL PAYMENTS GO TO THIS NUMBER
        self.target_phone = '254707953603'  # This is where money is received: 0707953603
        
        # Use sandbox URLs for development
        self.base_url = 'https://sandbox.safaricom.co.ke' if getattr(settings, 'DEBUG', True) else 'https://api.safaricom.co.ke'
        self.access_token = None
        self.token_expiry = None
        
        # Log the configuration on initialization
        logger.info(f"M-Pesa Service initialized - Target phone: {self.target_phone}")
        logger.info(f"M-Pesa Service - Business shortcode: {self.business_shortcode}")
        logger.info(f"M-Pesa Service - Environment: {'Sandbox' if getattr(settings, 'DEBUG', True) else 'Production'}")
    
    def get_access_token(self):
        """Get M-Pesa access token"""
        if self.access_token and self.token_expiry and timezone.now() < self.token_expiry:
            return self.access_token
        
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        
        # Create base64 encoded credentials
        credentials = f"{self.consumer_key}:{self.consumer_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data.get('access_token')
            
            # Set token expiry (subtract 5 minutes for safety)
            expires_in = data.get('expires_in', 3600)
            # Convert to int in case it comes as string from API
            expires_in = int(expires_in)
            self.token_expiry = timezone.now() + timezone.timedelta(seconds=expires_in - 300)
            
            logger.info("M-Pesa access token obtained successfully")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get M-Pesa access token: {e}")
            raise Exception("Failed to authenticate with M-Pesa")
    
    def initiate_stk_push(self, phone_number, amount, reference, description="PlantPal Leaves Purchase"):
        """Initiate STK Push request"""
        access_token = self.get_access_token()
        
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        
        # Generate timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password_string = f"{self.business_shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        
        # Log payment details
        logger.info(f"🎯 INITIATING M-PESA PAYMENT:")
        logger.info(f"   • Customer phone: {phone_number}")
        logger.info(f"   • Amount: KES {amount}")
        logger.info(f"   • Reference: {reference}")
        logger.info(f"   • Description: {description}")
        logger.info(f"   • 💰 MONEY GOES TO: {self.target_phone} (0707953603)")
        logger.info(f"   • Business shortcode: {self.business_shortcode}")
        
        payload = {
            "BusinessShortCode": self.business_shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,  # Customer paying
            "PartyB": self.business_shortcode,  # Business receiving (linked to 0707953603)
            "PhoneNumber": phone_number,  # Phone to send prompt to
            "CallBackURL": self.callback_url,
            "AccountReference": reference,
            "TransactionDesc": f"{description} - PlantPal"
        }
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('ResponseCode') == '0':
                logger.info(f"✅ STK Push initiated successfully for {phone_number}")
                logger.info(f"   • Customer will receive PIN prompt on {phone_number}")
                logger.info(f"   • Payment will be credited to 0707953603")
                return {
                    'success': True,
                    'merchant_request_id': data.get('MerchantRequestID'),
                    'checkout_request_id': data.get('CheckoutRequestID'),
                    'response_code': data.get('ResponseCode'),
                    'response_description': data.get('ResponseDescription'),
                    'customer_message': data.get('CustomerMessage', f'Payment prompt sent to {phone_number}. Enter your M-Pesa PIN to complete the payment.')
                }
            else:
                logger.error(f"❌ STK Push failed: {data}")
                return {
                    'success': False,
                    'error': data.get('ResponseDescription', 'Unknown error'),
                    'response_code': data.get('ResponseCode')
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ STK Push request failed: {e}")
            return {
                'success': False,
                'error': 'Network error occurred'
            }
    
    def send_sms_notification(self, phone_number, message):
        """Send SMS notification (placeholder - integrate with SMS service)"""
        try:
            # In a real implementation, you would integrate with an SMS service like Africa's Talking
            # For now, we'll just log the SMS
            logger.info(f"SMS to {phone_number}: {message}")
            
            # You can integrate with Africa's Talking SMS API here
            # Example:
            # import africastalking
            # africastalking.initialize(username, api_key)
            # sms = africastalking.SMS
            # response = sms.send(message, [phone_number])
            
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {e}")
            return False
    
    def validate_callback_data(self, callback_data):
        """Validate M-Pesa callback data"""
        try:
            # Check if required fields are present
            required_fields = ['ResultCode', 'MerchantRequestID', 'CheckoutRequestID']
            for field in required_fields:
                if field not in callback_data:
                    logger.error(f"Missing required field in callback: {field}")
                    return False
            
            # Validate result code
            result_code = str(callback_data.get('ResultCode'))
            if result_code not in ['0', '1', '2']:  # 0=Success, 1=Insufficient funds, 2=Cancelled
                logger.error(f"Invalid result code: {result_code}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating callback data: {e}")
            return False
    
    def process_callback(self, callback_data):
        """Process M-Pesa callback data"""
        if not self.validate_callback_data(callback_data):
            return False
        
        try:
            from .models import MpesaTransaction
            
            # Find the transaction
            checkout_request_id = callback_data.get('CheckoutRequestID')
            transaction = MpesaTransaction.objects.filter(
                checkout_request_id=checkout_request_id,
                status='PENDING'
            ).first()
            
            if not transaction:
                logger.error(f"Transaction not found for checkout request ID: {checkout_request_id}")
                return False
            
            result_code = str(callback_data.get('ResultCode'))
            
            if result_code == '0':  # Success
                # Extract receipt number from callback data
                receipt_number = None
                callback_items = callback_data.get('CallbackMetadata', {}).get('Item', [])
                
                for item in callback_items:
                    if item.get('Name') == 'MpesaReceiptNumber':
                        receipt_number = item.get('Value')
                        break
                
                if not receipt_number:
                    logger.error("Receipt number not found in callback data")
                    return False
                
                # Mark transaction as successful
                transaction.mark_successful(
                    receipt_number=receipt_number,
                    result_code=result_code,
                    result_desc=callback_data.get('ResultDesc', 'Success')
                )
                
                # Send success SMS to user
                sms_message = f"✅ PlantPal: Payment successful! You received {transaction.leaves} leaves. Receipt: {receipt_number}. Happy gardening! 🌿"
                self.send_sms_notification(transaction.phone_number, sms_message)
                
                # Send notification SMS to your number (0707953603)
                owner_sms = f"💰 PlantPal Payment Received!\n• Amount: KES {transaction.amount}\n• From: {transaction.phone_number}\n• Leaves: {transaction.leaves}\n• Receipt: {receipt_number}\n• User: {transaction.user.username}"
                self.send_sms_notification(self.target_phone, owner_sms)
                
                logger.info(f"✅ PAYMENT SUCCESSFUL:")
                logger.info(f"   • Transaction {transaction.id} completed")
                logger.info(f"   • Customer: {transaction.phone_number}")
                logger.info(f"   • Amount: KES {transaction.amount}")
                logger.info(f"   • Leaves credited: {transaction.leaves}")
                logger.info(f"   • Receipt: {receipt_number}")
                logger.info(f"   • Money received by: 0707953603")
                return True
                
            else:  # Failed or cancelled
                transaction.mark_failed(
                    result_code=result_code,
                    result_desc=callback_data.get('ResultDesc', 'Transaction failed')
                )
                
                # Send failure SMS to user
                reason = callback_data.get('ResultDesc', 'Transaction failed')
                sms_message = f"❌ PlantPal: Payment failed - {reason}. Please try again or contact support."
                self.send_sms_notification(transaction.phone_number, sms_message)
                
                logger.info(f"Transaction {transaction.id} marked as failed")
                return True
                
        except Exception as e:
            logger.error(f"Error processing callback: {e}")
            return False 