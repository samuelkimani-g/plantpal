from django.db import models
from django.conf import settings
from django.utils import timezone # For timezone.now()

class Plant(models.Model):
    """
    Represents a user's virtual plant.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plants',
        help_text="The user who owns this plant."
    )
    name = models.CharField(
        max_length=100,
        help_text="The name given to the plant by the user."
    )
    species = models.CharField(
        max_length=100,
        default="Mystery Seedling", # Default species
        help_text="The type or species of the plant."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the plant was created."
    )
    
    # --- New/Updated Fields for Growth & Health ---
    growth_level = models.IntegerField(
        default=1,
        help_text="The current growth level of the plant (e.g., 1-10)."
    )
    health = models.IntegerField(
        default=100, # Start with full health
        help_text="The current health percentage of the plant (0-100)."
    )
    last_watered = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of the last time the plant was watered."
    )
    last_fertilized = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of the last time the plant was fertilized."
    )
    
    # You can add more fields as needed, e.g., 'xp_points', 'current_mood_score_average'

    class Meta:
        verbose_name = "Plant"
        verbose_name_plural = "Plants"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s {self.name} (Level {self.growth_level})"

class PlantLog(models.Model):
    """
    Records specific care activities for a plant.
    """
    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text="The plant to which this log entry belongs."
    )
    activity_type = models.CharField(
        max_length=50,
        help_text="Type of activity (e.g., 'watered', 'fertilized', 'pruned', 'journal_sentiment')."
    )
    note = models.TextField(
        blank=True,
        null=True,
        help_text="Optional notes about the activity."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the activity was logged."
    )
    # : A numerical value associated with the log, e.g., XP gained, water amount
    value = models.FloatField(
        default=0.0,
        help_text="An optional numerical value associated with the activity (e.g., mood score)."
    )

    class Meta:
        verbose_name = "Plant Log"
        verbose_name_plural = "Plant Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.activity_type} on {self.created_at.strftime('%Y-%m-%d')}"
