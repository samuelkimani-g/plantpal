from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
from .models import JournalEntry
from .serializers import JournalEntrySerializer
from utils.enhanced_mood_system import EnhancedMoodSystem
import logging
from django.db import models

logger = logging.getLogger(__name__)

class JournalEntryViewSet(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, entry_id=None):
        """Get journal entries or specific entry"""
        if entry_id:
            entry = get_object_or_404(JournalEntry, id=entry_id, user=request.user)
            return Response(JournalEntrySerializer(entry).data)
        else:
            entries = JournalEntry.objects.filter(user=request.user).order_by('-created_at')
            return Response(JournalEntrySerializer(entries, many=True).data)
    
    def post(self, request):
        """Create a new journal entry with mood tracking"""
        serializer = JournalEntrySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            entry = serializer.save()
            
            # Determine mood impact based on entry content
            mood_type = entry.mood or 'neutral'
            if mood_type in ['happy', 'excited', 'grateful']:
                action_type = 'journal_entry_positive'
            elif mood_type in ['sad', 'angry', 'frustrated']:
                action_type = 'journal_entry_negative'
            else:
                action_type = 'journal_entry_neutral'
            
            # Record mood impact
            mood_result = EnhancedMoodSystem.record_action(
                request.user, 
                action_type,
                {'sentiment': entry.mood_score or 0.5}
            )
            
            logger.info(f"Journal entry created with mood impact: {mood_result}")
            
            return Response({
                'entry': JournalEntrySerializer(entry).data,
                'mood_impact': mood_result
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, entry_id):
        """Update journal entry with mood tracking"""
        entry = get_object_or_404(JournalEntry, id=entry_id, user=request.user)
        serializer = JournalEntrySerializer(entry, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            old_mood = entry.mood
            entry = serializer.save()
            
            # Record mood impact if mood changed
            if old_mood != entry.mood:
                mood_type = entry.mood or 'neutral'
                if mood_type in ['happy', 'excited', 'grateful']:
                    action_type = 'journal_entry_positive'
                elif mood_type in ['sad', 'angry', 'frustrated']:
                    action_type = 'journal_entry_negative'
                else:
                    action_type = 'journal_entry_neutral'
                
                mood_result = EnhancedMoodSystem.record_action(
                    request.user, 
                    action_type,
                    {'sentiment': entry.mood_score or 0.5}
                )
                
                logger.info(f"Journal entry updated with mood impact: {mood_result}")
                
                return Response({
                    'entry': JournalEntrySerializer(entry).data,
                    'mood_impact': mood_result
                })
            
            return Response(JournalEntrySerializer(entry).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JournalStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get journal statistics"""
        try:
            # Get user's journal entries
            entries = JournalEntry.objects.filter(user=request.user)
            
            # Calculate stats
            total_entries = entries.count()
            if total_entries == 0:
                return Response({
                    'total_entries': 0,
                    'average_mood': 0.5,
                    'mood_distribution': {},
                    'entries_this_week': 0,
                    'entries_this_month': 0,
                    'streak_days': 0
                })
            
            # Average mood score
            avg_mood = entries.aggregate(avg_mood=models.Avg('mood_score'))['avg_mood'] or 0.5
            
            # Mood distribution
            mood_distribution = {}
            for entry in entries:
                mood = entry.mood or 'neutral'
                mood_distribution[mood] = mood_distribution.get(mood, 0) + 1
            
            # Entries this week and month
            now = timezone.now()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            entries_this_week = entries.filter(created_at__gte=week_ago).count()
            entries_this_month = entries.filter(created_at__gte=month_ago).count()
            
            # Calculate streak (consecutive days with entries)
            streak_days = 0
            current_date = now.date()
            while True:
                if entries.filter(created_at__date=current_date).exists():
                    streak_days += 1
                    current_date -= timedelta(days=1)
                else:
                    break
            
            return Response({
                'total_entries': total_entries,
                'average_mood': avg_mood,
                'mood_distribution': mood_distribution,
                'entries_this_week': entries_this_week,
                'entries_this_month': entries_this_month,
                'streak_days': streak_days
            })
        except Exception as e:
            logger.error(f"Error getting journal stats: {e}")
            return Response({'error': 'Failed to get journal statistics'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LatestEntryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the latest journal entry"""
        try:
            latest_entry = JournalEntry.objects.filter(user=request.user).order_by('-created_at').first()
            if latest_entry:
                return Response(JournalEntrySerializer(latest_entry).data)
            else:
                return Response({'message': 'No journal entries found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting latest entry: {e}")
            return Response({'error': 'Failed to get latest entry'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
