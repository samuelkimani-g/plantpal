from rest_framework import serializers
from .models import JournalEntry

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for JournalEntry model
    """
    class Meta:
        model = JournalEntry
        fields = ['id', 'text', 'mood', 'mood_score', 'is_favorite', 'created_at']
        read_only_fields = ['id', 'created_at', 'mood', 'mood_score']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
