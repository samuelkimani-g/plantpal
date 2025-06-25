from django.apps import AppConfig


class MusicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.music'
    verbose_name = 'Music & Spotify Integration'
    
    def ready(self):
        # Import signals if we have any
        pass
