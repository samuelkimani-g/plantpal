from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from .models import LeafPackage, MpesaTransaction, WateringTransaction
from .serializers import (
    LeafPackageSerializer, MpesaTransactionSerializer, InitiatePaymentSerializer,
    WateringTransactionSerializer, PublicUserSerializer
)
from .mpesa_service import MpesaService
from apps.plants.models import Plant
import logging

logger = logging.getLogger(__name__)

class LeafPackageViewSet(APIView):
    """View for listing available leaf packages"""
    permission_classes = [AllowAny]  # Allow unauthenticated access to view packages
    
    def get(self, request):
        """Get all active leaf packages"""
        packages = LeafPackage.objects.filter(is_active=True).order_by('price')
        serializer = LeafPackageSerializer(packages, many=True)
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
                package=package,
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
                    'customer_message': result['customer_message']
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
        """Get list of public plants with search functionality"""
        query = request.GET.get('query', '').strip()
        
        # Get public plants with related user data
        plants = Plant.objects.filter(is_public=True).select_related('user').order_by('-created_at')
        
        # Apply search filter
        if query:
            plants = plants.filter(
                user__username__icontains=query
            ) | plants.filter(
                name__icontains=query
            ) | plants.filter(
                species__icontains=query
            )
        
        # Exclude user's own plants (optional - you can remove this if you want to show all)
        plants = plants.exclude(user=request.user)
        
        # Serialize plant data with user info
        plants_data = []
        for plant in plants:
            plants_data.append({
                'id': plant.id,
                'name': plant.name,
                'species': plant.species,
                'health_score': plant.health_score,
                'water_level': getattr(plant, 'water_level', 50),
                'current_mood_influence': plant.current_mood_influence,
                'level': getattr(plant, 'level', 1),
                'care_streak': getattr(plant, 'care_streak', 0),
                'growth_stage': getattr(plant, 'growth_stage', 1),
                'created_at': plant.created_at,
                'last_care_date': plant.last_care_date,
                'user': {
                    'id': plant.user.id,
                    'username': plant.user.username,
                    'first_name': plant.user.first_name,
                    'last_name': plant.user.last_name,
                    'display_name': f"{plant.user.first_name} {plant.user.last_name}".strip() or plant.user.username
                }
            })
        
        return Response({
            'plants': plants_data,
            'total_plants': len(plants_data),
            'message': f'Found {len(plants_data)} public plants'
        })

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
                try:
                    user_profile = request.user.userprofile
                except AttributeError:
                    from apps.accounts.models import UserProfile
                    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
                
                leaves_required = 2  # Cost to water another plant
                
                if user_profile.plantpal_leaves < leaves_required:
                    return Response({
                        'success': False,
                        'error': f'Not enough leaves. You need {leaves_required} leaves to water this plant.',
                        'current_leaves': user_profile.plantpal_leaves,
                        'required_leaves': leaves_required
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Deduct leaves from user
                user_profile.plantpal_leaves -= leaves_required
                user_profile.save()
                
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
                    'new_balance': user_profile.plantpal_leaves,
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
            # Try to get userprofile, create if doesn't exist
            if hasattr(request.user, 'userprofile'):
                profile = request.user.userprofile
                created = False
            else:
                from apps.accounts.models import UserProfile
                profile, created = UserProfile.objects.get_or_create(user=request.user)
                
            leaves = profile.plantpal_leaves
            return Response({
                'leaves': leaves,
                'profile_created': created
            })
        except Exception as e:
            logger.error(f"Error getting user leaves: {e}")
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