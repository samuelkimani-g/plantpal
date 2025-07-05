from django.contrib import admin
from .models import LeafPackage, PremiumPackage, MpesaTransaction, WateringTransaction

@admin.register(LeafPackage)
class LeafPackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'leaves', 'price', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['price']

@admin.register(PremiumPackage)
class PremiumPackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'duration_days', 'price', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['price']

@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'transaction_type', 'amount', 'leaves', 'premium_days', 'phone_number', 'status', 'created_at']
    list_filter = ['status', 'transaction_type', 'created_at', 'leaf_package', 'premium_package']
    search_fields = ['user__username', 'phone_number', 'mpesa_receipt_number']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Transaction Details', {
            'fields': ('user', 'transaction_type', 'leaf_package', 'premium_package', 'amount', 'leaves', 'premium_days', 'phone_number', 'status')
        }),
        ('M-Pesa Details', {
            'fields': ('mpesa_receipt_number', 'merchant_request_id', 'checkout_request_id', 'result_code', 'result_desc')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(WateringTransaction)
class WateringTransactionAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_user', 'plant', 'leaves_spent', 'water_amount', 'created_at']
    list_filter = ['created_at']
    search_fields = ['from_user__username', 'to_user__username', 'plant__name']
    readonly_fields = ['created_at']
    ordering = ['-created_at'] 