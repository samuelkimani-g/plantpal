from rest_framework import serializers
from .models import Plant, PlantLog

class PlantSerializer(serializers.ModelSerializer):
    """
    Serializer for Plant model
    """
    class Meta:
        model = Plant
        fields = [
            'id', 'name', 'species', 'description', 'growth_level', 
            'health', 'health_status', 'last_watered', 'last_fertilized',
            'music_boost_active', 'date_added', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'date_added', 'created_at', 'updated_at', 'health_status']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class PlantLogSerializer(serializers.ModelSerializer):
    """
    Serializer for PlantLog model
    """
    class Meta:
        model = PlantLog
        fields = ['id', 'plant', 'activity_type', 'note', 'growth_impact', 'value', 'created_at', 'timestamp']
        read_only_fields = ['id', 'created_at', 'timestamp']
