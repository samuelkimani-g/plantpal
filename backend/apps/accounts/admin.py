from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()

# Unregister the default User admin
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Admin configuration for CustomUser
    """
    pass

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'bio', 'reminder_enabled', 'spotify_connected']
    list_filter = ['reminder_enabled', 'spotify_connected', 'created_at']
    search_fields = ['user__username', 'user__email', 'bio']
