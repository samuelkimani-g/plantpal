from rest_framework import serializers
from .models import LeafPackage, MpesaTransaction, WateringTransaction
from django.contrib.auth.models import User

class LeafPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeafPackage
        fields = ['id', 'name', 'leaves', 'price', 'description', 'is_active']

class MpesaTransactionSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MpesaTransaction
        fields = [
            'id', 'user', 'user_username', 'package', 'package_name', 'amount', 'leaves',
            'phone_number', 'mpesa_receipt_number', 'merchant_request_id', 'checkout_request_id',
            'result_code', 'result_desc', 'status', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'mpesa_receipt_number', 'merchant_request_id', 'checkout_request_id',
            'result_code', 'result_desc', 'status', 'created_at', 'updated_at', 'completed_at'
        ]

class InitiatePaymentSerializer(serializers.Serializer):
    package_id = serializers.IntegerField(help_text="ID of the leaf package to purchase")
    phone_number = serializers.CharField(max_length=15, help_text="M-Pesa phone number")
    
    def validate_phone_number(self, value):
        """Validate phone number format"""
        # Remove any spaces or special characters
        cleaned = ''.join(filter(str.isdigit, value))
        
        # Check if it's a valid Kenyan phone number
        if not cleaned.startswith('254') and not cleaned.startswith('07'):
            raise serializers.ValidationError("Please enter a valid Kenyan phone number")
        
        # Convert to 254 format if it's 07
        if cleaned.startswith('07'):
            cleaned = '254' + cleaned[1:]
        
        return cleaned

class WateringTransactionSerializer(serializers.ModelSerializer):
    from_user_username = serializers.CharField(source='from_user.username', read_only=True)
    to_user_username = serializers.CharField(source='to_user.username', read_only=True)
    plant_name = serializers.CharField(source='plant.name', read_only=True)
    
    class Meta:
        model = WateringTransaction
        fields = [
            'id', 'from_user', 'from_user_username', 'to_user', 'to_user_username',
            'plant', 'plant_name', 'leaves_spent', 'water_amount', 'created_at'
        ]
        read_only_fields = ['from_user', 'created_at']

class PublicUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(read_only=True)
    plantpal_leaves = serializers.IntegerField(source='userprofile.plantpal_leaves', read_only=True)
    avatar_url = serializers.CharField(source='userprofile.avatar_url', read_only=True)
    bio = serializers.CharField(source='userprofile.bio', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'plantpal_leaves', 'avatar_url', 'bio'] 