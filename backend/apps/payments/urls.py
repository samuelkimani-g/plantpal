from django.urls import path
from .views import (
    InitiatePremiumPaymentView, 
    TransactionHistoryView, 
    CompleteAllPendingTransactionsView,
    LeafPackageViewSet,
    WaterPurchaseView,
    UserLeavesView
)

urlpatterns = [
    path('leaves/', UserLeavesView.as_view(), name='user-leaves'),
    path('premium/', InitiatePremiumPaymentView.as_view(), name='premium-purchase'),
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    path('transactions/complete-pending/', CompleteAllPendingTransactionsView.as_view(), name='complete-pending'),
    path('water/purchase/', WaterPurchaseView.as_view(), name='water-purchase'),
    path('packages/', LeafPackageViewSet.as_view(), name='leaf-packages'),
] 