from django.db import models
from django.contrib.auth import get_user_model # Use get_user_model() for custom user model

# Get the custom user model (accounts.CustomUser)
User = get_user_model()

class MoodEntry(models.Model):
    """
    Represents a specific mood reported or inferred for a user at a given time.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='mood_entries', # Allows accessing user.mood_entries.all()
        help_text="The user this mood entry belongs to."
    )
    mood = models.CharField(
        max_length=50,
        help_text="The general mood (e.g., 'Happy', 'Stressed', 'Neutral')."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True, # Automatically sets the timestamp when the entry is created
        help_text="The date and time the mood entry was recorded."
    )
    note = models.TextField(
        blank=True,
        help_text="Optional: A short note or context for this mood entry."
    )

    class Meta:
        verbose_name = "Mood Entry"
        verbose_name_plural = "Mood Entries"
        ordering = ['-timestamp'] # Order by most recent first

    def __str__(self):
        """
        String representation of the MoodEntry.
        """
        return f"{self.user.username}'s mood: {self.mood} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
