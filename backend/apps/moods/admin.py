from django.contrib import admin
from .models import MoodEntry

@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'mood_type', 'mood_score', 'note', 'created_at') # <--- CORRECTED
    list_filter = ('user', 'mood_type', 'created_at') 
    search_fields = ('mood_type', 'note', 'user__username')
    readonly_fields = ('id', 'created_at')
    date_hierarchy = 'created_at' 

    def note_preview(self, obj):
        """Displays a truncated preview of the mood note."""
        return obj.note[:50] + '...' if len(obj.note) > 50 else obj.note
    note_preview.short_description = "Note Preview"

