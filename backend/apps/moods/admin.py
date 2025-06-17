from django.contrib import admin
from .models import MoodEntry

@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'mood_type', 'mood_score', 'created_at']
    list_filter = ['mood_type', 'created_at']
    search_fields = ['user__username', 'note']
    readonly_fields = ['created_at']
