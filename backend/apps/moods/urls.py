from django.urls import path
from .views import MoodEntryViewSet, MoodAnalyticsView, MoodFeedbackView

urlpatterns = [
    path('moods/', MoodEntryViewSet.as_view(), name='mood-entries'),
    path('analytics/', MoodAnalyticsView.as_view(), name='mood-analytics'),
    path('feedback/', MoodFeedbackView.as_view(), name='mood-feedback'),
]
