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
genai.configure(api_key=os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY'))

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
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(user_context + f"\n\nUser: {last_user_message}\n\nPlantPal AI:")
            
            # Extract the response text
            ai_response = response.text.strip()
            
            # If no response generated, fall back to a thoughtful default
            if not ai_response:
                ai_response = self._get_fallback_response(last_user_message, messages)
            
            return Response({"reply": ai_response})
            
        except Exception as e:
            logger.error(f"Error in chatbot: {e}")
            # Fallback response if AI fails
            return Response({
                "reply": self._get_fallback_response(messages[-1]['text'] if messages else "", messages)
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

    def _get_fallback_response(self, user_message, messages=None):
        """Provide thoughtful fallback responses based on context"""
        user_message_lower = user_message.lower()
        
        # Check conversation context for repeated messages
        if messages and len(messages) > 1:
            recent_messages = [msg.get('text', '').lower() for msg in messages[-3:]]
            if all('sad' in msg or 'down' in msg for msg in recent_messages if msg):
                return "I notice you've mentioned feeling down a few times. That's completely valid, and I want you to know that it's okay to not be okay. Sometimes when we're feeling low, it helps to talk about what's really bothering us. Would you like to share more about what's been difficult lately?"
        
        # Plant-related keywords
        plant_keywords = ['plant', 'leaf', 'leaves', 'sick', 'dying', 'brown', 'yellow', 'water', 'soil', 'pot', 'grow']
        if any(keyword in user_message_lower for keyword in plant_keywords):
            return "I'd love to help with your plant! 🌱 Could you tell me more about what you're seeing? For example, are the leaves changing color, or is the soil dry? Sometimes plants give us little signals about what they need."
        
        # Emotional keywords with more specific responses
        if 'sad' in user_message_lower or 'down' in user_message_lower:
            return "I hear you, and I'm sorry you're feeling this way. Sadness can be really heavy to carry. Sometimes it helps to know that you're not alone in feeling this way. What do you think might help you feel a little better right now? Maybe talking about it, or doing something that usually brings you comfort?"
        
        if 'happy' in user_message_lower or 'good' in user_message_lower:
            return "That's wonderful! 😊 I'm so glad you're feeling good today. What's been bringing you joy? It's always nice to celebrate the good moments and understand what makes us feel uplifted."
        
        if 'angry' in user_message_lower or 'frustrated' in user_message_lower:
            return "Anger and frustration are completely normal emotions, and it's okay to feel them. Sometimes when we're angry, it's because something important to us isn't going the way we hoped. What's been frustrating you? I'm here to listen."
        
        if 'anxious' in user_message_lower or 'worried' in user_message_lower or 'stressed' in user_message_lower:
            return "Anxiety and worry can feel really overwhelming. You're not alone in feeling this way. Sometimes it helps to take a deep breath and focus on one thing at a time. What's been on your mind? I'm here to support you."
        
        # Greeting keywords
        greeting_keywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']
        if any(keyword in user_message_lower for keyword in greeting_keywords):
            return "Hello! 👋 I'm here to support you today. How are you feeling, or is there anything specific you'd like to talk about? I'm ready to listen and help however I can."
        
        # Short responses
        if len(user_message.strip()) < 5:
            return "I'm here and ready to listen. Sometimes it takes a moment to find the right words, and that's totally okay. What's on your mind?"
        
        # Default thoughtful response
        return "Thank you for sharing that with me. I'm here to listen and support you. Sometimes just talking about what's on our minds can help us feel a little lighter. What would be most helpful for you right now?"
