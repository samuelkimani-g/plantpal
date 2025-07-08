from rest_framework import serializers
from .models import JournalEntry

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for JournalEntry model
    """
    mood_type = serializers.CharField(write_only=True, required=False, help_text="User-selected mood type")
    mood_emoji = serializers.CharField(read_only=True, help_text="Emoji representation of mood")
    
    class Meta:
        model = JournalEntry
        fields = ['id', 'text', 'mood', 'mood_score', 'mood_emoji', 'is_favorite', 'created_at', 'mood_type']
        read_only_fields = ['id', 'created_at', 'mood_score', 'mood_emoji']

    def create(self, validated_data):
        # Extract mood_type and map it to mood field
        mood_type = validated_data.pop('mood_type', None)
        if mood_type:
            validated_data['mood'] = mood_type
        
        # Get user from context or request
        user = None
        if hasattr(self, 'context') and 'request' in self.context:
            user = self.context['request'].user
        elif hasattr(self, 'context') and 'user' in self.context:
            user = self.context['user']
        
        if user:
            validated_data['user'] = user
        
        return super().create(validated_data)
