from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import google.generativeai as genai
import logging
import os
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import ChatMessage
from utils.enhanced_mood_system import EnhancedMoodSystem

logger = logging.getLogger(__name__)

# Configure Google Generative AI
genai.configure(api_key=os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY'))

class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Handle chatbot interaction with mood tracking"""
        user_message = request.data.get('message', '')
        
        if not user_message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Configure Google AI
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Create context-aware prompt
            system_prompt = """You are a friendly, supportive plant companion AI. You help users with their mental health, plant care, and general well-being. 
            Always be encouraging, positive, and helpful. Keep responses concise but warm. 
            If the user seems sad or stressed, offer gentle support and suggestions for mindfulness activities."""
            
            full_prompt = f"{system_prompt}\n\nUser: {user_message}\n\nPlant Companion:"
            
            # Generate response
            response = model.generate_content(full_prompt)
            bot_response = response.text.strip()
            
            # Analyze response sentiment for mood tracking
            sentiment_prompt = f"Analyze the sentiment of this response (positive/negative/neutral): {bot_response}"
            sentiment_response = model.generate_content(sentiment_prompt)
            sentiment_text = sentiment_response.text.lower()
            
            # Determine action type based on sentiment
            if 'positive' in sentiment_text or 'encouraging' in sentiment_text:
                action_type = 'chatbot_positive'
            elif 'negative' in sentiment_text or 'discouraging' in sentiment_text:
                action_type = 'chatbot_negative'
            else:
                action_type = 'chatbot_positive'  # Default to positive for supportive responses
            
            # Record mood impact
            mood_result = EnhancedMoodSystem.record_action(
                request.user, 
                action_type
            )
            
            # Save chat message
            ChatMessage.objects.create(
                user=request.user,
                message=user_message,
                response=bot_response,
                timestamp=timezone.now()
            )
            
            logger.info(f"Chatbot interaction with mood impact: {mood_result}")
            
            return Response({
                'response': bot_response,
                'mood_impact': mood_result
            })
            
        except Exception as e:
            logger.error(f"Chatbot error: {str(e)}")
            # Fallback response
            fallback_response = "I'm here to support you! How are you feeling today?"
            
            # Record positive mood impact for supportive response
            mood_result = EnhancedMoodSystem.record_action(
                request.user, 
                'chatbot_positive'
            )
            
            return Response({
                'response': fallback_response,
                'mood_impact': mood_result
            })
