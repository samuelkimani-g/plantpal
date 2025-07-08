from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InitiatePremiumPaymentView, 
    TransactionHistoryView, 
    CompleteAllPendingTransactionsView,
    LeafPackageViewSet,
    WaterPurchaseView
)

router = DefaultRouter()
router.register(r'packages', LeafPackageViewSet, basename='leafpackage')

urlpatterns = [
    path('premium/', InitiatePremiumPaymentView.as_view(), name='premium-purchase'),
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    path('transactions/complete-pending/', CompleteAllPendingTransactionsView.as_view(), name='complete-pending'),
    path('water/purchase/', WaterPurchaseView.as_view(), name='water-purchase'),
    path('', include(router.urls)),
] 