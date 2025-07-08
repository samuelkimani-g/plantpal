from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MoodEntryViewSet, MoodAnalyticsView, MoodFeedbackView

router = DefaultRouter()
router.register(r'moods', MoodEntryViewSet, basename='mood-entry')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', MoodAnalyticsView.as_view(), name='mood-analytics'),
    path('feedback/', MoodFeedbackView.as_view(), name='mood-feedback'),
]
