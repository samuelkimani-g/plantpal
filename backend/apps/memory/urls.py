from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MemorySeedViewSet

router = DefaultRouter()
router.register(r'memory', MemorySeedViewSet, basename='memoryseed')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
] 