from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, 
    CustomTokenObtainPairView, 
    UserDetailView, 
    LogoutAndBlacklistTokenView,
    ChangePasswordView,
    DeleteAccountView,
    SpotifyCallbackView,
    SpotifyFetchValenceView,
    SpotifyDisconnectView,
    SpotifyAuthURLView,
    SpotifyStatusView,
    UserViewSet,
    SpotifyConnectionView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutAndBlacklistTokenView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile management
    path('profile/', UserDetailView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    
    # Spotify integration
    path('spotify/auth-url/', SpotifyAuthURLView.as_view(), name='spotify_auth_url'),
    path('spotify/callback/', SpotifyCallbackView.as_view(), name='spotify_callback'),
    path('spotify/fetch-valence/', SpotifyFetchValenceView.as_view(), name='spotify_fetch_valence'),
    path('spotify/status/', SpotifyStatusView.as_view(), name='spotify_status'),
    path('spotify/disconnect/', SpotifyDisconnectView.as_view(), name='spotify_disconnect'),
    path('spotify/', SpotifyConnectionView.as_view(), name='spotify_connection'),
    
    # Router URLs
    path('', include(router.urls)),
]
