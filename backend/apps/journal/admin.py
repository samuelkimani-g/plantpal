from django.contrib import admin
from .models import JournalEntry

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    """
    Custom admin options for the JournalEntry model.
    """

    list_display = ('user', 'text_preview', 'date', 'mood_entry_display', 'is_favorite')
    list_filter = ('date', 'is_favorite', 'mood_entry__mood') # Filter by related mood field
    search_fields = ('user__username', 'text')
    readonly_fields = ('date',) 
  

    def text_preview(self, obj):
        """Displays a truncated preview of the journal text."""
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Entry Text"

    def mood_entry_display(self, obj):
        """Displays the mood string from the related MoodEntry, if available."""
        return obj.mood_entry.mood if obj.mood_entry else "N/A"
    mood_entry_display.short_description = "Mood" 
