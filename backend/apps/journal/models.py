from django.db import models
from django.contrib.auth import get_user_model
from apps.moods.models import MoodEntry 
from django.conf import settings

User = get_user_model()

class JournalEntry(models.Model):
    """
    Represents a journal entry written by a user.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_entries',
        help_text="The user who created this journal entry."
    )
    text = models.TextField(
        help_text="The main content of the journal entry."
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        help_text="The date and time the entry was created."
    )
    mood_entry = models.ForeignKey(
        MoodEntry,
        on_delete=models.SET_NULL, # If mood entry is deleted, don't delete journal entry
        null=True,
        blank=True,
        related_name='journal_entries',
        help_text="The associated mood entry for this journal entry."
    )
    is_favorite = models.BooleanField(
        default=False,
        help_text="Whether this entry is marked as a favorite."
    )

    class Meta:
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"
        ordering = ['-created_at'] # Order by most recent first

    def __str__(self):
        return f"Journal by {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"
