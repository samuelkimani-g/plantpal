from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class JournalEntry(models.Model):
    """
    Represents a journal entry written by a user.
    Follows the architecture: stores text and analyzed mood.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_entries',
        help_text="The user who created this journal entry."
    )
    
    # Core journal data
    text = models.TextField(
        help_text="The main content of the journal entry."
    )
    
    # Analyzed mood from sentiment analysis
    mood = models.CharField(
        max_length=20,
        choices=[
            ('happy', 'Happy'),
            ('sad', 'Sad'),
            ('neutral', 'Neutral'),
            ('excited', 'Excited'),
            ('anxious', 'Anxious'),
            ('calm', 'Calm'),
            ('angry', 'Angry'),
            ('content', 'Content'),
        ],
        default='neutral',
        help_text="Mood extracted from sentiment analysis"
    )
    
    # Mood score (0.0 to 1.0 scale)
    mood_score = models.FloatField(
        default=0.5,
        help_text="Numerical mood score from sentiment analysis (0.0=sad, 1.0=happy)"
    )
    
    # Sentiment analysis metadata
    sentiment_confidence = models.FloatField(
        default=0.5,
        help_text="Confidence level of sentiment analysis"
    )
    
    # Timestamps
    date = models.DateField(
        auto_now_add=True,
        help_text="The date the entry was created."
    )
    created_at = models.DateTimeField(
        auto_now_add=True, 
        help_text="The exact time the entry was created."
    )
    
    # User interaction
    is_favorite = models.BooleanField(
        default=False,
        help_text="Whether this entry is marked as a favorite."
    )

    class Meta:
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"
        ordering = ['-created_at']  # Order by most recent first
        indexes = [
            models.Index(fields=['user', '-date']),
            models.Index(fields=['user', 'mood']),
        ]

    def __str__(self):
        return f"Journal by {self.user.username} on {self.date} - {self.mood.title()}"
    
    def save(self, *args, **kwargs):
        """Override save to trigger sentiment analysis if needed"""
        # If this is a new entry or text has changed, analyze sentiment
        if not self.pk or 'update_fields' not in kwargs:
            from .utils import analyze_sentiment
            sentiment_data = analyze_sentiment(self.text)
            
            self.mood = sentiment_data['mood_type']
            self.mood_score = sentiment_data['mood_score']
            self.sentiment_confidence = sentiment_data['confidence']
        
        super().save(*args, **kwargs)
        
        # Update plant mood after saving
        self._update_plant_mood()
        
        # Update reminder activity tracking
        self._update_reminder_activity()
    
    def _update_plant_mood(self):
        """Update user's plant mood based on this journal entry"""
        try:
            if hasattr(self.user, 'plant'):
                from core.mood_engine import MoodEngine
                from apps.plants.models import Plant
                
                plant = self.user.plant
                
                # Get recent journal entries for averaging
                recent_entries = JournalEntry.objects.filter(
                    user=self.user,
                    created_at__gte=timezone.now() - timedelta(days=7)
                )
                
                if recent_entries.exists():
                    avg_mood_score = recent_entries.aggregate(
                        models.Avg('mood_score')
                    )['mood_score__avg']
                    
                    # Update plant's journal mood score
                    plant.journal_mood_score = avg_mood_score
                    plant.save()
                    
                    # Log the mood update
                    from apps.plants.models import PlantLog
                    PlantLog.objects.create(
                        plant=plant,
                        activity_type='journal_sentiment',
                        note=f"Journal mood updated: {self.mood} ({self.mood_score:.2f})",
                        value=self.mood_score,
                        growth_impact=MoodEngine.calculate_plant_growth_impact(
                            {'mood_score': avg_mood_score}, 
                            plant.growth_points
                        )['growth_change']
                    )
        except Exception as e:
            print(f"Error updating plant mood: {e}")

    def _update_reminder_activity(self):
        """Update reminder system that user has journaled"""
        try:
            from apps.reminders.models import Reminder
            
            # Get or create reminder for this user
            reminder, created = Reminder.objects.get_or_create(user=self.user)
            
            # Update journal activity tracking
            reminder.update_journal_activity(self.date)
            
            # Update user profile journal streak if it exists
            if hasattr(self.user, 'profile'):
                profile = self.user.profile
                
                # Simple streak calculation - could be enhanced
                yesterday = self.date - timedelta(days=1)
                has_yesterday_entry = JournalEntry.objects.filter(
                    user=self.user,
                    date=yesterday
                ).exists()
                
                if has_yesterday_entry or profile.journal_streak == 0:
                    profile.journal_streak += 1
                else:
                    profile.journal_streak = 1
                    
                profile.save(update_fields=['journal_streak'])
                
        except Exception as e:
            print(f"Error updating reminder activity: {e}")

    @property
    def mood_emoji(self):
        """Get emoji representation of mood"""
        from core.mood_engine import MoodEngine
        return MoodEngine.get_mood_emoji(self.mood)
