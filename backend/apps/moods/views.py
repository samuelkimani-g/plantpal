from rest_framework import viewsets, permissions
from .models import MoodEntry
from .serializers import MoodEntrySerializer
from apps.journal.permissions import IsOwner # Reusing IsOwner permission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Mood
from .serializers import MoodSerializer
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from django.db.models.functions import TruncDay

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
        return MoodEntry.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Automatically sets the owner of the mood entry to the current authenticated user upon creation.
        """
        serializer.save(user=self.request.user)

class MoodAnalyticsView(APIView):
    """Provides advanced mood analytics for premium users."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.userprofile.is_premium:
            return Response({"error": "This feature is for premium users only."}, status=403)

        # Get data for the last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        moods = Mood.objects.filter(user=request.user, created_at__gte=thirty_days_ago)

        # Time series data
        time_series = (
            moods.annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(avg_score=Avg('unified_mood_score'))
            .order_by('day')
        )
        
        # Mood distribution
        mood_distribution = (
            moods.values('mood_label')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Overall average
        overall_avg = moods.aggregate(Avg('unified_mood_score'))['unified_mood_score__avg']

        return Response({
            "time_series": list(time_series),
            "mood_distribution": list(mood_distribution),
            "overall_average_score": overall_avg,
            "total_entries": moods.count()
        })
