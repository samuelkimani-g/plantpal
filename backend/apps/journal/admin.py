from django.contrib import admin
from .models import JournalEntry

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    """
    Custom admin options for the JournalEntry model.
    Configured to match the updated MoodEntry fields and JournalEntry's created_at.
    """
    list_display = ('user', 'text_preview', 'created_at', 'mood_entry_display', 'is_favorite') # <--- CORRECTED: 'date' to 'created_at'
    list_filter = ('created_at', 'is_favorite', 'mood_entry__mood_type') # <--- CORRECTED: 'date' to 'created_at', 'mood_entry__mood' to 'mood_entry__mood_type'
    search_fields = ('user__username', 'text')
    readonly_fields = ('created_at',) # <--- CORRECTED: 'date' to 'created_at'
    date_hierarchy = 'created_at' # <--- This was already correct, but ensuring it's used with created_at

    def text_preview(self, obj):
        """Displays a truncated preview of the journal text."""
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Entry Text"

    def mood_entry_display(self, obj):
        # Displays the mood type and score for the JournalEntry in the admin list
        if obj.mood_entry:
            return f"{obj.mood_entry.mood_type} ({obj.mood_entry.mood_score:.2f})"
        return "-"
    mood_entry_display.short_description = 'Mood'
