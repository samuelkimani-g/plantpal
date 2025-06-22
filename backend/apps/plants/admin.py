from django.contrib import admin
from .models import Plant, PlantLog

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'species', 'growth_stage', 'health_score', 'current_mood_influence', 'created_at']
    list_filter = ['species', 'growth_stage', 'current_mood_influence', 'created_at']
    search_fields = ['name', 'user__username']
    readonly_fields = ['created_at', 'updated_at', 'three_d_model_params']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'species')
        }),
        ('Plant State', {
            'fields': ('growth_stage', 'health_score', 'current_mood_influence', 'water_level')
        }),
        ('Care Information', {
            'fields': ('last_watered_at',)
        }),
        ('3D Model Data', {
            'fields': ('three_d_model_params',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(PlantLog)
class PlantLogAdmin(admin.ModelAdmin):
    list_display = ['plant', 'activity_type', 'growth_impact', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['plant__name', 'note']
    readonly_fields = ['created_at']
