from rest_framework import viewsets, permissions
from .models import MoodEntry
from .serializers import MoodEntrySerializer
from apps.journal.permissions import IsOwner # Reusing IsOwner permission

class MoodEntryViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing user-owned MoodEntry objects.
    Provides CRUD operations for mood entries.
    """
    serializer_class = MoodEntrySerializer
    # Permissions: Authenticated users only, and only owners can modify/delete their moods.
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        Ensures users can only see and manage their own mood entries.
        """
        return MoodEntry.objects.filter(user=self.request.user).order_by('-timestamp')

    def perform_create(self, serializer):
        """
        Automatically sets the owner of the mood entry to the current authenticated user upon creation.
        """
        serializer.save(user=self.request.user)
