from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlantViewSet, PlantLogViewSet

router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'logs', PlantLogViewSet, basename='plantlog')

urlpatterns = [
    path('', include(router.urls)),
]
