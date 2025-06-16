from rest_framework import serializers
from .models import Plant, PlantLog
from apps.accounts.serializers import UserSerializer # Assuming UserSerializer is available

class PlantLogSerializer(serializers.ModelSerializer):
    # plant = serializers.PrimaryKeyRelatedField(queryset=Plant.objects.all()) # If you want to require plant ID
    plant = serializers.ReadOnlyField(source='plant.name') # Display plant name
    
    class Meta:
        model = PlantLog
        fields = ('id', 'plant', 'activity_type', 'note', 'value', 'created_at')
        read_only_fields = ('id', 'created_at')

class PlantSerializer(serializers.ModelSerializer):
    # Nested serializer for logs if you want to show them directly with the plant
    # logs = PlantLogSerializer(many=True, read_only=True)
    user = serializers.ReadOnlyField(source='user.username') # Show username instead of user ID

    class Meta:
        model = Plant
        # Include the new growth/health/timestamp fields
        fields = ('id', 'user', 'name', 'species', 'created_at', 
                  'growth_level', 'health', 'last_watered', 'last_fertilized')
        read_only_fields = ('id', 'user', 'created_at') # These are system-managed

    def create(self, validated_data):
        # Automatically set the user to the requesting user
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
