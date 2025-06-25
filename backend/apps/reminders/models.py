from django.db import models
from django.contrib.auth import get_user_model
from apps.plants.models import Plant # Import the Plant model
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import time, timedelta

# Get the custom user model
User = get_user_model()

class Reminder(models.Model):
    """
    User reminder settings as specified in architecture
    """
    METHOD_CHOICES = [
        ('email', 'Email'),
        ('push', 'Push Notification'),
        ('both', 'Email and Push'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='reminder')
    
    # Reminder time settings
    time = models.TimeField(default=time(20, 0), help_text="Time to send daily reminder (default 8PM)")
    timezone = models.CharField(max_length=100, default='UTC', help_text="User's timezone for reminders")
    
    # Notification method
    method = models.CharField(
        max_length=20, 
        choices=METHOD_CHOICES, 
        default='email',
        help_text="Notification method for reminders"
    )
    
    # Settings
    enabled = models.BooleanField(default=True, help_text="Whether reminders are enabled")
    
    # Streak tracking
    consecutive_misses = models.IntegerField(default=0, help_text="Number of consecutive days without journaling")
    last_journal_date = models.DateField(null=True, blank=True, help_text="Last date user wrote a journal entry")
    last_reminder_sent = models.DateTimeField(null=True, blank=True, help_text="Last time a reminder was sent")
    
    # Escalation settings
    wilting_threshold = models.IntegerField(
        default=3, 
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Days of missed journals before plant starts wilting"
    )
    
    # Email settings
    email_subject = models.CharField(
        max_length=200, 
        default="Don't forget to journal today! 🌱",
        help_text="Subject line for reminder emails"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Reminder"
        verbose_name_plural = "User Reminders"

    def __str__(self):
        return f"{self.user.username}'s Reminder ({self.time})"

    @property
    def is_due_today(self):
        """Check if reminder is due today"""
        if not self.enabled:
            return False
            
        # Check if reminder was already sent today
        today = timezone.now().date()
        if self.last_reminder_sent and self.last_reminder_sent.date() == today:
            return False
            
        # Check if user already journaled today
        try:
            from apps.journal.models import JournalEntry
            has_journaled_today = JournalEntry.objects.filter(
                user=self.user,
                date=today
            ).exists()
            return not has_journaled_today
        except ImportError:
            return True

    @property
    def should_send_wilting_warning(self):
        """Check if should send wilting warning"""
        return (
            self.enabled and 
            self.consecutive_misses >= self.wilting_threshold and
            self.is_due_today
        )

    def mark_reminder_sent(self):
        """Mark that reminder was sent"""
        self.last_reminder_sent = timezone.now()
        self.save(update_fields=['last_reminder_sent'])

    def update_journal_activity(self, journal_date=None):
        """Update activity tracking when user journals"""
        if journal_date is None:
            journal_date = timezone.now().date()
            
        # Reset consecutive misses if journaling
        if self.last_journal_date:
            # Check if this breaks a streak of misses
            days_since_last = (journal_date - self.last_journal_date).days
            if days_since_last <= 1:
                self.consecutive_misses = 0
        else:
            self.consecutive_misses = 0
            
        self.last_journal_date = journal_date
        self.save(update_fields=['consecutive_misses', 'last_journal_date'])

    def increment_consecutive_misses(self):
        """Increment missed days counter"""
        self.consecutive_misses += 1
        self.save(update_fields=['consecutive_misses'])

    def get_reminder_message(self):
        """Get appropriate reminder message based on current state"""
        if self.consecutive_misses == 0:
            return "How are you feeling today? Take a moment to journal your thoughts 🌱"
        elif self.consecutive_misses == 1:
            return "You missed yesterday's journal. Let's get back on track! 🌿"
        elif self.consecutive_misses == 2:
            return "Your plant is missing your daily thoughts. Time to journal! 🌾"
        elif self.consecutive_misses >= self.wilting_threshold:
            return "🚨 Your plant is wilting! Journal now to help it recover 🥀"
        else:
            return "Don't forget to check in with yourself today 🌱"

    def get_email_content(self):
        """Get email content for reminder"""
        message = self.get_reminder_message()
        
        return {
            'subject': self.email_subject,
            'message': f"""
Hi {self.user.first_name or self.user.username},

{message}

Your PlantPal is waiting for your daily thoughts. Taking just a few minutes to journal can help improve your mood and grow your virtual plant!

Current streak: {max(0, 7 - self.consecutive_misses)} days
Consecutive misses: {self.consecutive_misses} days

Click here to start journaling: [Journal Link]

Happy journaling!
The PlantPal Team 🌱
            """.strip()
        }


class ReminderLog(models.Model):
    """
    Log of sent reminders for analytics and debugging
    """
    reminder = models.ForeignKey(Reminder, on_delete=models.CASCADE, related_name='logs')
    sent_at = models.DateTimeField(auto_now_add=True)
    method_used = models.CharField(max_length=20)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Reminder context
    consecutive_misses_at_time = models.IntegerField(default=0)
    was_wilting_warning = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Reminder Log"
        verbose_name_plural = "Reminder Logs"
        ordering = ['-sent_at']

    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.reminder.user.username} - {self.sent_at.strftime('%Y-%m-%d %H:%M')}"
