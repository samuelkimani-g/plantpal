from django.contrib import admin
from .models import Plant, PlantLog

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'species', 'growth_level', 'health', 'health_status', 'date_added']
    list_filter = ['species', 'health_status', 'date_added']
    search_fields = ['name', 'user__username']
    readonly_fields = ['date_added', 'created_at', 'updated_at', 'health_status']

@admin.register(PlantLog)
class PlantLogAdmin(admin.ModelAdmin):
    list_display = ['plant', 'activity_type', 'growth_impact', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['plant__name', 'note']
