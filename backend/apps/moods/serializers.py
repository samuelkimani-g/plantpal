from rest_framework import serializers
from .models import MoodEntry

class MoodEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for MoodEntry model
    """
    class Meta:
        model = MoodEntry
        fields = ['id', 'mood_type', 'mood_score', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
