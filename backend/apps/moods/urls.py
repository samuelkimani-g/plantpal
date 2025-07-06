from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MoodEntryViewSet, MoodAnalyticsView

router = DefaultRouter()
router.register(r'moods', MoodEntryViewSet, basename='mood')

urlpatterns = [
    path('analytics/', MoodAnalyticsView.as_view(), name='mood-analytics'),
    path('', include(router.urls)),
]
