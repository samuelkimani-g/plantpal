from django.db import models
from django.conf import settings # To access AUTH_USER_MODEL

class MoodEntry(models.Model):
    """
    Represents a user's mood entry, with both a descriptive type and a numerical score.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mood_entries',
        help_text="The user this mood entry belongs to."
    )
    
    # The descriptive name of the mood (e.g., 'Happy', 'Stressed')
    mood_type = models.CharField(
        max_length=50,
        help_text="The general mood (e.g., 'Happy', 'Stressed', 'Neutral')."
    )
    
    # Numerical mood score from 0.0 (very negative) to 1.0 (very positive), 0.5 is neutral.
    mood_score = models.FloatField(
        default=0.5,
        help_text="Numerical representation of mood (0.0 to 1.0, 0.5 is neutral)"
    )
    
    # Optional: A short note or context for this mood entry.
    note = models.TextField(
        blank=True,
        null=True, # Allow NULL in database for existing entries if they don't have a note
        help_text="Optional: A short note or context for this mood entry."
    )

    # Automatically sets the timestamp when the entry is created.
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the mood entry was recorded."
    )

    class Meta:
        verbose_name = "Mood Entry"
        verbose_name_plural = "Mood Entries"
        # Order by most recent first based on the 'created_at' field
        ordering = ['-created_at'] 

    def __str__(self):
        """
        String representation of the MoodEntry.
        """
        return f"{self.user.username}'s mood: {self.mood_type} ({self.mood_score}) at {self.created_at.strftime('%Y-%m-%d %H:%M')}"

