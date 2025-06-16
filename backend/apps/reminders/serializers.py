from rest_framework import serializers
from .models import Reminder
from apps.plants.models import Plant # Import Plant model for validation if needed
from django.utils import timezone

class ReminderSerializer(serializers.ModelSerializer):
    """
    Serializer for the Reminder model.
    Handles converting Reminder model instances to/from JSON.
    """
    # Read-only field to display the username of the reminder's owner.
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Reminder
        fields = [
            'id', 'user', 'plant', 'title', 'description', 
            'scheduled_for', 'notified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'notified', 'created_at', 'updated_at']

    def validate_title(self, value):
        """
        Validates that the reminder title is not empty and has a reasonable length.
        """
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Reminder title must be at least 3 characters long.")
        if len(value.strip()) > 255: # Matches model max_length
            raise serializers.ValidationError("Reminder title cannot exceed 255 characters.")
        return value

    def validate_scheduled_for(self, value):
        """
        Validates that the scheduled_for datetime is not in the past.
        """
        if value < timezone.now():
            raise serializers.ValidationError("Scheduled time cannot be in the past.")
        return value

    def validate_plant(self, value):
        """
        Validates that the provided plant ID belongs to the current user.
        This is an extra security/integrity check, as permissions will also filter.
        """
        request = self.context.get('request')
        if value and request and request.user.is_authenticated:
            # Check if the plant exists and belongs to the authenticated user
            if not Plant.objects.filter(id=value.id, user=request.user).exists():
                raise serializers.ValidationError("The specified plant does not exist or does not belong to you.")
        return value

