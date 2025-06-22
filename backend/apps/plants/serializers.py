from rest_framework import serializers
from .models import Plant, PlantLog, MemorySeed

class PlantSerializer(serializers.ModelSerializer):
    """
    Serializer for Plant model
    """
    memory_seeds = serializers.SerializerMethodField()
    class Meta:
        model = Plant
        fields = [
            'id', 'name', 'species', 'description', 'growth_level', 'growth_stage',
            'health', 'health_score', 'health_status', 'last_watered', 'last_watered_at', 'last_fertilized',
            'water_level', 'current_mood_influence', 'music_boost_active', 'date_added', 'created_at', 'updated_at',
            'combined_mood_score', 'fantasy_params', 'memory_seeds', 'three_d_model_params',
            'last_sunshine', 'care_streak', 'last_care_date'
        ]
        read_only_fields = ['id', 'date_added', 'created_at', 'updated_at', 'health_status', 'combined_mood_score', 'fantasy_params', 'memory_seeds']

    def get_memory_seeds(self, obj):
        return MemorySeedSerializer(obj.memory_seeds.all(), many=True).data

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

class MemorySeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemorySeed
        fields = ['id', 'plant', 'journal_entry', 'title', 'description', 'created_at']
