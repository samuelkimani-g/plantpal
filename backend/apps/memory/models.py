from django.db import models
from django.conf import settings

class MemorySeed(models.Model):
    """
    Represents a 'memory seed' saved by a user, capturing a moment
    along with their mood at that time.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='memory_seeds'
    )
    title = models.CharField(max_length=120)
    content = models.TextField()
    
    # Mood is captured automatically on creation
    mood_label = models.CharField(max_length=50, default='neutral')
    mood_score = models.FloatField(default=0.5)
    
    # Placeholder for weather data to be added later
    weather_info = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"'{self.title}' by {self.user.username}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Memory Seed" 