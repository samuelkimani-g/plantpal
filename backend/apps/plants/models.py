from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone
import json

class Plant(models.Model):
    """
    Plant model aligned with architecture:
    - Growth points system
    - Stage management: seedling → sprout → bloom → wilt
    - Mood-based growth integration
    """
    SPECIES_CHOICES = [
        ('succulent', 'Succulent'),
        ('fern', 'Fern'),
        ('flowering', 'Flowering Plant'),
        ('tree', 'Tree'),
        ('herb', 'Herb'),
        ('vine', 'Vine'),
    ]
    
    # Architecture-specified stages: seedling → sprout → bloom → wilt
    STAGE_CHOICES = [
        ('seedling', 'Seedling'),
        ('sprout', 'Sprout'),
        ('bloom', 'Bloom'),
        ('wilt', 'Wilt'),
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
    name = models.CharField(max_length=100, default="My PlantPal")
    species = models.CharField(max_length=20, choices=SPECIES_CHOICES, default='flowering')
    description = models.TextField(blank=True)
    
    # Architecture-specified growth system
    growth_points = models.IntegerField(
        default=0, 
        validators=[MinValueValidator(0)],
        help_text="Growth points accumulated from mood activities"
    )
    stage = models.CharField(
        max_length=20, 
        choices=STAGE_CHOICES, 
        default='seedling',
        help_text="Current plant stage (seedling → sprout → bloom → wilt)"
    )
    
    # Legacy fields for backward compatibility
    growth_level = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(10)])
    growth_stage = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    health = models.IntegerField(default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Health metrics
    health_score = models.IntegerField(default=80, validators=[MinValueValidator(0), MaxValueValidator(100)])
    health_status = models.CharField(max_length=20, choices=HEALTH_STATUS_CHOICES, default='good')
    
    # Care tracking
    last_watered = models.DateTimeField(null=True, blank=True)
    last_watered_at = models.DateTimeField(null=True, blank=True)
    last_fertilized = models.DateTimeField(null=True, blank=True)
    water_level = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    care_streak = models.IntegerField(default=0, help_text="Number of consecutive days the plant has been cared for")
    last_care_date = models.DateField(null=True, blank=True, help_text="Last date any care action was performed")
    
    # Mood integration (as per architecture)
    journal_mood_score = models.FloatField(default=0.5, help_text="Mood score from journal entries (0.0 to 1.0)")
    spotify_mood_score = models.FloatField(default=0.5, help_text="Mood score from Spotify music (0.0 to 1.0)")
    music_mood_score = models.FloatField(default=0.5, help_text="Alias for spotify_mood_score")
    combined_mood_score = models.FloatField(default=0.5, help_text="Weighted average of journal and music mood")
    current_mood_influence = models.CharField(max_length=50, default='neutral')
    
    # Music tracking
    music_boost_active = models.BooleanField(default=False)
    total_music_minutes = models.IntegerField(default=0, help_text="Total minutes of music listened")
    
    # Stage progression thresholds (as per architecture)
    seedling_threshold = models.IntegerField(default=100, help_text="Growth points needed for sprout")
    sprout_threshold = models.IntegerField(default=300, help_text="Growth points needed for bloom")
    bloom_threshold = models.IntegerField(default=500, help_text="Growth points to maintain bloom")
    
    # Visualization
    three_d_model_params = models.JSONField(default=dict)
    fantasy_params = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    date_added = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_mood_update = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.user.username}) - {self.stage.title()}"

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

    @property
    def stage_display(self):
        """Get human-readable stage with emoji"""
        stage_emojis = {
            'seedling': '🌱',
            'sprout': '🌿',
            'bloom': '🌸',
            'wilt': '🥀'
        }
        emoji = stage_emojis.get(self.stage, '🌱')
        return f"{emoji} {self.get_stage_display()}"

    @property
    def progress_to_next_stage(self):
        """Calculate progress percentage to next stage"""
        if self.stage == 'seedling':
            return min(100, (self.growth_points / self.seedling_threshold) * 100)
        elif self.stage == 'sprout':
            return min(100, (self.growth_points / self.sprout_threshold) * 100)
        elif self.stage == 'bloom':
            return 100  # Already at bloom
        else:  # wilt
            return 0

    def add_growth_points(self, points, source="unknown"):
        """
        Add growth points and check for stage progression
        Following architecture: mood activities → growth points → stage updates
        """
        if self.stage == 'wilt':
            # Wilted plants can recover but need more points
            points = points * 0.5
        
        self.growth_points += points
        self.growth_points = max(0, self.growth_points)  # Don't go below 0
        
        # Check for stage progression
        old_stage = self.stage
        self.update_stage()
        
        # Log the growth
        PlantLog.objects.create(
            plant=self,
            activity_type='mood_update',
            note=f"Growth points added: +{points} from {source}",
            value=points,
            growth_impact=points
        )
        
        # If stage changed, log that too
        if old_stage != self.stage:
            PlantLog.objects.create(
                plant=self,
                activity_type='stage_change',
                note=f"Stage changed: {old_stage} → {self.stage}",
                value=self.growth_points,
                growth_impact=0
            )
        
        self.save()
        return self.stage != old_stage  # Return True if stage changed

    def update_stage(self):
        """
        Update plant stage based on growth points
        Architecture: seedling → sprout → bloom → wilt
        """
        if self.stage == 'wilt':
            # Can recover from wilt if enough growth points
            if self.growth_points >= self.seedling_threshold:
                self.stage = 'seedling'
        elif self.stage == 'seedling':
            if self.growth_points >= self.sprout_threshold:
                self.stage = 'bloom'  # Can skip to bloom if enough points
            elif self.growth_points >= self.seedling_threshold:
                self.stage = 'sprout'
        elif self.stage == 'sprout':
            if self.growth_points >= self.sprout_threshold:
                self.stage = 'bloom'
        elif self.stage == 'bloom':
            # Bloom can decay if not maintained
            if self.growth_points < self.seedling_threshold:
                self.stage = 'wilt'

    def apply_mood_update(self, mood_data):
        """
        Apply mood update from mood engine
        Architecture integration: journal + music → mood → growth points
        """
        try:
            from utils.mood_logic import MoodEngine
            
            # Update mood scores
            if 'journal_mood' in mood_data:
                self.journal_mood_score = mood_data['journal_mood']
            if 'music_mood' in mood_data:
                self.spotify_mood_score = mood_data['music_mood']
                self.music_mood_score = mood_data['music_mood']  # Alias
            
            # Calculate combined mood using MoodEngine
            combined_mood = MoodEngine.get_combined_user_mood(self.user)
            self.combined_mood_score = combined_mood.get('mood_score', 0.5)
            self.current_mood_influence = combined_mood.get('unified_mood', 'neutral')
            
            # Calculate growth points from mood
            mood_impact = MoodEngine.calculate_plant_growth_impact(combined_mood, self.growth_points)
            
            if mood_impact['growth_change'] != 0:
                self.add_growth_points(
                    mood_impact['growth_change'], 
                    source=f"mood_update_{mood_impact['mood_influence']}"
                )
            
            self.last_mood_update = timezone.now()
            self.update_3d_params()
            self.save()
        except ImportError:
            # Fallback if mood engine not available
            print("MoodEngine not available")

    def handle_missed_journals(self, consecutive_days):
        """
        Handle plant wilting from missed journals
        Architecture: 3+ missed days → plant wilts
        """
        if consecutive_days >= 3:
            # Force wilt stage
            old_stage = self.stage
            self.stage = 'wilt'
            
            # Remove growth points as penalty
            penalty = consecutive_days * 20
            self.growth_points = max(0, self.growth_points - penalty)
            
            PlantLog.objects.create(
                plant=self,
                activity_type='wilting',
                note=f"Plant wilted due to {consecutive_days} missed journal days",
                value=consecutive_days,
                growth_impact=-penalty
            )
            
            self.save()
            return old_stage != self.stage

    def update_care_streak(self):
        """Update care streak based on daily care actions"""
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
        self.water_level = min(100, self.water_level + amount)
        self.last_watered = timezone.now()
        self.last_watered_at = timezone.now()
        
        # Improve health slightly when watered
        if self.water_level > 30:
            self.health_score = min(100, self.health_score + 5)
        
        # Small growth bonus for care
        self.add_growth_points(5, source="watering")
        
        self.health_status = self.get_health_status
        self.update_care_streak()
        self.update_3d_params()
        self.save()

    def update_3d_params(self):
        """Update 3D model parameters based on plant state"""
        # Stage-based parameters
        stage_params = {
            'seedling': {'size': 0.3, 'complexity': 0.2},
            'sprout': {'size': 0.6, 'complexity': 0.5},
            'bloom': {'size': 1.0, 'complexity': 0.9},
            'wilt': {'size': 0.4, 'complexity': 0.1}
        }
        
        current_params = stage_params.get(self.stage, stage_params['seedling'])
        health_factor = self.health_score / 100.0
        mood_factor = self.combined_mood_score
        
        # Mood-based colors
        mood_colors = {
            'happy': {'hue': 0.3, 'saturation': 0.8, 'brightness': 0.9},
            'sad': {'hue': 0.6, 'saturation': 0.4, 'brightness': 0.5},
            'neutral': {'hue': 0.25, 'saturation': 0.7, 'brightness': 0.7},
            'energetic': {'hue': 0.1, 'saturation': 0.9, 'brightness': 1.0},
            'calm': {'hue': 0.5, 'saturation': 0.6, 'brightness': 0.8},
        }
        
        mood_color = mood_colors.get(self.current_mood_influence, mood_colors['neutral'])
        
        self.three_d_model_params = {
            # Size and structure
            'base_size': current_params['size'],
            'complexity': current_params['complexity'],
            'health_factor': health_factor,
            'growth_factor': current_params['size'],
            
            # Visual properties
            'color_hue': mood_color['hue'],
            'color_saturation': mood_color['saturation'],
            'brightness': mood_color['brightness'],
            
            # Animation
            'animation_speed': 0.3 + (mood_factor * 0.7),
            'sway_intensity': health_factor,
            
            # Stage-specific features
            'has_flowers': self.stage == 'bloom',
            'flower_count': int(mood_factor * 8) if self.stage == 'bloom' else 0,
            'leaf_density': current_params['complexity'],
            'wilted_effect': self.stage == 'wilt',
            
            # Metadata
            'stage': self.stage,
            'growth_points': self.growth_points,
            'mood_influence': self.current_mood_influence,
        }

    def save(self, *args, **kwargs):
        # Auto-update stage and health status before saving
        self.update_stage()
        self.health_status = self.get_health_status
        
        # Ensure 3D params are set
        if not self.three_d_model_params:
            self.update_3d_params()
            
        super().save(*args, **kwargs)

    # Legacy methods for backward compatibility
    def update_mood_influence(self):
        """Legacy method - redirects to apply_mood_update"""
        mood_data = {
            'journal_mood': self.journal_mood_score,
            'music_mood': self.spotify_mood_score
        }
        self.apply_mood_update(mood_data)

    def write_to_firestore(self):
        """Write plant data to Firestore for public view"""
        try:
            from .services import FirestoreService
            firestore_service = FirestoreService()
            plant_data = {
                'name': self.name,
                'species': self.species,
                'stage': self.stage,
                'growth_points': self.growth_points,
                'health_score': self.health_score,
                'user_id': str(self.user.id),
                'username': self.user.username,
                'last_updated': self.updated_at.isoformat() if self.updated_at else None,
            }
            firestore_service.write_plant_data(str(self.user.id), plant_data)
        except Exception as e:
            print(f"Error writing to Firestore: {e}")

    def get_stage_info(self):
        """Get detailed information about current stage and progression"""
        return {
            'current_stage': self.stage,
            'stage_display': self.stage_display,
            'growth_points': self.growth_points,
            'progress_to_next': self.progress_to_next_stage,
            'thresholds': {
                'seedling': self.seedling_threshold,
                'sprout': self.sprout_threshold,
                'bloom': self.bloom_threshold,
            },
            'can_progress': self.stage != 'bloom',
            'health_status': self.get_health_status,
            'mood_influence': self.current_mood_influence,
        }


