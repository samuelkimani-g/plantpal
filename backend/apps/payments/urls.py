from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PremiumPurchaseView, 
    TransactionStatusView, 
    CompletePendingTransactionsView,
    LeafPackageViewSet,
    WaterPurchaseView
)

router = DefaultRouter()
router.register(r'packages', LeafPackageViewSet, basename='leafpackage')

urlpatterns = [
    path('premium/', PremiumPurchaseView.as_view(), name='premium-purchase'),
    path('transactions/status/', TransactionStatusView.as_view(), name='transaction-status'),
    path('transactions/complete-pending/', CompletePendingTransactionsView.as_view(), name='complete-pending'),
    path('water/purchase/', WaterPurchaseView.as_view(), name='water-purchase'),
    path('', include(router.urls)),
] 