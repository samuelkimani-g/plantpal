from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints as specified in architecture
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints as specified
    path('me/', views.MeView.as_view(), name='me'),
    path('me/update/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.PasswordChangeView.as_view(), name='change_password'),
    
    # Additional user management
    path('stats/', views.UserStatsView.as_view(), name='user_stats'),
    path('toggle-reminders/', views.toggle_reminders, name='toggle_reminders'),
    
    # Legacy endpoints for backward compatibility
    path('profile/', views.UserViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='profile_legacy'),
    path('delete/', views.DeleteAccountView.as_view(), name='delete_account'),
]
