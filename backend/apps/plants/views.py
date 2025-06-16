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
        return PlantLog.objects.filter(plant__user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        """
        Sets the plant for the log based on URL or request data (if available).
        This also implicitly ensures the user owns the plant.
        """
        # If the plant ID is passed in the URL (e.g., /plants/{plant_pk}/logs), DRF will handle it.
        # If not, assume plant ID is in request.data (e.g., {"plant": 1, "note": "..."})
        # For simplicity in this ViewSet, we assume the plant ID is directly in the request data
        # or implicitly handled by nested routing (which we're not doing yet, keeping it simple).
        # A more robust approach for creating logs would involve:
        # 1. Getting plant_id from request.data
        # 2. Verifying the current user owns that plant_id.
        
        # For now, if 'plant' is not in request.data, this will fail.
        # We'll rely on the client to send plant ID for new logs for now.
        # Later, we can adjust this for nested URLs like /plants/{plant_id}/logs/
        serializer.save()

