from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone

class CustomUser(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    """
    # Additional profile fields
    bio = models.TextField(blank=True, null=True, help_text="User bio")
    avatar = models.URLField(blank=True, null=True, help_text="User avatar URL")
    
    # Music preferences for plant growth
    music_mood_weight = models.FloatField(
        default=0.5, 
        help_text="How much music affects plant growth (0.0-1.0)"
    )
    
    # Ensure that the related_name for groups and user_permissions is unique
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions '
                  'granted to each of their groups.',
        related_name="customuser_set",
        related_query_name="customuser",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="customuser_set",
        related_query_name="customuser",
    )

    def __str__(self):
        return self.username

class SpotifyProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='spotify_profile'
    )
    spotify_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    access_token = models.CharField(max_length=500, blank=True, null=True)
    refresh_token = models.CharField(max_length=500, blank=True, null=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    token_type = models.CharField(max_length=50, blank=True, null=True)
    scope = models.TextField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SpotifyProfile for {self.user.username}"
    
    def is_token_expired(self):
        """Check if the access token is expired"""
        if not self.token_expires_at:
            return True
        return timezone.now() >= self.token_expires_at
