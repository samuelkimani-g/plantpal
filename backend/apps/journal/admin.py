from django.contrib import admin
from .models import JournalEntry

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'is_favorite']
    list_filter = ['is_favorite', 'created_at']
    search_fields = ['user__username', 'text']
    readonly_fields = ['created_at']
