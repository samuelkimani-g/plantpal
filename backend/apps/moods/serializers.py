from rest_framework import serializers
from .models import MoodEntry

class MoodEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the MoodEntry model.
    Handles converting MoodEntry model instances to/from JSON.
    """
    # Read-only field to display the username of the mood entry's owner.
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MoodEntry
        fields = ['id', 'user', 'mood', 'timestamp', 'note']
        read_only_fields = ['id', 'user', 'timestamp'] # ID and timestamp are auto-generated, user is set by view

    def validate_mood(self, value):
        """
        Custom validation for the 'mood' field.
        Ensures the mood string is not empty and has a reasonable length.
        """
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("Mood cannot be empty and must be at least 2 characters long.")
        if len(value.strip()) > 50: # Matches model max_length
            raise serializers.ValidationError("Mood cannot exceed 50 characters.")
        return value

    def validate_note(self, value):
        """
        Custom validation for the 'note' field.
        Ensures the note does not exceed a certain length (optional).
        """
        if value and len(value.strip()) > 500: # Example max length for note
            raise serializers.ValidationError("Note cannot exceed 500 characters.")
        return value