class PlantLog(models.Model):
    """Enhanced plant log for tracking all plant activities"""
    ACTIVITY_CHOICES = [
        ('watered', 'Watered'),
        ('fertilized', 'Fertilized'),
        ('journal_sentiment', 'Journal Sentiment'),
        ('music_boost', 'Music Boost'),
        ('mood_update', 'Mood Update'),
        ('stage_change', 'Stage Change'),
        ('wilting', 'Wilting'),
        ('recovery', 'Recovery'),
        ('sunshine', 'Sunshine'),
    ]

    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='logs')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_CHOICES)
    note = models.TextField(blank=True)
    growth_impact = models.FloatField(default=0.0, help_text="Growth points gained/lost")
    value = models.FloatField(null=True, blank=True, help_text="Associated value (mood score, etc.)")
    created_at = models.DateTimeField(auto_now_add=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.plant.name} - {self.activity_type} (+{self.growth_impact} points)"


class MemorySeed(models.Model):
    """Memory seeds created from meaningful journal entries"""
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE, related_name='memory_seeds')
    journal_entry = models.ForeignKey('journal.JournalEntry', on_delete=models.CASCADE, related_name='memory_seeds')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    emotional_value = models.FloatField(default=0.0, help_text="Emotional significance score")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-emotional_value', '-created_at']

    def __str__(self):
        return f"MemorySeed: {self.title} for {self.plant.name}"
