from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from .models import LeafPackage, PremiumPackage, MpesaTransaction, WateringTransaction
from .serializers import (
    LeafPackageSerializer, PremiumPackageSerializer, MpesaTransactionSerializer, InitiatePaymentSerializer,
    InitiatePremiumPaymentSerializer, WateringTransactionSerializer, PublicUserSerializer, PublicPlantSerializer
)
from .mpesa_service import MpesaService
from apps.plants.models import Plant
import logging

logger = logging.getLogger(__name__)

class DebugMpesaConfigView(APIView):
    """Debug endpoint to check M-Pesa configuration"""
    permission_classes = [AllowAny]  # Temporarily allow anyone to access this
    
    def get(self, request):
        """Get current M-Pesa configuration (without sensitive data)"""
        mpesa_service = MpesaService()
        
        config = {
            'mpesa_env': mpesa_service.mpesa_env,
            'base_url': mpesa_service.base_url,
            'business_shortcode': mpesa_service.business_shortcode,
            'callback_url': mpesa_service.callback_url,
            'target_phone': mpesa_service.target_phone,
            'has_consumer_key': bool(mpesa_service.consumer_key),
            'has_consumer_secret': bool(mpesa_service.consumer_secret),
            'has_passkey': bool(mpesa_service.passkey),
            'django_debug': getattr(settings, 'DEBUG', None),
        }
        
        return Response({
            'success': True,
            'config': config,
            'message': 'M-Pesa configuration debug info'
        })

