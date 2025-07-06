from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'username', 'is_premium', 'is_staff', 'is_active',)
    list_filter = ('is_staff', 'is_active', 'is_premium',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'bio', 'plantpal_leaves')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Premium Status', {'fields': ('is_premium', 'premium_expiry_date')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    search_fields = ('email', 'username',)
    ordering = ('email',)

admin.site.register(User, CustomUserAdmin)
