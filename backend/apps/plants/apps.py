from django.apps import AppConfig

class PlantsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.plants'

    def ready(self):
        import apps.plants.signals
