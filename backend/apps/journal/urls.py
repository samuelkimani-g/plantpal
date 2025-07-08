from django.urls import path
from .views import JournalEntryViewSet

urlpatterns = [
    path('entries/', JournalEntryViewSet.as_view(), name='journal-entries'),
    path('entries/<int:entry_id>/', JournalEntryViewSet.as_view(), name='journal-entry-detail'),
]
