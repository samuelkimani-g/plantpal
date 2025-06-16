from rest_framework import serializers
from .models import JournalEntry
from apps.accounts.serializers import UserSerializer
from apps.moods.serializers import MoodEntrySerializer
from apps.moods.utils import get_suggestion # Ensure this utility is correctly imported

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the JournalEntry model.
    Handles converting JournalEntry model instances to/from JSON.
    """
    user = serializers.ReadOnlyField(source='user.username')
    mood_entry = MoodEntrySerializer(read_only=True)
    suggestion = serializers.SerializerMethodField() # Field to provide AI suggestion

    class Meta:
        model = JournalEntry
        fields = ('id', 'user', 'text', 'created_at', 'mood_entry', 'is_favorite', 'suggestion')
        read_only_fields = ('id', 'user', 'created_at', 'mood_entry', 'suggestion') # suggestion is read-only

    def validate_text(self, value):
        """
        Ensures the journal entry text is not empty and meets a minimum length requirement.
        """
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError(
                "Journal entry text must be at least 5 characters long."
            )
        return value

    def get_suggestion(self, obj):
        """
        Returns a smart suggestion based on the mood associated with the journal entry.
        Falls back to neutral suggestions if no mood is associated.
        """
        if obj.mood_entry and obj.mood_entry.mood_type: # <--- CORRECTED: Use mood_type
            return get_suggestion(obj.mood_entry.mood_type)
        return get_suggestion("neutral") # Default to neutral if no mood is linked or mood_type is missing

    def create(self, validated_data):
        """
        Creates a journal entry and lets the signal handle mood_entry creation.
        """
        user = self.context['request'].user
        return JournalEntry.objects.create(user=user, **validated_data)

    def to_representation(self, instance):
        """
        Custom representation to format user data consistently.
        """
        representation = super().to_representation(instance)
        # Ensure user field shows username instead of just ID
        representation['user'] = UserSerializer(instance.user).data['username']
        return representation

