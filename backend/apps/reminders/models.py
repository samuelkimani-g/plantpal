from django.db import models
from django.contrib.auth import get_user_model
from apps.plants.models import Plant # Import the Plant model

# Get the custom user model
User = get_user_model()

class Reminder(models.Model):
    """
    Represents a reminder scheduled by a user for themselves or a specific plant.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reminders', # Allows accessing user.reminders.all()
        help_text="The user who created this reminder."
    )
    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        null=True,     # Reminder might not be associated with a specific plant
        blank=True,    # Allows the field to be blank in forms/serializers
        related_name='reminders', # Allows accessing plant.reminders.all()
        help_text="Optional: The specific plant this reminder is for."
    )
    title = models.CharField(
        max_length=255,
        help_text="A short, descriptive title for the reminder."
    )
    description = models.TextField( # Added a description field for more details
        blank=True,
        help_text="Optional: Detailed description of the reminder."
    )
    scheduled_for = models.DateTimeField(
        help_text="The exact date and time when the reminder is scheduled to occur."
    )
    notified = models.BooleanField(
        default=False,
        help_text="Flag indicating if the user has already been notified for this reminder."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the reminder was created in the system."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of the last update to the reminder."
    )

    # Additional fields to match frontend expectations
    reminder_type = models.CharField(
        max_length=50,
        default='custom',
        help_text="Type of reminder (journal, water, mood, etc.)"
    )
    scheduled_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Time component of the scheduled reminder."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this reminder is active."
    )
    days_of_week = models.CharField(
        max_length=20,
        default='1234567',
        help_text="Days of week for recurring reminders (1=Monday, 7=Sunday)."
    )

    class Meta:
        verbose_name = "Reminder"
        verbose_name_plural = "Reminders"
        ordering = ['scheduled_for'] # Order reminders by their scheduled time

    def __str__(self):
        """
        String representation of the Reminder.
        """
        plant_name = f" for {self.plant.name}" if self.plant else ""
        return f"Reminder: '{self.title}'{plant_name} at {self.scheduled_for.strftime('%Y-%m-%d %H:%M')}"
