from django.contrib import admin
from .models import MoodEntry

@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    """
    Custom admin options for the MoodEntry model.
    """
    list_display = ('user', 'mood', 'timestamp', 'note_preview')
    list_filter = ('mood', 'timestamp')
    search_fields = ('user__username', 'mood', 'note')
    readonly_fields = ('timestamp',) # Timestamp is auto_now_add

    def note_preview(self, obj):
        """Displays a truncated preview of the mood note."""
        return obj.note[:50] + '...' if len(obj.note) > 50 else obj.note
    note_preview.short_description = "Note Preview"

