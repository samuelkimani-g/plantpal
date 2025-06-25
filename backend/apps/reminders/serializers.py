from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Reminder, ReminderLog
from datetime import time


class ReminderSerializer(serializers.ModelSerializer):
    """
    Serializer for reminder settings as specified in architecture
    """
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    # Helper fields
    is_due_today = serializers.BooleanField(read_only=True)
    should_send_wilting_warning = serializers.BooleanField(read_only=True)
    reminder_message = serializers.CharField(source='get_reminder_message', read_only=True)
    
    class Meta:
        model = Reminder
        fields = [
            'id', 'username', 'user_email', 'time', 'timezone', 'method', 
            'enabled', 'consecutive_misses', 'last_journal_date', 
            'last_reminder_sent', 'wilting_threshold', 'email_subject',
            'created_at', 'updated_at', 'is_due_today', 
            'should_send_wilting_warning', 'reminder_message'
        ]
        read_only_fields = [
            'id', 'username', 'user_email', 'consecutive_misses', 
            'last_journal_date', 'last_reminder_sent', 'created_at', 
            'updated_at', 'is_due_today', 'should_send_wilting_warning',
            'reminder_message'
        ]

    def validate_time(self, value):
        """Validate reminder time format"""
        if not isinstance(value, time):
            raise serializers.ValidationError("Invalid time format")
        return value

    def validate_wilting_threshold(self, value):
        """Validate wilting threshold is reasonable"""
        if value < 1 or value > 10:
            raise serializers.ValidationError("Wilting threshold must be between 1 and 10 days")
        return value

    def validate_timezone(self, value):
        """Validate timezone format"""
        # Basic validation - could be enhanced with pytz
        if len(value) > 100:
            raise serializers.ValidationError("Timezone name too long")
        return value


class ReminderCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating/updating reminder settings
    """
    
    class Meta:
        model = Reminder
        fields = ['time', 'timezone', 'method', 'enabled', 'wilting_threshold', 'email_subject']

    def validate_time(self, value):
        """Validate reminder time format"""
        if not isinstance(value, time):
            raise serializers.ValidationError("Invalid time format")
        return value


class ReminderToggleSerializer(serializers.Serializer):
    """
    Serializer for toggling reminder on/off
    """
    enabled = serializers.BooleanField()


class ReminderLogSerializer(serializers.ModelSerializer):
    """
    Serializer for reminder logs (read-only)
    """
    username = serializers.CharField(source='reminder.user.username', read_only=True)
    user_email = serializers.CharField(source='reminder.user.email', read_only=True)
    
    class Meta:
        model = ReminderLog
        fields = [
            'id', 'username', 'user_email', 'sent_at', 'method_used', 
            'success', 'error_message', 'consecutive_misses_at_time', 
            'was_wilting_warning'
        ]
        read_only_fields = '__all__'


class ReminderStatsSerializer(serializers.Serializer):
    """
    Serializer for reminder statistics
    """
    total_reminders_sent = serializers.IntegerField(read_only=True)
    successful_reminders = serializers.IntegerField(read_only=True)
    failed_reminders = serializers.IntegerField(read_only=True)
    consecutive_misses = serializers.IntegerField(read_only=True)
    last_journal_date = serializers.DateField(read_only=True)
    wilting_warnings_sent = serializers.IntegerField(read_only=True)
    current_streak = serializers.IntegerField(read_only=True)


class TestReminderSerializer(serializers.Serializer):
    """
    Serializer for testing reminder functionality
    """
    message = serializers.CharField(read_only=True)
    success = serializers.BooleanField(read_only=True)


class BulkReminderSerializer(serializers.Serializer):
    """
    Serializer for bulk reminder operations (admin only)
    """
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of user IDs to send reminders to"
    )
    force_send = serializers.BooleanField(
        default=False,
        help_text="Send reminder even if already sent today"
    )


class ReminderSettingsUpdateSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for updating reminder settings
    """
    current_settings = serializers.SerializerMethodField()
    
    class Meta:
        model = Reminder
        fields = [
            'time', 'timezone', 'method', 'enabled', 'wilting_threshold', 
            'email_subject', 'current_settings'
        ]
        
    def get_current_settings(self, obj):
        """Get current reminder settings summary"""
        return {
            'is_enabled': obj.enabled,
            'next_reminder_due': obj.is_due_today,
            'consecutive_misses': obj.consecutive_misses,
            'wilting_warning_threshold': obj.wilting_threshold,
            'last_sent': obj.last_reminder_sent,
        }

    def validate(self, attrs):
        """Validate reminder settings combination"""
        # Ensure email is available if email method selected
        if attrs.get('method') in ['email', 'both']:
            user = self.instance.user if self.instance else self.context['request'].user
            if not user.email:
                raise serializers.ValidationError({
                    'method': 'Email method requires a valid email address'
                })
        
        return attrs

    def update(self, instance, validated_data):
        """Update reminder settings and handle side effects"""
        # Store old settings for comparison
        old_enabled = instance.enabled
        old_time = instance.time
        
        # Update the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Log settings change
        if old_enabled != instance.enabled:
            action = "enabled" if instance.enabled else "disabled"
            # Could log this change to ReminderLog if needed
            
        return instance
