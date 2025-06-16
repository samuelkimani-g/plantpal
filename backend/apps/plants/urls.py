from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlantViewSet, PlantLogViewSet # Import the new ViewSets

# Create a router and register our new ViewSets with it.
router = DefaultRouter()
# Register the PlantViewSet, accessible at /api/plants/plants/ and /api/plants/plants/{id}/
router.register(r'plants', PlantViewSet, basename='plant')
# Register the PlantLogViewSet, accessible at /api/plants/logs/ and /api/plants/logs/{id}/
router.register(r'logs', PlantLogViewSet, basename='plantlog')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
