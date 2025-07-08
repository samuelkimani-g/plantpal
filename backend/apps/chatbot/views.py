from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)

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

        last_user_message = messages[-1]['text'].lower()

        # Simple keyword detection for "Plant Doctor" mode
        plant_keywords = ['plant', 'leaf', 'leaves', 'sick', 'dying', 'brown', 'yellow', 'water', 'soil']
        is_plant_topic = any(keyword in last_user_message for keyword in plant_keywords)

        if is_plant_topic:
            # Plant Doctor Persona
            response_text = f"As PlantPal's Plant Doctor, I see you're asking about '{last_user_message}'. To help you better, could you tell me more about the specific symptoms your plant is showing?"
        else:
            # General Wellness Persona
            response_text = f"Thank you for sharing. It's brave to reflect on '{last_user_message}'. How did that make you feel?"

        return Response({"reply": response_text})
