from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Plant, PlantLog, MemorySeed
from .serializers import PlantSerializer, PlantLogSerializer, MemorySeedSerializer
from .services import PlantGrowthService, FirestoreService
from rest_framework.permissions import IsAuthenticated

class PlantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing a user's single plant
    """
    serializer_class = PlantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Each user has only one plant
        return Plant.objects.filter(user=self.request.user)

    def get_object(self):
        """Get the user's single plant"""
        try:
            return Plant.objects.get(user=self.request.user)
        except Plant.DoesNotExist:
            return None

    def list(self, request):
        """Return the user's single plant as an array"""
        try:
            plant = self.get_object()
            if plant:
                # Check if plant has all required fields before serializing
                print(f"Plant object: {plant}")
                print(f"Plant fields: {[f.name for f in plant._meta.fields]}")
                
                # Ensure 3D params are initialized
                if not plant.three_d_model_params:
                    plant.update_3d_params()
                
                serializer = self.get_serializer(plant)
                data = serializer.data
                print(f"Serialized data: {data}")
                # Return as array for frontend compatibility
                return Response([data])
            return Response([], status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            print(f"Error in PlantViewSet.list: {e}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Internal server error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request):
        """Create a new plant (only if user doesn't have one)"""
        try:
            if Plant.objects.filter(user=request.user).exists():
                return Response(
                    {"error": "You already have a plant companion! Each user can have only one plant."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print(f"Creating plant with data: {request.data}")
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                plant = serializer.save(user=request.user)
                print(f"Plant created successfully: {plant}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                print(f"Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            print(f"Error in PlantViewSet.create: {e}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Internal server error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, pk=None):
        """Update the user's plant"""
        plant = self.get_object()
        if not plant:
            return Response({"error": "No plant found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(plant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        """Water the user's plant, with a 1-hour cooldown. Slightly boosts health and mood."""
        plant = self.get_object()
        if not plant:
            return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)

        # Cooldown logic: only allow watering if last_watered_at is >1 hour ago
        now = timezone.now()
        if plant.last_watered_at and (now - plant.last_watered_at).total_seconds() < 3600:
            minutes_left = int((3600 - (now - plant.last_watered_at).total_seconds()) // 60) + 1
            return Response({
                "error": f"You can only water your plant once per hour. Please wait {minutes_left} more minutes."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        amount = request.data.get('amount', 20)
        plant.water_plant(amount)

        # Slightly boost mood (e.g., +0.05, capped at 1.0)
        from .services import PlantGrowthService
        PlantGrowthService.update_plant_mood(plant, 0.1, entry_type='watering')  # 0.1 = small positive mood

        serializer = self.get_serializer(plant)
        return Response({
            "message": f"Plant watered with {amount} units!",
            "plant": serializer.data
        })

    @action(detail=True, methods=['post'])
    def fertilize(self, request, pk=None):
        """Fertilize the user's plant, with a 1-hour cooldown. Slightly boosts health and mood."""
        plant = self.get_object()
        if not plant:
            return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)

        # Cooldown logic: only allow fertilizing if last_fertilized is >1 hour ago
        now = timezone.now()
        if plant.last_fertilized and (now - plant.last_fertilized).total_seconds() < 3600:
            minutes_left = int((3600 - (now - plant.last_fertilized).total_seconds()) // 60) + 1
            return Response({
                "error": f"You can only fertilize your plant once per hour. Please wait {minutes_left} more minutes."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Slightly boost health and mood
        plant.health_score = min(100, plant.health_score + 7)  # Fertilizer is a bit stronger than water
        plant.last_fertilized = now
        plant.update_care_streak()  # Update streak when fertilizing
        plant.save()

        from .services import PlantGrowthService
        PlantGrowthService.update_plant_mood(plant, 0.15, entry_type='fertilizing')  # 0.15 = small positive mood

        serializer = self.get_serializer(plant)
        return Response({
            "message": "Plant fertilized!",
            "plant": serializer.data
        })

    @action(detail=True, methods=['post'])
    def sunshine(self, request, pk=None):
        """Give sunshine to the user's plant, with a 1-hour cooldown. Slightly boosts growth/level."""
        plant = self.get_object()
        if not plant:
            return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        # Use last_fertilized as a cooldown field for sunshine (since last_sunshine was removed)
        if plant.last_fertilized and (now - plant.last_fertilized).total_seconds() < 3600:
            minutes_left = int((3600 - (now - plant.last_fertilized).total_seconds()) // 60) + 1
            return Response({
                "error": f"You can only give sunshine once per hour. Please wait {minutes_left} more minutes."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Boost growth/level
        plant.growth_stage = min(10, plant.growth_stage + 2)
        if plant.growth_stage >= 10:
            plant.growth_level = min(10, plant.growth_level + 1)
            plant.growth_stage = 0
        
        # Use last_fertilized as the cooldown field for sunshine
        plant.last_fertilized = now
        plant.save()

        # Log the action
        plant.logs.create(
            activity_type="sunshine",
            growth_impact=2,
            note="Sunshine given!"
        )

        serializer = self.get_serializer(plant)
        return Response({
            "message": "Sunshine given!",
            "plant": serializer.data
        })

    @action(detail=False, methods=['get'])
    def public_view(self, request):
        """Get public view data for Firestore"""
        plant = self.get_object()
        if not plant:
            return Response({"error": "No plant found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Force update Firestore data
        plant.write_to_firestore()
        
        return Response({
            "message": "Plant data updated in Firestore",
            "userId": str(request.user.id),
            "username": request.user.username
        })

    @action(detail=True, methods=['post'])
    def test_mood_update(self, request, pk=None):
        """Test endpoint to manually update plant mood"""
        plant = self.get_object()
        
        # Test with a sample positive journal text
        test_text = request.data.get('text', "I'm feeling really happy and grateful today! Life is wonderful.")
        
        try:
            from .services import PlantGrowthService
            sentiment_score = PlantGrowthService.process_journal_sentiment(plant, test_text)
            
            # Refresh plant data
            plant.refresh_from_db()
            
            return Response({
                'message': 'Mood update test completed',
                'sentiment_score': sentiment_score,
                'journal_mood_score': plant.journal_mood_score,
                'combined_mood_score': plant.combined_mood_score,
                'current_mood_influence': plant.current_mood_influence,
                'plant': PlantSerializer(plant).data
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to test mood update: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PublicPlantView(APIView):
    """View other users' plants"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        """Get another user's plant data from Firestore"""
        try:
            firestore_service = FirestoreService()
            plant_data = firestore_service.get_plant_data(user_id)
            
            if plant_data:
                return Response(plant_data)
            else:
                return Response(
                    {"error": "Plant not found or not public"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PlantLogViewSet(viewsets.ModelViewSet):
    """View plant activity logs"""
    serializer_class = PlantLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'plant'):
            return PlantLog.objects.filter(plant=self.request.user.plant)
        return PlantLog.objects.none()

class PublicGardenView(APIView):
    """List all public plants for the public garden feature"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            firestore_service = FirestoreService()
            plants = firestore_service.list_all_public_plants()
            return Response(plants)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WaterOtherPlantView(APIView):
    """Allow a user to water another user's plant by user_id"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            # Only allow watering if the user is not watering their own plant
            if str(request.user.id) == str(user_id):
                return Response({"error": "You cannot water your own plant using this endpoint."}, status=status.HTTP_400_BAD_REQUEST)

            # Get the target user's plant
            target_plant = Plant.objects.filter(user__id=user_id).first()
            if not target_plant:
                return Response({"error": "Target plant not found."}, status=status.HTTP_404_NOT_FOUND)

            amount = request.data.get('amount', 10)  # Social watering is less than self-watering
            target_plant.water_plant(amount)

            # Log the social watering event
            PlantLog.objects.create(
                plant=target_plant,
                activity_type="watered",
                note=f"Watered by another user: {request.user.username}",
                value=amount
            )

            serializer = PlantSerializer(target_plant)
            return Response({
                "message": f"You watered {target_plant.name}!",
                "plant": serializer.data
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MemorySeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plant = Plant.objects.filter(user=request.user).first()
            if not plant:
                return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)
            seeds = plant.memory_seeds.all()
            return Response(MemorySeedSerializer(seeds, many=True).data)
        except Exception as e:
            import traceback
            print(f"Error in MemorySeedView.get: {e}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        plant = Plant.objects.filter(user=request.user).first()
        if not plant:
            return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)
        journal_entry_id = request.data.get('journal_entry')
        title = request.data.get('title')
        description = request.data.get('description', '')
        if not journal_entry_id or not title:
            return Response({"error": "journal_entry and title are required."}, status=status.HTTP_400_BAD_REQUEST)
        from apps.journal.models import JournalEntry
        try:
            journal_entry = JournalEntry.objects.get(id=journal_entry_id, user=request.user)
        except JournalEntry.DoesNotExist:
            return Response({"error": "Journal entry not found."}, status=status.HTTP_404_NOT_FOUND)
        seed = MemorySeed.objects.create(
            plant=plant,
            journal_entry=journal_entry,
            title=title,
            description=description
        )
        return Response(MemorySeedSerializer(seed).data, status=status.HTTP_201_CREATED)

class FantasyParamsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plant = Plant.objects.filter(user=request.user).first()
        if not plant:
            return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)
        mood_history = request.data.get('mood_history')
        theme = request.data.get('theme')
        from .services import PlantGrowthService
        params = PlantGrowthService.update_fantasy_params(plant, mood_history=mood_history, theme=theme)
        return Response({"fantasy_params": params})

class MindfulnessRewardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            plant = Plant.objects.filter(user=request.user).first()
            if not plant:
                return Response({"error": "No plant found."}, status=status.HTTP_404_NOT_FOUND)
            reward_type = request.data.get('reward_type', 'breathing')
            from .services import PlantGrowthService
            PlantGrowthService.reward_mindfulness(plant, reward_type=reward_type)
            return Response({"message": "Mindfulness reward applied!"})
        except Exception as e:
            import traceback
            print(f"Error in MindfulnessRewardView.post: {e}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
