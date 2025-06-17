from django.contrib import admin
from .models import Reminder

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'reminder_type', 'scheduled_for', 'is_active']
    list_filter = ['reminder_type', 'is_active', 'created_at']
    search_fields = ['title', 'user__username']
