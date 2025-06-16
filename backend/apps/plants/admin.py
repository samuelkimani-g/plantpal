from django.contrib import admin
from .models import Plant, PlantLog # Import both new models

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    """
    Custom admin options for the Plant model.
    """
    list_display = ('user', 'name', 'species', 'date_added')
    list_filter = ('species', 'date_added')
    search_fields = ('name', 'species', 'user__username')
    readonly_fields = ('date_added',)

@admin.register(PlantLog)
class PlantLogAdmin(admin.ModelAdmin):
    """
    Custom admin options for the PlantLog model.
    """
    list_display = ('plant', 'date', 'watered', 'fertilized', 'note_preview')
    list_filter = ('watered', 'fertilized', 'date')
    search_fields = ('note', 'plant__name') # Search through log note and related plant's name
    readonly_fields = ('date',)
    raw_id_fields = ('plant',) # Useful for selecting plants

    def note_preview(self, obj):
        """Displays a truncated preview of the log note."""
        return obj.note[:50] + '...' if len(obj.note) > 50 else obj.note
    note_preview.short_description = "Note Preview" # Column header in admin
