from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView 
from django.shortcuts import get_object_or_404
from django.http import Http404

from .models import JournalEntry
from .serializers import JournalEntrySerializer
from .permissions import IsOwner
from .prompt_utils import get_journal_prompt 

class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    A ViewSet that provides standard CRUD operations (Create, Retrieve, Update, Delete)
    for JournalEntry objects.
    
    It enforces that users can only interact with their own journal entries
    and includes custom actions for specific functionalities like fetching the latest
    entry or marking an entry as a favorite.
    """
    serializer_class = JournalEntrySerializer
    # Apply permissions:
    # - permissions.IsAuthenticated: Ensures only logged-in users can access.
    # - IsOwner: Ensures users can only modify/delete their own entries (object-level).
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """
        Dynamically filters the queryset to return only journal entries
        that belong to the currently authenticated user.
        This is applied for list views and when retrieving single objects.
        """
        return JournalEntry.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        """
        Override the default create behavior to automatically assign the
        authenticated user as the owner of the new journal entry.
        """
        journal_entry = serializer.save(user=self.request.user)

    # --- Custom List Action: Get Latest Journal Entry ---
    @action(detail=False, methods=['get']) # detail=False indicates it operates on the list of entries
    def latest_entry(self, request):
        """
        Retrieves the single most recent journal entry for the authenticated user.
        Accessible at: /api/journal/entries/latest/
        """
        # Utilize get_queryset() to ensure only the current user's entries are considered
        latest = self.get_queryset().first() 
        if latest:
            serializer = self.get_serializer(latest)
            return Response(serializer.data)
        # Return a 404 if no entries are found for the user
        return Response({"detail": "No journal entries found for this user."}, status=status.HTTP_404_NOT_FOUND)

    # --- Custom Detail Action: Mark/Unmark as Favorite ---
    @action(detail=True, methods=['post']) # detail=True indicates it operates on a single entry (needs ID)
    def mark_favorite(self, request, pk=None):
        """
        Toggles or sets the 'is_favorite' status of a specific journal entry.
        Accessible at: /api/journal/entries/{id}/mark_favorite/
        Accepts POST with optional JSON body: {"is_favorite": true/false}
        If no body provided, it will toggle the current status.
        """
        # Retrieve the specific journal entry. get_queryset() ensures it belongs to the current user.
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        
        # Determine the new favorite status from request data or by toggling
        new_favorite_status = request.data.get('is_favorite')
        if new_favorite_status is not None:
            # Convert string representations of boolean if necessary (e.g., "true" to True)
            entry.is_favorite = str(new_favorite_status).lower() in ['true', '1']
        else:
            # Toggle the current favorite status if no specific value is provided
            entry.is_favorite = not entry.is_favorite
        
        entry.save() # Save the updated favorite status to the database
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

class JournalPromptView(APIView): 
    """
    API endpoint to generate and return a journal prompt based on an optional mood.
    Can be accessed via GET or POST, with mood provided as a query parameter or in the request body.
    """
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users can get prompts

    def get(self, request, *args, **kwargs):
        mood = request.query_params.get('mood', None) # Get mood from query parameter
        prompt = get_journal_prompt(mood)
        return Response({"prompt": prompt})

    def post(self, request, *args, **kwargs):
        mood = request.data.get('mood', None) # Get mood from request body
        prompt = get_journal_prompt(mood)
        return Response({"prompt": prompt})
