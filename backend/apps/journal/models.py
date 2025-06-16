from django.db import models
from django.contrib.auth import get_user_model
# Import the new MoodEntry model from the moods app
from apps.moods.models import MoodEntry # <-- NEW IMPORT

User = get_user_model()

class JournalEntry(models.Model):
    """
    Represents a single journal entry created by a user.
    Each entry includes the text, creation date, and a favorite flag.
    Now includes a link to an optional MoodEntry.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="entries",
        help_text="The user who created this journal entry."
    )
    text = models.TextField(
        help_text="The main text content of the journal entry."
    )
    date = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the entry was created."
    )
    # The 'mood' field is now a ForeignKey to the MoodEntry model.
    # It's nullable (SET_NULL) so existing entries don't break if mood is deleted,
    # and it's blank so it's not required during initial journal entry creation.
    # This will be populated by sentiment analysis later.
    mood_entry = models.ForeignKey( # Changed from CharField to ForeignKey
        MoodEntry,
        on_delete=models.SET_NULL, # If the MoodEntry is deleted, set this field to NULL
        null=True,                 # Allows NULL values in the database
        blank=True,                # Allows the field to be blank in forms/serializers
        related_name='journal_entries', # Allows accessing mood_entry.journal_entries.all()
        help_text="The associated mood entry, derived from sentiment analysis."
    )
    is_favorite = models.BooleanField(
        default=False,
        help_text="Boolean flag indicating if this entry is marked as a user favorite."
    )

    class Meta:
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username}'s entry on {self.date.strftime('%Y-%m-%d %H:%M')}"

