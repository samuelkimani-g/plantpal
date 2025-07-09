from django.urls import path
from .views import (
    InitiatePremiumPaymentView, 
    InitiatePaymentView,
    TransactionHistoryView, 
    CompleteAllPendingTransactionsView,
    ManualCompleteTransactionView,
    LeafPackageViewSet,
    WaterPurchaseView,
    WaterOtherPlantView,
    UserLeavesView,
    PublicGardenView,
    StoreItemsView,
    UserInventoryView
)

urlpatterns = [
    path('leaves/', UserLeavesView.as_view(), name='user-leaves'),
    path('premium/', InitiatePremiumPaymentView.as_view(), name='premium-purchase'),
    path('packages/', LeafPackageViewSet.as_view(), name='leaf-packages'),
    path('packages/buy/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
    path('transactions/complete-pending/', CompleteAllPendingTransactionsView.as_view(), name='complete-pending'),
    path('transactions/complete/', ManualCompleteTransactionView.as_view(), name='complete-transaction'),
    path('water/purchase/', WaterPurchaseView.as_view(), name='water-purchase'),
    path('water/<int:plant_id>/', WaterOtherPlantView.as_view(), name='water-other-plant'),
    path('garden/', PublicGardenView.as_view(), name='public-garden'),
    path('store-items/', StoreItemsView.as_view(), name='store-items'),
    path('inventory/', UserInventoryView.as_view(), name='user-inventory'),
] 