from rest_framework import serializers
from .models import MoodEntry
from apps.accounts.serializers import UserSerializer

class MoodEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the MoodEntry model.
    Handles converting MoodEntry model instances to/from JSON.
    """
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MoodEntry
        fields = ('id', 'user', 'mood_type', 'mood_score', 'note', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')

    def validate_mood_type(self, value):
        """
        Custom validation for the mood_type field.
        Ensures the mood string is valid and meets length requirements.
        """
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Mood cannot be empty and must be at least 2 characters long."
            )
        if len(value.strip()) > 50:
            raise serializers.ValidationError(
                "Mood cannot exceed 50 characters."
            )
        return value

    def validate_note(self, value):
        """
        Custom validation for the note field.
        Ensures the note doesn't exceed maximum length if provided.
        """
        if value and len(value.strip()) > 500:
            raise serializers.ValidationError(
                "Note cannot exceed 500 characters."
            )
        return value

    def validate_mood_score(self, value):
        """
        Custom validation for the mood_score field.
        Ensures the score falls within the valid range (0.0 to 1.0).
        """
        if value is not None and (value < 0.0 or value > 1.0):
            raise serializers.ValidationError(
                "Mood score must be between 0.0 and 1.0."
            )
        return value