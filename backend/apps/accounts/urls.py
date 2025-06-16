from django.urls import path
from .views import RegisterView, CustomTokenObtainPairView, CustomTokenRefreshView, UserDetailView, EmailTokenObtainView, LogoutAndBlacklistTokenView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('token-login/', EmailTokenObtainView.as_view(), name='email_token_login'), 
    path('logout/', LogoutAndBlacklistTokenView.as_view(), name='logout_blacklist'),
]
