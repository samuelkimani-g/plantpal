from rest_framework import viewsets, permissions
from .models import MemorySeed
from .serializers import MemorySeedSerializer
from utils.mood_logic import MoodEngine

class MemorySeedViewSet(viewsets.ModelViewSet):
    """
    API endpoint for creating and viewing Memory Seeds.
    """
    queryset = MemorySeed.objects.all().order_by('-created_at')
    serializer_class = MemorySeedSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all the memory seeds
        for the currently authenticated user.
        """
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Automatically capture the user's current mood when creating a new memory seed.
        """
        # Use the MoodEngine to get the current unified mood
        unified_mood = MoodEngine.get_combined_user_mood(self.request.user)
        mood_label = unified_mood.get('unified_mood', 'neutral')
        mood_score = unified_mood.get('mood_score', 0.5)

        # TODO: Add weather data capture here later

        serializer.save(
            user=self.request.user,
            mood_label=mood_label,
            mood_score=mood_score
        ) 