class ManualCompleteTransactionView(APIView):
    """Manually complete a stuck pending transaction (for testing/debugging)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Manually complete a pending transaction"""
        try:
            transaction_id = request.data.get('transaction_id')
            
            if not transaction_id:
                return Response({
                    'success': False,
                    'error': 'transaction_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find the pending transaction for this user
            transaction = MpesaTransaction.objects.filter(
                id=transaction_id,
                user=request.user,
                status='PENDING'
            ).first()
            
            if not transaction:
                return Response({
                    'success': False,
                    'error': 'Pending transaction not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Manually mark as successful (simulating successful callback)
            fake_receipt = f"MANUAL{transaction.id}{timezone.now().strftime('%Y%m%d%H%M%S')}"
            transaction.mark_successful(
                receipt_number=fake_receipt,
                result_code="0",
                result_desc="Manually completed - money was deducted"
            )
            
            logger.info(f"✅ MANUALLY COMPLETED TRANSACTION:")
            logger.info(f"   • Transaction {transaction.id}")
            logger.info(f"   • User: {transaction.user.username}")
            logger.info(f"   • Amount: KES {transaction.amount}")
            logger.info(f"   • Leaves credited: {transaction.leaves}")
            logger.info(f"   • Receipt: {fake_receipt}")
            
            return Response({
                'success': True,
                'message': f'Transaction completed! {transaction.leaves} leaves have been credited to your account.',
                'transaction': {
                    'id': transaction.id,
                    'status': transaction.status,
                    'leaves': transaction.leaves,
                    'amount': transaction.amount,
                    'receipt_number': transaction.mpesa_receipt_number
                }
            })
            
        except Exception as e:
            logger.error(f"Error manually completing transaction: {e}")
            return Response({
                'success': False,
                'error': 'Failed to complete transaction'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InitiatePremiumPaymentView(APIView):
    """View for initiating M-Pesa payment for premium packages"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Initiate STK Push payment for premium"""
        try:
            serializer = InitiatePremiumPaymentSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            package_id = serializer.validated_data['package_id']
            phone_number = serializer.validated_data['phone_number']
            
            logger.info(f"Premium payment request - Package ID: {package_id}, Phone: {phone_number}")
            
            # Get the premium package
            package = get_object_or_404(PremiumPackage, id=package_id, is_active=True)
            logger.info(f"Premium package found - Price: {package.price}, Days: {package.duration_days}")
            
            # Create transaction record
            transaction_record = MpesaTransaction.objects.create(
                user=request.user,
                premium_package=package,
                transaction_type='PREMIUM',
                amount=package.price,
                premium_days=package.duration_days,
                phone_number=phone_number,
                status='PENDING'
            )
            logger.info(f"Premium transaction created - ID: {transaction_record.id}")
            
            # Initiate STK Push
            mpesa_service = MpesaService()
            reference = f"PREMIUM{transaction_record.id}"
            
            logger.info(f"Calling STK Push for premium with amount: {package.price}")
            result = mpesa_service.initiate_stk_push(
                phone_number=phone_number,
                amount=package.price,
                reference=reference,
                description=f"PlantPal Premium {package.name}"
            )
            
            if result['success']:
                # Update transaction with M-Pesa details
                transaction_record.merchant_request_id = result['merchant_request_id']
                transaction_record.checkout_request_id = result['checkout_request_id']
                transaction_record.save()
                
                return Response({
                    'success': True,
                    'message': 'Premium payment initiated successfully. Please check your phone for M-Pesa prompt.',
                    'transaction_id': transaction_record.id,
                    'customer_message': result['customer_message'],
                    'business_shortcode': mpesa_service.business_shortcode
                })
            else:
                # Mark transaction as failed
                transaction_record.status = 'FAILED'
                transaction_record.result_desc = result['error']
                transaction_record.save()
                
                return Response({
                    'success': False,
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error initiating premium payment: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': 'Failed to initiate premium payment. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LeafPackageViewSet(APIView):
    """View for listing available leaf packages"""
    permission_classes = [AllowAny]  # Allow unauthenticated access to view packages
    
    def get(self, request):
        """Get all active leaf packages"""
        packages = LeafPackage.objects.filter(is_active=True).order_by('price')
        serializer = LeafPackageSerializer(packages, many=True)
        return Response(serializer.data)

class PremiumPackageViewSet(APIView):
    """View for listing available premium packages"""
    permission_classes = [AllowAny]  # Allow unauthenticated access to view packages
    
    def get(self, request):
        """Get all active premium packages"""
        packages = PremiumPackage.objects.filter(is_active=True).order_by('price')
        serializer = PremiumPackageSerializer(packages, many=True)
        return Response(serializer.data)

class InitiatePaymentView(APIView):
    """View for initiating M-Pesa payment"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Initiate STK Push payment"""
        try:
            serializer = InitiatePaymentSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            package_id = serializer.validated_data['package_id']
            phone_number = serializer.validated_data['phone_number']
            
            logger.info(f"Payment request - Package ID: {package_id} ({type(package_id)}), Phone: {phone_number} ({type(phone_number)})")
            
            # Get the package
            package = get_object_or_404(LeafPackage, id=package_id, is_active=True)
            logger.info(f"Package found - Price: {package.price} ({type(package.price)}), Leaves: {package.leaves} ({type(package.leaves)})")
            
            # Create transaction record
            transaction_record = MpesaTransaction.objects.create(
                user=request.user,
                leaf_package=package,
                transaction_type='LEAVES',
                amount=package.price,
                leaves=package.leaves,
                phone_number=phone_number,
                status='PENDING'
            )
            logger.info(f"Transaction created - ID: {transaction_record.id}")
            
            # Initiate STK Push
            mpesa_service = MpesaService()
            reference = f"PLANT{transaction_record.id}"
            
            logger.info(f"Calling STK Push with amount: {package.price} ({type(package.price)})")
            result = mpesa_service.initiate_stk_push(
                phone_number=phone_number,
                amount=package.price,
                reference=reference,
                description=f"PlantPal {package.name}"
            )
            
            if result['success']:
                # Update transaction with M-Pesa details
                transaction_record.merchant_request_id = result['merchant_request_id']
                transaction_record.checkout_request_id = result['checkout_request_id']
                transaction_record.save()
                
                return Response({
                    'success': True,
                    'message': 'Payment initiated successfully. Please check your phone for M-Pesa prompt.',
                    'transaction_id': transaction_record.id,
                    'customer_message': result['customer_message'],
                    'business_shortcode': mpesa_service.business_shortcode  # Include the actual shortcode used
                })
            else:
                # Mark transaction as failed
                transaction_record.status = 'FAILED'
                transaction_record.result_desc = result['error']
                transaction_record.save()
                
                return Response({
                    'success': False,
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error initiating payment: {e}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': 'Failed to initiate payment. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MpesaCallbackView(APIView):
    """View for handling M-Pesa callback"""
    
    def post(self, request):
        """Process M-Pesa callback"""
        try:
            callback_data = request.data
            
            # Log callback data for debugging
            logger.info(f"M-Pesa callback received: {callback_data}")
            
            mpesa_service = MpesaService()
            success = mpesa_service.process_callback(callback_data)
            
            if success:
                return Response({'status': 'success'})
            else:
                return Response({'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error processing M-Pesa callback: {e}")
            return Response({'status': 'error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionHistoryView(APIView):
    """View for user's transaction history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's transaction history"""
        transactions = MpesaTransaction.objects.filter(user=request.user).order_by('-created_at')
        serializer = MpesaTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class PublicGardenView(APIView):
    """View for browsing public plants"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all public plants"""
        # Get all public plants, excluding the current user's plant
        public_plants = Plant.objects.filter(is_public=True).exclude(user=request.user).select_related('user')
        
        # Serialize the data
        serializer = PublicPlantSerializer(public_plants, many=True)
        
        return Response({'plants': serializer.data})

class WaterOtherPlantView(APIView):
    """View for watering another user's plant"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, plant_id):
        """Water another user's plant using leaves"""
        try:
            with transaction.atomic():
                # Get the plant
                plant = get_object_or_404(Plant, id=plant_id, is_public=True)
                
                # Check if user is trying to water their own plant
                if plant.user == request.user:
                    return Response({
                        'success': False,
                        'error': 'You cannot water your own plant using leaves'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if user has enough leaves
                user = request.user
                leaves_required = 2  # Cost to water another plant
                
                if user.plantpal_leaves < leaves_required:
                    return Response({
                        'success': False,
                        'error': f'Not enough leaves. You need {leaves_required} leaves to water this plant.',
                        'current_leaves': user.plantpal_leaves,
                        'required_leaves': leaves_required
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Deduct leaves from user
                user.plantpal_leaves -= leaves_required
                user.save()
                
                # Water the plant
                water_amount = 20
                plant.water_level = min(100, plant.water_level + water_amount)
                plant.health_score = min(100, plant.health_score + 5)
                plant.save()
                
                # Create watering transaction record
                watering_transaction = WateringTransaction.objects.create(
                    from_user=request.user,
                    to_user=plant.user,
                    plant=plant,
                    leaves_spent=leaves_required,
                    water_amount=water_amount
                )
                
                return Response({
                    'success': True,
                    'message': f'Successfully watered {plant.name}!',
                    'leaves_spent': leaves_required,
                    'water_amount': water_amount,
                    'new_balance': user.plantpal_leaves,
                    'plant_health': plant.health_score,
                    'plant_water': plant.water_level
                })
                
        except Exception as e:
            logger.error(f"Error watering other plant (plant_id={plant_id}, user={request.user.id}): {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': 'Failed to water plant. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserLeavesView(APIView):
    """View for getting user's current leaves balance"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's current leaves balance"""
        try:
            leaves = request.user.plantpal_leaves
            return Response({
                'leaves': leaves
            })
        except Exception as e:
            logger.error(f"Error getting user leaves for {request.user.id}: {e}")
            # Return default leaves if there's an error
            return Response({
                'leaves': 0,
                'error': 'Could not fetch leaves balance'
            })

class WateringHistoryView(APIView):
    """View for watering transaction history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's watering history (sent and received)"""
        sent_waterings = WateringTransaction.objects.filter(from_user=request.user)
        received_waterings = WateringTransaction.objects.filter(to_user=request.user)
        
        return Response({
            'sent': WateringTransactionSerializer(sent_waterings, many=True).data,
            'received': WateringTransactionSerializer(received_waterings, many=True).data
        })

class SetupPackagesView(APIView):
    """Setup default packages - can be called via browser"""
    permission_classes = [AllowAny]  # Allow anyone to set up packages
    
    def post(self, request):
        """Create default packages via API call"""
        try:
            # Define the packages
            packages_data = [
                {
                    'name': 'Starter Pack',
                    'leaves': 10,
                    'price': 20,
                    'description': 'Perfect for beginners! Water 5 plants and try premium features.'
                },
                {
                    'name': 'Growth Pack', 
                    'leaves': 25,
                    'price': 45,
                    'description': 'Great value! Water 12 plants and unlock more features.'
                },
                {
                    'name': 'Garden Pack',
                    'leaves': 50, 
                    'price': 80,
                    'description': 'Popular choice! Water 25 plants with bonus features.'
                },
                {
                    'name': 'Premium Pack',
                    'leaves': 100,
                    'price': 150, 
                    'description': 'Best value! Water 50 plants and get full premium access.'
                },
                {
                    'name': 'Super Pack',
                    'leaves': 200,
                    'price': 280,
                    'description': 'Ultimate pack! Water 100 plants and enjoy all features.'
                }
            ]
            
            created_count = 0
            updated_count = 0
            
            for pkg_data in packages_data:
                package, created = LeafPackage.objects.get_or_create(
                    name=pkg_data['name'],
                    defaults={
                        'leaves': pkg_data['leaves'],
                        'price': pkg_data['price'],
                        'description': pkg_data['description'],
                        'is_active': True
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    # Update existing package
                    package.leaves = pkg_data['leaves']
                    package.price = pkg_data['price'] 
                    package.description = pkg_data['description']
                    package.is_active = True
                    package.save()
                    updated_count += 1
            
            # Deactivate any old packages that aren't in our list
            current_names = [pkg['name'] for pkg in packages_data]
            old_packages = LeafPackage.objects.exclude(name__in=current_names)
            deactivated_count = 0
            if old_packages.exists():
                deactivated_count = old_packages.count()
                old_packages.update(is_active=False)
            
            # Get current packages
            total_active = LeafPackage.objects.filter(is_active=True).count()
            packages = LeafPackage.objects.filter(is_active=True).order_by('price')
            
            return Response({
                'success': True,
                'message': 'Packages setup completed successfully!',
                'summary': {
                    'created': created_count,
                    'updated': updated_count,
                    'deactivated': deactivated_count,
                    'total_active': total_active
                },
                'packages': [
                    {
                        'id': pkg.id,
                        'name': pkg.name,
                        'leaves': pkg.leaves,
                        'price': pkg.price,
                        'description': pkg.description
                    } for pkg in packages
                ]
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to setup packages: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 