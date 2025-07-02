from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class LeafPackage(models.Model):
    """Available packages for purchasing PlantPal Leaves"""
    name = models.CharField(max_length=100, help_text="Package name (e.g., 'Starter Pack')")
    leaves = models.IntegerField(help_text="Number of leaves in this package")
    price = models.IntegerField(help_text="Price in KES")
    description = models.TextField(blank=True, help_text="Package description")
    is_active = models.BooleanField(default=True, help_text="Whether this package is available for purchase")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['price']
    
    def __str__(self):
        return f"{self.name} - {self.leaves} leaves for KES {self.price}"

class MpesaTransaction(models.Model):
    """M-Pesa transaction records"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mpesa_transactions')
    package = models.ForeignKey(LeafPackage, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.IntegerField(help_text="Amount in KES")
    leaves = models.IntegerField(help_text="Number of leaves purchased")
    phone_number = models.CharField(max_length=15, help_text="M-Pesa phone number")
    
    # M-Pesa specific fields
    mpesa_receipt_number = models.CharField(max_length=100, null=True, blank=True, help_text="M-Pesa receipt number")
    merchant_request_id = models.CharField(max_length=100, null=True, blank=True, help_text="Merchant request ID from M-Pesa")
    checkout_request_id = models.CharField(max_length=100, null=True, blank=True, help_text="Checkout request ID from M-Pesa")
    result_code = models.CharField(max_length=10, null=True, blank=True, help_text="M-Pesa result code")
    result_desc = models.TextField(null=True, blank=True, help_text="M-Pesa result description")
    
    # Transaction status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When transaction was completed")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - KES {self.amount} ({self.status})"
    
    def mark_successful(self, receipt_number, result_code="0", result_desc="Success"):
        """Mark transaction as successful and credit leaves to user"""
        self.status = 'SUCCESS'
        self.mpesa_receipt_number = receipt_number
        self.result_code = result_code
        self.result_desc = result_desc
        self.completed_at = timezone.now()
        self.save()
        
        # Credit leaves to user
        profile = self.user.userprofile
        profile.plantpal_leaves += self.leaves
        profile.save()
        
        return True
    
    def mark_failed(self, result_code, result_desc):
        """Mark transaction as failed"""
        self.status = 'FAILED'
        self.result_code = result_code
        self.result_desc = result_desc
        self.completed_at = timezone.now()
        self.save()
        return True

class WateringTransaction(models.Model):
    """Record of watering other users' plants"""
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_waterings')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_waterings')
    plant = models.ForeignKey('plants.Plant', on_delete=models.CASCADE, related_name='watering_transactions')
    leaves_spent = models.IntegerField(default=2, help_text="Number of leaves spent")
    water_amount = models.IntegerField(default=20, help_text="Amount of water given")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.from_user.username} watered {self.to_user.username}'s plant" 