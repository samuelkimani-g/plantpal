from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import google.generativeai as genai
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# Configure Google Generative AI
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not request.user.is_premium:
            return Response(
                {"error": "This feature is for premium users only."},
                status=403
            )

        messages = request.data.get('messages', [])
        if not messages:
            return Response({"error": "No messages provided."}, status=400)

        try:
            # Get the last user message
            last_user_message = messages[-1]['text']
            
            # Create context about the user
            user_context = f"""
            You are PlantPal AI, a compassionate and intelligent chatbot designed to help users with:
            1. Mental health and emotional support
            2. Plant care advice and guidance
            3. Mindfulness and wellness practices
            
            The user's name is {request.user.username or request.user.email}.
            
            Previous conversation context:
            {self._format_conversation_history(messages)}
            
            Respond as a warm, empathetic friend who:
            - Shows genuine care and understanding
            - Asks thoughtful follow-up questions
            - Provides practical advice when appropriate
            - Maintains a positive, supportive tone
            - Can switch between emotional support and plant care seamlessly
            
            Keep responses conversational, helpful, and under 150 words.
            """

            # Generate response using Google AI
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(user_context + f"\n\nUser: {last_user_message}\n\nPlantPal AI:")
            
            # Extract the response text
            ai_response = response.text.strip()
            
            # If no response generated, fall back to a thoughtful default
            if not ai_response:
                ai_response = self._get_fallback_response(last_user_message)
            
            return Response({"reply": ai_response})
            
        except Exception as e:
            logger.error(f"Error in chatbot: {e}")
            # Fallback response if AI fails
            return Response({
                "reply": "I'm here to listen and support you. Could you tell me more about what's on your mind?"
            })

    def _format_conversation_history(self, messages):
        """Format conversation history for context"""
        if len(messages) <= 1:
            return "This is the start of our conversation."
        
        history = []
        for msg in messages[:-1]:  # Exclude the last message as it's the current one
            role = "User" if msg.get('role') == 'user' else "PlantPal AI"
            history.append(f"{role}: {msg.get('text', '')}")
        
        return "\n".join(history[-6:])  # Keep last 6 exchanges for context

    def _get_fallback_response(self, user_message):
        """Provide thoughtful fallback responses"""
        user_message_lower = user_message.lower()
        
        # Plant-related keywords
        plant_keywords = ['plant', 'leaf', 'leaves', 'sick', 'dying', 'brown', 'yellow', 'water', 'soil', 'pot', 'grow']
        if any(keyword in user_message_lower for keyword in plant_keywords):
            return "I'd love to help with your plant! Could you tell me more about what you're seeing? For example, are the leaves changing color, or is the soil dry?"
        
        # Emotional keywords
        emotional_keywords = ['sad', 'happy', 'angry', 'frustrated', 'anxious', 'stressed', 'worried', 'excited']
        if any(keyword in user_message_lower for keyword in emotional_keywords):
            return "I hear you. Emotions are important signals from our mind and body. What do you think triggered this feeling? I'm here to listen."
        
        # Greeting keywords
        greeting_keywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']
        if any(keyword in user_message_lower for keyword in greeting_keywords):
            return "Hello! I'm here to support you today. How are you feeling, or is there anything specific you'd like to talk about?"
        
        # Default thoughtful response
        return "Thank you for sharing that with me. I'm here to listen and support you. What would be most helpful for you right now?"
