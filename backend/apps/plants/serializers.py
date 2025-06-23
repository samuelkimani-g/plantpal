from rest_framework import serializers
from django.utils import timezone
from datetime import datetime
from .models import Plant, PlantLog, MemorySeed

class PlantSerializer(serializers.ModelSerializer):
    """
    Serializer for Plant model
    """
    memory_seeds = serializers.SerializerMethodField()
    age_days = serializers.SerializerMethodField()
    total_music_minutes = serializers.SerializerMethodField()
    last_watered_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Plant
        fields = [
            'id', 'name', 'species', 'description', 'growth_level', 'growth_stage',
            'health', 'health_score', 'health_status', 'last_watered', 'last_watered_at', 'last_fertilized',
            'water_level', 'current_mood_influence', 'music_boost_active', 'date_added', 'created_at', 'updated_at',
            'combined_mood_score', 'fantasy_params', 'memory_seeds', 'three_d_model_params',
            'last_sunshine', 'care_streak', 'last_care_date', 'journal_mood_score', 'spotify_mood_score',
            'age_days', 'total_music_minutes', 'last_watered_formatted'
        ]
        read_only_fields = [
            'id', 'date_added', 'created_at', 'updated_at', 'health_status', 'combined_mood_score', 
            'fantasy_params', 'memory_seeds', 'age_days', 'total_music_minutes', 'last_watered_formatted'
        ]

    def get_memory_seeds(self, obj):
        return MemorySeedSerializer(obj.memory_seeds.all(), many=True).data

    def get_age_days(self, obj):
        """Calculate plant age in days"""
        if obj.created_at:
            delta = timezone.now() - obj.created_at
            return delta.days
        return 0

    def get_total_music_minutes(self, obj):
        """Get total music minutes from plant logs"""
        try:
            # Sum up music-related activity logs
            music_logs = obj.logs.filter(activity_type__in=['music_boost', 'offline_music'])
            total_minutes = sum(log.value or 0 for log in music_logs if log.value)
            return int(total_minutes)
        except:
            return getattr(obj, 'total_music_minutes', 0)

    def get_last_watered_formatted(self, obj):
        """Get formatted last watered date"""
        if obj.last_watered_at or obj.last_watered:
            last_watered = obj.last_watered_at or obj.last_watered
            return last_watered.strftime('%m/%d/%Y')
        return None

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
