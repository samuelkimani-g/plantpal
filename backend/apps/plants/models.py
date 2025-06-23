from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
import json

class Plant(models.Model):
    SPECIES_CHOICES = [
        ('succulent', 'Succulent'),
        ('fern', 'Fern'),
        ('flowering', 'Flowering Plant'),
        ('tree', 'Tree'),
        ('herb', 'Herb'),
        ('vine', 'Vine'),
    ]
    
    HEALTH_STATUS_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('critical', 'Critical'),
    ]

    # Basic plant info
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='plant')
    name = models.CharField(max_length=100)
    species = models.CharField(max_length=20, choices=SPECIES_CHOICES)
    description = models.TextField(blank=True)
    
    # Growth and health metrics
    growth_level = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)])
    growth_stage = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    health = models.IntegerField(default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    health_score = models.IntegerField(default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    health_status = models.CharField(max_length=20, choices=HEALTH_STATUS_CHOICES, default='good')
    
    # Care tracking
    last_watered = models.DateTimeField(null=True, blank=True)
    last_watered_at = models.DateTimeField(null=True, blank=True)
    last_fertilized = models.DateTimeField(null=True, blank=True)
    water_level = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Streak tracking
    care_streak = models.IntegerField(default=0, help_text="Number of consecutive days the plant has been cared for")
    last_care_date = models.DateField(null=True, blank=True, help_text="Last date any care action was performed")
    
    # Music and mood influence
    music_boost_active = models.BooleanField(default=False)
    current_mood_influence = models.CharField(max_length=50, default='neutral')
    total_music_minutes = models.IntegerField(default=0, help_text="Total minutes of music listened")
    journal_mood_score = models.FloatField(default=0.5, help_text="Mood score from journal entries (0.0 to 1.0)")
    spotify_mood_score = models.FloatField(default=0.5, help_text="Mood score from Spotify music (0.0 to 1.0)")
    
    # 3D model parameters
    three_d_model_params = models.JSONField(default=dict)
    
    # Timestamps
    date_added = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_sunshine = models.DateTimeField(null=True, blank=True)

    combined_mood_score = models.FloatField(default=0.5, help_text="Weighted average of journal and music mood (0.0 to 1.0)")
    fantasy_params = models.JSONField(default=dict, blank=True, help_text="Parameters for fantasy/creative plant appearance")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    @property
    def get_health_status(self):
        if self.health_score >= 90:
            return 'excellent'
        elif self.health_score >= 70:
            return 'good'
        elif self.health_score >= 50:
            return 'fair'
        elif self.health_score >= 30:
            return 'poor'
        else:
            return 'critical'

    def update_care_streak(self):
        """Update care streak based on daily care actions"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if self.last_care_date is None:
            # First time caring for plant
            self.care_streak = 1
            self.last_care_date = today
        elif self.last_care_date == today:
            # Already cared for today, no change to streak
            pass
        elif self.last_care_date == today - timezone.timedelta(days=1):
            # Cared for yesterday, increment streak
            self.care_streak += 1
            self.last_care_date = today
        else:
            # Gap in care, reset streak
            self.care_streak = 1
            self.last_care_date = today
        
        self.save()

    def water_plant(self, amount=20):
        """Water the plant and update health"""
        from django.utils import timezone
        
        self.water_level = min(100, self.water_level + amount)
        self.last_watered = timezone.now()
        self.last_watered_at = timezone.now()
        
        # Improve health slightly when watered
        if self.water_level > 30:
            self.health_score = min(100, self.health_score + 5)
        
        self.health_status = self.get_health_status
        self.update_care_streak()  # Update streak when watering
        self.update_3d_params()
        self.save()

    def update_3d_params(self):
        """Update 3D model parameters based on plant state"""
        # Calculate dynamic 3D parameters
        growth_factor = self.growth_stage / 10.0
        health_factor = self.health_score / 100.0
        
        # Mood influence on colors
        mood_colors = {
            'happy': {'hue': 0.3, 'saturation': 0.8},
            'good': {'hue': 0.25, 'saturation': 0.7},
            'sad': {'hue': 0.6, 'saturation': 0.4},
            'poor': {'hue': 0.0, 'saturation': 0.3},
            'energetic': {'hue': 0.1, 'saturation': 0.9},
            'calm': {'hue': 0.5, 'saturation': 0.6},
            'neutral': {'hue': 0.25, 'saturation': 0.7},
        }
        
        mood_color = mood_colors.get(self.current_mood_influence, mood_colors['neutral'])
        
        self.three_d_model_params = {
            'trunk_height': 0.3 + (growth_factor * 0.7),
            'trunk_radius': 0.05 + (growth_factor * 0.03),
            'canopy_size': 0.4 + (growth_factor * 0.6),
            'leaf_count': int(10 + (growth_factor * 20)),
            'leaf_size': 0.1 + (health_factor * 0.05),
            'color_hue': mood_color['hue'],
            'color_saturation': mood_color['saturation'],
            'health_factor': health_factor,
            'growth_factor': growth_factor,
            'flower_count': int(growth_factor * health_factor * 5),
            'animation_speed': 0.5 + (health_factor * 0.5),
        }

    def save(self, *args, **kwargs):
        self.health_status = self.get_health_status
        if not self.three_d_model_params:
            self.update_3d_params()
        super().save(*args, **kwargs)

    def write_to_firestore(self):
        """Write plant data to Firestore for public view"""
        try:
            from .services import FirestoreService
            firestore_service = FirestoreService()
            plant_data = {
                'name': self.name,
                'species': self.species,
                'growth_level': self.growth_level,
                'health_score': self.health_score,
                'user_id': str(self.user.id),
                'username': self.user.username,
                'last_updated': self.updated_at.isoformat() if self.updated_at else None,
            }
            firestore_service.write_plant_data(str(self.user.id), plant_data)
        except Exception as e:
            print(f"Error writing to Firestore: {e}")

    def update_mood_influence(self):
        """Update plant's mood influence based on journal and spotify mood scores"""
        # Calculate combined mood score (weighted average: 60% journal, 40% music)
        self.combined_mood_score = (self.journal_mood_score * 0.6) + (self.spotify_mood_score * 0.4)
        
        # Update current mood influence based on combined score
        if self.combined_mood_score >= 0.8:
            self.current_mood_influence = 'happy'
        elif self.combined_mood_score >= 0.6:
            self.current_mood_influence = 'good'
        elif self.combined_mood_score >= 0.4:
            self.current_mood_influence = 'neutral'
        elif self.combined_mood_score >= 0.2:
            self.current_mood_influence = 'sad'
        else:
            self.current_mood_influence = 'poor'
        
        # Update 3D parameters to reflect mood changes
        self.update_3d_params()
        self.save()

class PlantLog(models.Model):
    ACTIVITY_CHOICES = [
        ('watered', 'Watered'),
        ('fertilized', 'Fertilized'),
        ('journal_sentiment', 'Journal Sentiment'),
        ('music_boost', 'Music Boost'),
        ('mood_update', 'Mood Update'),
        ('sunshine', 'Sunshine'),
    ]

    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='logs')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_CHOICES)
    note = models.TextField(blank=True)
    growth_impact = models.FloatField(default=0.0)
    value = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.activity_type} at {self.created_at}"

class MemorySeed(models.Model):
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='memory_seeds')
    journal_entry = models.ForeignKey('journal.JournalEntry', on_delete=models.CASCADE, related_name='memory_seeds')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"MemorySeed: {self.title} for {self.plant.name}"
