from rest_framework import serializers
from .models import MemorySeed

class MemorySeedSerializer(serializers.ModelSerializer):
    """Serializer for the MemorySeed model."""
    user_username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MemorySeed
        fields = [
            'id', 
            'user', 
            'user_username',
            'title', 
            'content', 
            'mood_label', 
            'mood_score', 
            'weather_info', 
            'created_at'
        ]
        read_only_fields = ['user', 'user_username', 'mood_label', 'mood_score', 'weather_info', 'created_at'] 