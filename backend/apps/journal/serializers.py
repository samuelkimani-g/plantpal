from rest_framework import serializers
from .models import JournalEntry
from apps.moods.utils import get_suggestion

class JournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for the JournalEntry model.
    Handles converting JournalEntry model instances to/from JSON.
    """
    # Read-only field to display the username of the entry's owner.
    # This ensures the user field is not expected in POST/PUT requests from frontend.
    user = serializers.ReadOnlyField(source='user.username')
    suggestion = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        # CRITICAL: Ensure 'suggestion' is included in the 'fields' tuple
        fields = ['id', 'user', 'text', 'date', 'mood_entry', 'is_favorite', 'suggestion']
        read_only_fields = ['id', 'user', 'date', 'mood_entry', 'suggestion']

    def validate_text(self, value):
        """
        Custom validation for the 'text' field.
        Ensures the journal entry text is not empty and meets a minimum length requirement.
        """
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError("Journal entry text must be at least 5 characters long.")
        return value

    def validate_mood(self, value):
        """
        Custom validation for the 'mood' field.
        Ensures that if a mood value is provided (e.g., by sentiment analysis),
        it falls within a predefined list of allowed moods.
        """
        allowed_moods = ['happy', 'sad', 'stressed', 'relaxed', 'neutral', 'anxious', 'hopeful', 'joyful', 'calm', 'energetic']
        if value:  # Only validate if a mood value is present
            value_lower = value.lower()
            if value_lower not in allowed_moods:
                raise serializers.ValidationError(
                    f"'{value}' is not a valid mood. Allowed moods are: {', '.join(allowed_moods)}."
                )
        return value
    
    def get_suggestion(self, obj):
        """
        Returns a smart suggestion based on the mood associated with the journal entry.
        If no mood is associated, a default suggestion is returned.
        """
        if obj.mood_entry and obj.mood_entry.mood:
            return get_suggestion(obj.mood_entry.mood)
        else:
            # If no mood_entry or mood is present (e.g., before sentiment analysis is run),
            # return a generic suggestion.
            return get_suggestion("neutral") # Fallback to a neutral mood for suggestions

