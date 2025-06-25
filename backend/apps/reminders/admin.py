from django.contrib import admin
from .models import Reminder, ReminderLog

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ['user', 'time', 'method', 'enabled', 'consecutive_misses']
    list_filter = ['method', 'enabled', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'last_reminder_sent']
    
@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ['reminder', 'sent_at', 'method_used', 'success', 'was_wilting_warning']
    list_filter = ['method_used', 'success', 'was_wilting_warning', 'sent_at']
    search_fields = ['reminder__user__username']
    readonly_fields = ['sent_at']
