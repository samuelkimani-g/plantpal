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

logger = logging.getLogger(__name__)

class JournalEntryViewSet(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new journal entry with mood tracking"""
        serializer = JournalEntrySerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save(user=request.user)
            
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
        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        
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
