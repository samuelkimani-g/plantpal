from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from apps.store.models import StoreItem

class User(AbstractUser):
    """
    Custom User Model for PlantPal.
    Extends the default user model with application-specific fields.
    """
    email = models.EmailField(unique=True) # Make email the unique identifier
    bio = models.TextField(blank=True, null=True, max_length=500)
    plantpal_leaves = models.IntegerField(default=0)
    is_premium = models.BooleanField(default=False, help_text="Indicates if the user has an active premium membership.")
    premium_expiry_date = models.DateTimeField(null=True, blank=True, help_text="Date and time when premium membership expires.")
    
    avatar = models.ForeignKey(
        StoreItem, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        limit_choices_to={'item_type': 'AVATAR'},
        related_name='user_avatars'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
