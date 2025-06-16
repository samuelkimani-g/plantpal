from django.contrib import admin
from .models import Reminder

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """
    Custom admin options for the Reminder model.
    """
    list_display = ('user', 'title', 'plant_name', 'scheduled_for', 'notified', 'created_at')
    list_filter = ('notified', 'scheduled_for', 'plant__name') # Filter by notified status, scheduled time, and related plant name
    search_fields = ('user__username', 'title', 'description', 'plant__name')
    readonly_fields = ('created_at', 'updated_at')

    def plant_name(self, obj):
        """Displays the name of the associated plant, if any."""
        return obj.plant.name if obj.plant else "No Plant"
    plant_name.short_description = "Associated Plant"

