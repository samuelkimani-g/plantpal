from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extended user profile as specified in architecture:
    avatar, bio, timezone, and other user settings
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Profile fields as specified
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True, help_text="User's bio/description")
    timezone = models.CharField(max_length=100, default='UTC', help_text="User's timezone")
    
    # Additional user preferences
    journal_streak = models.IntegerField(default=0, help_text="Current journaling streak in days")
    reminder_enabled = models.BooleanField(default=True, help_text="Whether reminders are enabled")
    
    # Spotify integration (for music app connection)
    spotify_connected = models.BooleanField(default=False, help_text="Whether Spotify is connected")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def display_name(self):
        """Get display name (first name + last name or username)"""
        if self.user.first_name and self.user.last_name:
            return f"{self.user.first_name} {self.user.last_name}"
        elif self.user.first_name:
            return self.user.first_name
        else:
            return self.user.username

    @property
    def avatar_url(self):
        """Get avatar URL or default"""
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        return None


# Signal to create/update user profile automatically
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Signal to automatically create UserProfile when User is created
    and save profile when User is saved
    """
    if created:
        UserProfile.objects.create(user=instance)
    
    # Save the profile if it exists
    if hasattr(instance, 'profile'):
        instance.profile.save()
