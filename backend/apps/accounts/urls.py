from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView 
from .views import RegisterView, LogoutAndBlacklistTokenView, UserDetailView, UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user') 

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Standard JWT login
    path('logout/', LogoutAndBlacklistTokenView.as_view(), name='logout'),
    path('profile/', UserDetailView.as_view(), name='user_profile'),
    path('', include(router.urls)),
]
