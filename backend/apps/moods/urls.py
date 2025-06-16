from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MoodEntryViewSet # Import the ViewSet now that it will exist

router = DefaultRouter()
router.register(r'moods', MoodEntryViewSet, basename='mood-entry')

urlpatterns = [
    path('', include(router.urls)),
]