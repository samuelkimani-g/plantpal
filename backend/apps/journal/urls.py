from django.urls import path
from .views import JournalEntryViewSet, JournalStatsView, LatestEntryView

urlpatterns = [
    path('entries/', JournalEntryViewSet.as_view(), name='journal-entries'),
    path('entries/<int:entry_id>/', JournalEntryViewSet.as_view(), name='journal-entry-detail'),
    path('entries/stats/', JournalStatsView.as_view(), name='journal-stats'),
    path('entries/latest_entry/', LatestEntryView.as_view(), name='journal-latest-entry'),
]
