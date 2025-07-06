from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreItemViewSet, UserInventoryViewSet

router = DefaultRouter()
router.register(r'items', StoreItemViewSet, basename='store-item')
router.register(r'inventory', UserInventoryViewSet, basename='user-inventory')

urlpatterns = [
    path('', include(router.urls)),
] 