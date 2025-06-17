from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    """
    # Spotify integration fields
    spotify_connected = models.BooleanField(default=False, help_text="Whether user has connected Spotify")
    spotify_refresh_token = models.TextField(blank=True, null=True, help_text="Spotify refresh token (encrypted)")
    
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
