from rest_framework import serializers
from .models import JournalEntry
from apps.moods.serializers import MoodEntrySerializer

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for JournalEntry model
    """
    mood_entry = MoodEntrySerializer(read_only=True)
    mood = serializers.CharField(source='mood_entry.mood_type', read_only=True)

    class Meta:
        model = JournalEntry
        fields = ['id', 'text', 'mood_entry', 'mood', 'is_favorite', 'created_at']
        read_only_fields = ['id', 'created_at', 'mood_entry', 'mood']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
