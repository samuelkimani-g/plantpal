from rest_framework import serializers
from .models import JournalEntry

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for JournalEntry model
    """
    mood_type = serializers.CharField(write_only=True, required=False, help_text="User-selected mood type")
    
    class Meta:
        model = JournalEntry
        fields = ['id', 'text', 'mood', 'mood_score', 'is_favorite', 'created_at', 'mood_type']
        read_only_fields = ['id', 'created_at', 'mood_score']

    def create(self, validated_data):
        # Extract mood_type and map it to mood field
        mood_type = validated_data.pop('mood_type', None)
        if mood_type:
            validated_data['mood'] = mood_type
        
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
