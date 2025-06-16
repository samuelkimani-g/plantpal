from rest_framework import viewsets, permissions
from .models import Reminder
from .serializers import ReminderSerializer
from apps.journal.permissions import IsOwner # Reusing IsOwner permission

class ReminderViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing user-owned Reminder objects.
    Provides CRUD operations for reminders.
    """
    serializer_class = ReminderSerializer
    # Permissions: Authenticated users only, and only owners can modify/delete their reminders.
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        Ensures users can only see and manage their own reminders.
        """
        return Reminder.objects.filter(user=self.request.user).order_by('scheduled_for')

    def perform_create(self, serializer):
        """
        Automatically sets the owner of the reminder to the current authenticated user upon creation.
        """
        serializer.save(user=self.request.user)

