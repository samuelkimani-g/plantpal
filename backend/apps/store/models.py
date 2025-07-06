from django.db import models
from django.conf import settings

# Create your models here.

class StoreItem(models.Model):
    ITEM_TYPES = (
        ('POT', 'Pot'),
        ('DECORATION', 'Decoration'),
        ('AVATAR', 'Avatar'),
    )
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.IntegerField(help_text="Price in PlantPal Leaves")
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    image_url = models.URLField(max_length=500, help_text="URL to the item's image")
    is_premium_only = models.BooleanField(default=False, help_text="Is this item only for premium users?")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_item_type_display()})"

class UserInventory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inventory')
    item = models.ForeignKey(StoreItem, on_delete=models.CASCADE)
    equipped = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('user', 'item')

    def __str__(self):
        return f"{self.user.username}'s {self.item.name}"
