from rest_framework import serializers
from .models import Reminder

class ReminderSerializer(serializers.ModelSerializer):
    """
    Serializer for Reminder model
    """
    class Meta:
        model = Reminder
        fields = [
            'id', 'title', 'description', 'reminder_type', 
            'scheduled_for', 'scheduled_time', 'is_active', 'days_of_week', 
            'plant', 'notified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
