from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JournalEntryViewSet, JournalPromptView 

router = DefaultRouter()
router.register(r'entries', JournalEntryViewSet, basename='journalentry')

urlpatterns = [
    path('', include(router.urls)),
    path('entries/latest_entry/', JournalEntryViewSet.as_view({'get': 'latest_entry'}), name='journalentry-latest-entry'),
    path('prompts/', JournalPromptView.as_view(), name='journal_prompts'),
]

