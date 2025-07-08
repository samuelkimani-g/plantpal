from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeafPackageViewSet, PremiumPackageViewSet, InitiatePaymentView, InitiatePremiumPaymentView, MpesaCallbackView,
    TransactionHistoryView, PublicGardenView, WaterOtherPlantView, UserLeavesView, WateringHistoryView,
    SetupPackagesView, ManualCompleteTransactionView, CompleteAllPendingTransactionsView
)
from apps.store.views import StoreItemViewSet, UserInventoryViewSet

router = DefaultRouter()
router.register(r'store-items', StoreItemViewSet, basename='store-item')
router.register(r'inventory', UserInventoryViewSet, basename='user-inventory')

urlpatterns = [
    # M-Pesa payment endpoints
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('initiate-premium/', InitiatePremiumPaymentView.as_view(), name='initiate-premium-payment'),
    path('callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    
    # Manual completion endpoints
    path('complete-transaction/', ManualCompleteTransactionView.as_view(), name='complete-transaction'),
    path('complete-all-pending/', CompleteAllPendingTransactionsView.as_view(), name='complete-all-pending'),
    
    # Transaction and user data
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    path('leaves/', UserLeavesView.as_view(), name='user-leaves'),
    
    # Public garden and social features
    path('garden/', PublicGardenView.as_view(), name='public-garden'),
    path('water/<int:plant_id>/', WaterOtherPlantView.as_view(), name='water-other-plant'),
    path('watering-history/', WateringHistoryView.as_view(), name='watering-history'),
    
    # Setup and debug endpoints
    path('setup-packages/', SetupPackagesView.as_view(), name='setup-packages'),
    
    # Premium packages
    path('premium-packages/', PremiumPackageViewSet.as_view(), name='premium-packages'),
    
    # Include router URLs for store items and inventory
    path('', include(router.urls)),
] 