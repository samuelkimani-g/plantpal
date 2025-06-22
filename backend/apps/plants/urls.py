from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlantViewSet, PlantLogViewSet, PublicPlantView, PublicGardenView, WaterOtherPlantView, MemorySeedView, FantasyParamsView, MindfulnessRewardView

router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'logs', PlantLogViewSet, basename='plantlog')

urlpatterns = [
    path('', include(router.urls)),
    path('public/<str:user_id>/', PublicPlantView.as_view(), name='public-plant'),
    path('public/<str:user_id>/water/', WaterOtherPlantView.as_view(), name='water-other-plant'),
    path('public-garden/', PublicGardenView.as_view(), name='public-garden'),
    path('memory-seeds/', MemorySeedView.as_view(), name='memory-seeds'),
    path('fantasy-params/', FantasyParamsView.as_view(), name='fantasy-params'),
    path('mindfulness-reward/', MindfulnessRewardView.as_view(), name='mindfulness-reward'),
]
