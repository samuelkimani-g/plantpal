from django.urls import path
from .views import (
    LeafPackageViewSet, PremiumPackageViewSet, InitiatePaymentView, InitiatePremiumPaymentView, MpesaCallbackView,
    TransactionHistoryView, PublicGardenView, WaterOtherPlantView,
    UserLeavesView, WateringHistoryView, SetupPackagesView, DebugMpesaConfigView,
    ManualCompleteTransactionView
)

urlpatterns = [
    # Debug endpoints
    path('debug-config/', DebugMpesaConfigView.as_view(), name='debug-mpesa-config'),
    path('manual-complete/', ManualCompleteTransactionView.as_view(), name='manual-complete-transaction'),
    
    # Leaf packages
    path('packages/', LeafPackageViewSet.as_view(), name='leaf-packages'),
    path('setup-packages/', SetupPackagesView.as_view(), name='setup-packages'),
    
    # Premium packages
    path('premium-packages/', PremiumPackageViewSet.as_view(), name='premium-packages'),
    
    # M-Pesa payment
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('initiate-premium/', InitiatePremiumPaymentView.as_view(), name='initiate-premium-payment'),
    path('callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    
    # User leaves
    path('leaves/', UserLeavesView.as_view(), name='user-leaves'),
    
    # Social features
    path('garden/', PublicGardenView.as_view(), name='public-garden'),
    path('water/<int:plant_id>/', WaterOtherPlantView.as_view(), name='water-other-plant'),
    path('watering-history/', WateringHistoryView.as_view(), name='watering-history'),
] 