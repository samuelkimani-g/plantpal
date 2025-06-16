from django.contrib import admin
from .models import Plant, PlantLog

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Plant model.
    Updated to reflect fields: name, species, growth_level, health, last_watered, last_fertilized, created_at.
    """
    list_display = (
        'id', 'user', 'name', 'species', 
        'growth_level', 'health', 
        'last_watered', 'last_fertilized', 
        'created_at' # <--- Corrected: Use 'created_at'
    )
    list_filter = (
        'user', 'species', 'growth_level', # <--- Corrected: No 'date_added'
        'created_at', # <--- Corrected: Use 'created_at'
    )
    search_fields = ('name', 'species', 'user__username')
    readonly_fields = (
        'id', 'created_at', # <--- Corrected: Use 'created_at'
        # These fields are updated by signals, so making them readonly in admin is good practice
        'growth_level', 'health', 'last_watered', 'last_fertilized' 
    )
    date_hierarchy = 'created_at' # <--- Corrected: Use 'created_at'

@admin.register(PlantLog)
class PlantLogAdmin(admin.ModelAdmin):
    """
    Admin configuration for the PlantLog model.
    Updated to reflect fields: plant, activity_type, note, value, created_at.
    """
    list_display = (
        'id', 'plant', 'activity_type', 'value', 'note_preview', 'created_at' # <--- Corrected: No 'date', 'watered', 'fertilized'
    )
    list_filter = (
        'plant', 'activity_type', 'created_at' # <--- Corrected: No 'watered', 'fertilized', 'date'
    )
    search_fields = ('plant__name', 'activity_type', 'note')
    readonly_fields = ('id', 'created_at') # <--- Corrected: Use 'created_at'
    date_hierarchy = 'created_at' # <--- Corrected: Use 'created_at'

    def note_preview(self, obj):
        """Displays a truncated preview of the log note."""
        return obj.note[:50] + '...' if obj.note and len(obj.note) > 50 else (obj.note if obj.note else "-")
    note_preview.short_description = "Note"
