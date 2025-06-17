from django.db import models
from django.conf import settings
from django.utils import timezone

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
        default="Mystery Seedling",
        help_text="The type or species of the plant."
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional description of the plant."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the plant was created."
    )
    
    # Growth & Health
    growth_level = models.IntegerField(
        default=1,
        help_text="The current growth level of the plant (1-10)."
    )
    health = models.IntegerField(
        default=100,
        help_text="The current health percentage of the plant (0-100)."
    )
    
    # Care tracking
    last_watered = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of the last time the plant was watered."
    )
    last_fertilized = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of the last time the plant was fertilized."
    )
    
    # Music integration
    last_music_boost = models.DateTimeField(
        null=True, blank=True,
        help_text="Last time music affected this plant"
    )
    music_boost_active = models.BooleanField(
        default=False,
        help_text="Whether music boost is currently active."
    )
    total_music_minutes = models.IntegerField(
        default=0,
        help_text="Total minutes of music that have affected this plant"
    )
    
    # Status fields
    health_status = models.CharField(
        max_length=20,
        default='good',
        help_text="Current health status of the plant."
    )
    date_added = models.DateTimeField(
        auto_now_add=True,
        help_text="When the plant was added (alias for created_at)."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the plant was last updated."
    )

    class Meta:
        verbose_name = "Plant"
        verbose_name_plural = "Plants"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s {self.name} (Level {self.growth_level})"

    def save(self, *args, **kwargs):
        # Update health_status based on health value
        if self.health >= 80:
            self.health_status = 'excellent'
        elif self.health >= 60:
            self.health_status = 'good'
        elif self.health >= 40:
            self.health_status = 'fair'
        elif self.health >= 20:
            self.health_status = 'poor'
        else:
            self.health_status = 'critical'
        super().save(*args, **kwargs)

    def apply_music_mood(self, mood_score, minutes_listened):
        """
        Apply music mood effect to plant
        mood_score: 0.0 (sad) to 1.0 (happy)
        minutes_listened: number of minutes
        """
        # Music effect calculation
        music_weight = self.user.music_mood_weight
        base_effect = (mood_score - 0.5) * 20 * music_weight  # -10 to +10 health change
        time_bonus = min(minutes_listened * 0.5, 5)  # Up to 5 bonus points for time
        
        total_effect = base_effect + time_bonus
        
        # Apply health change
        self.health = max(0, min(100, self.health + total_effect))
        self.total_music_minutes += minutes_listened
        self.last_music_boost = timezone.now()
        
        # Check for growth
        if self.health >= 80 and self.growth_level < 10:
            self.growth_level += 1
            self.health = max(70, self.health - 10)  # Small health reduction after growth
        
        self.save()
        
        # Log the music effect
        PlantLog.objects.create(
            plant=self,
            activity_type="music_boost",
            note=f"Music mood: {mood_score:.2f}, Minutes: {minutes_listened}",
            value=mood_score,
            growth_impact=total_effect
        )

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
        help_text="Type of activity (e.g., 'watered', 'fertilized', 'pruned', 'journal_sentiment', 'music_boost')."
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
    value = models.FloatField(
        default=0.0,
        help_text="An optional numerical value associated with the activity (e.g., mood score)."
    )
    growth_impact = models.FloatField(
        default=0.0,
        help_text="How much this action affected growth."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp of the log entry."
    )

    class Meta:
        verbose_name = "Plant Log"
        verbose_name_plural = "Plant Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.activity_type} on {self.created_at.strftime('%Y-%m-%d')}"
