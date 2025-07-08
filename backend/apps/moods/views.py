from rest_framework import viewsets, permissions
from .models import MoodEntry
from .serializers import MoodEntrySerializer
from apps.journal.permissions import IsOwner # Reusing IsOwner permission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from django.db.models.functions import TruncDay
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Mood
from .serializers import MoodSerializer
from utils.enhanced_mood_system import EnhancedMoodSystem
from utils.mood_logic import MoodEngine
import logging

logger = logging.getLogger(__name__)

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
        if not request.user.is_premium:
            return Response({"error": "This feature is for premium users only."}, status=403)

        # Get data for the last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        moods = MoodEntry.objects.filter(user=request.user, created_at__gte=thirty_days_ago)

        # Time series data
        time_series = (
            moods.annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(avg_score=Avg('mood_score'))
            .order_by('day')
        )
        
        # Mood distribution
        mood_distribution = (
            moods.values('mood_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Overall average - handle null values
        overall_avg_result = moods.aggregate(Avg('mood_score'))
        overall_avg = overall_avg_result['mood_score__avg'] if overall_avg_result['mood_score__avg'] is not None else 0.5

        # Ensure time series has valid values
        time_series_data = []
        for entry in time_series:
            avg_score = entry.get('avg_score', 0.5)
            if avg_score is None:
                avg_score = 0.5
            time_series_data.append({
                'day': entry['day'],
                'avg_score': avg_score
            })

        return Response({
            "time_series": time_series_data,
            "mood_distribution": list(mood_distribution),
            "overall_average_score": overall_avg,
            "total_entries": moods.count()
        })

class MoodFeedbackView(APIView):
    """Get personalized mood feedback and suggestions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get mood feedback and suggestions"""
        try:
            feedback = MoodEngine.get_mood_feedback(request.user)
            return Response(feedback)
        except Exception as e:
            logger.error(f"Error getting mood feedback: {e}")
            return Response(
                {'error': 'Failed to get mood feedback'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
