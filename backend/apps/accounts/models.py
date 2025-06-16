from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    This allows for future customization of user fields if needed.
    Currently, it uses all default fields from AbstractUser.
    """
    # Add any custom fields here if you need them later
    # For example: bio = models.TextField(blank=True, null=True)

    # Ensure that the related_name for groups and user_permissions is unique
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions '
                  'granted to each of their groups.',
        related_name="customuser_set", # Changed related_name to avoid clash
        related_query_name="customuser",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="customuser_set", # Changed related_name to avoid clash
        related_query_name="customuser",
    )

    def __str__(self):
        return self.username