from django.db import models
from django.contrib.auth import get_user_model # Use get_user_model() for custom user model

# Get the custom user model defined in settings.py (accounts.CustomUser)
User = get_user_model()

class Plant(models.Model):
    """
    Represents a specific plant owned by a user (e.g., a real-world plant they are tracking).
    A user can have multiple plants.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='plants', # Allows accessing user.plants.all()
        help_text="The user who owns this plant."
    )
    name = models.CharField(
        max_length=100,
        help_text="The common or given name of the plant."
    )
    species = models.CharField(
        max_length=100,
        blank=True,
        help_text="The botanical species of the plant (optional)."
    )
    date_added = models.DateField(
        auto_now_add=True, # Automatically sets the date when the plant is first added
        help_text="The date when this plant was added to the user's collection."
    )

    class Meta:
        verbose_name = "User Plant"
        verbose_name_plural = "User Plants"
        ordering = ['name'] # Order plants by name by default

    def __str__(self):
        """
        String representation of the Plant.
        """
        return f"{self.name} ({self.species or 'N/A'}) by {self.user.username}"

class PlantLog(models.Model):
    """
    Records specific events or observations related to a Plant,
    such as watering, fertilizing, or general notes.
    """
    plant = models.ForeignKey(
        Plant,
        on_delete=models.CASCADE,
        related_name='logs', # Allows accessing plant.logs.all()
        help_text="The plant this log entry belongs to."
    )
    date = models.DateTimeField(
        auto_now_add=True, # Automatically sets the date and time of the log
        help_text="The date and time the log entry was created."
    )
    note = models.TextField(
        blank=True,
        help_text="Any additional notes or observations for this log."
    )
    watered = models.BooleanField(
        default=False,
        help_text="Indicates if the plant was watered in this log entry."
    )
    fertilized = models.BooleanField(
        default=False,
        help_text="Indicates if the plant was fertilized in this log entry."
    )

    class Meta:
        verbose_name = "Plant Log"
        verbose_name_plural = "Plant Logs"
        ordering = ['-date'] # Order logs by most recent first

    def __str__(self):
        """
        String representation of the PlantLog.
        """
        log_type = []
        if self.watered:
            log_type.append("Watered")
        if self.fertilized:
            log_type.append("Fertilized")
        
        type_str = ", ".join(log_type) if log_type else "Note"
        
        return f"Log for {self.plant.name} - {self.date.strftime('%Y-%m-%d %H:%M')} ({type_str})"
