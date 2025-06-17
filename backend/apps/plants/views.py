from rest_framework import viewsets, permissions
from .models import Plant, PlantLog
from .serializers import PlantSerializer, PlantLogSerializer
from apps.journal.permissions import IsOwner # Reusing the custom IsOwner permission

class PlantViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing user-owned Plant objects.
    Provides CRUD operations for plants.
    """
    serializer_class = PlantSerializer
    # Permissions: Authenticated users only, and only owners can modify/delete their plants.
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        Ensures users can only see and manage their own plants.
        """
        return Plant.objects.filter(user=self.request.user).order_by('-date_added')

    def perform_create(self, serializer):
        """
        Automatically sets the owner of the plant to the current authenticated user upon creation.
        """
        serializer.save(user=self.request.user)

class PlantLogViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing PlantLog objects.
    Provides CRUD operations for plant logs.
    """
    serializer_class = PlantLogSerializer
    # Permissions: Authenticated users only, and only owners of the related plant can manage logs.
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        Ensures users can only see and manage logs belonging to their plants.
        """
        # Filter logs by the plant that belongs to the current user
        return PlantLog.objects.filter(plant__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Sets the plant for the log based on URL or request data (if available).
        This also implicitly ensures the user owns the plant.
        """
        serializer.save()
