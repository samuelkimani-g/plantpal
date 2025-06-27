from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView 
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.utils import timezone
from datetime import timedelta
from django.db import models

from .models import JournalEntry
from .serializers import JournalEntrySerializer
from .permissions import IsOwner
from .prompt_utils import get_journal_prompt, get_dominant_mood
from apps.plants.services import PlantGrowthService

class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    A ViewSet that provides standard CRUD operations for JournalEntry objects.
    Now includes automatic sentiment analysis and plant mood updates.
    """
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Override create to add sentiment analysis and plant mood update
        """
        # First save the journal entry
        journal_entry = serializer.save(user=self.request.user)
        
        # Calculate streak
        yesterday = timezone.now() - timedelta(days=1)
        has_recent_entry = JournalEntry.objects.filter(
            user=self.request.user,
            created_at__date=yesterday.date()
        ).exists()
        
        if has_recent_entry:
            # Update user streak if they have the field
            if hasattr(self.request.user, 'journal_streak'):
                self.request.user.journal_streak = (self.request.user.journal_streak or 0) + 1
                self.request.user.save()
        else:
            # Reset streak to 1
            if hasattr(self.request.user, 'journal_streak'):
                self.request.user.journal_streak = 1
                self.request.user.save()
        
        # Update plant mood if user has a plant
        if hasattr(self.request.user, 'plant'):
            try:
                # Process journal sentiment and update plant mood
                PlantGrowthService.process_journal_sentiment(
                    self.request.user.plant,
                    journal_entry.text
                )
                
            except Exception as e:
                print(f"Error processing journal sentiment: {e}")
        
        # Journal entry is already saved, no need to save again

    @action(detail=False, methods=['get'])
    def latest_entry(self, request):
        """Get the latest journal entry"""
        latest = self.get_queryset().first()
        if latest:
            serializer = self.get_serializer(latest)
            return Response(serializer.data)
        # Return 200 OK with empty data instead of 404
        return Response({}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get journal statistics"""
        entries = self.get_queryset()
        total_entries = entries.count()
        streak = getattr(request.user, 'journal_streak', 0) or 0
        
        # Get mood distribution from journal entries directly
        mood_counts = []
        try:
            # Count entries by mood directly
            mood_distribution = entries.values(
                'mood'
            ).annotate(
                count=models.Count('id')
            ).order_by('-count')
            
            mood_counts = [
                {
                    'mood_type': item['mood'],
                    'count': item['count']
                }
                for item in mood_distribution
            ]
        except Exception as e:
            print(f"Error getting mood distribution: {e}")
            # Fallback to basic stats without mood distribution
            mood_counts = []
        
        # Calculate recent activity (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_entries = entries.filter(created_at__gte=week_ago).count()
        
        return Response({
            'total_entries': total_entries,
            'streak': streak,
            'recent_entries': recent_entries,
            'mood_distribution': mood_counts,
            'has_entries': total_entries > 0
        })

    @action(detail=True, methods=['post'])
    def mark_favorite(self, request, pk=None):
        """Toggle favorite status of a journal entry"""
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        
        new_favorite_status = request.data.get('is_favorite')
        if new_favorite_status is not None:
            entry.is_favorite = str(new_favorite_status).lower() in ['true', '1']
        else:
            entry.is_favorite = not entry.is_favorite
        
        entry.save()
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)

class JournalPromptView(APIView): 
    """Generate journal prompts"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        mood = request.query_params.get('mood', None)
        prompt = get_journal_prompt(mood)
        return Response({"prompt": prompt})

    def post(self, request, *args, **kwargs):
        mood = request.data.get('mood', None)
        prompt = get_journal_prompt(mood)
        return Response({"prompt": prompt})
