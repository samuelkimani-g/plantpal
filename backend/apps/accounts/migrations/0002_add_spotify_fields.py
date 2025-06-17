# Generated migration for CustomUser model updates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='avatar',
            field=models.URLField(blank=True, help_text='User avatar URL', null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='bio',
            field=models.TextField(blank=True, help_text='User bio', null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='music_mood_weight',
            field=models.FloatField(default=0.5, help_text='How much music affects plant growth (0.0-1.0)'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='spotify_connected',
            field=models.BooleanField(default=False, help_text='Whether user has connected Spotify'),
        ),
        migrations.AddField(
            model_name='customuser',
            name='spotify_refresh_token',
            field=models.TextField(blank=True, help_text='Spotify refresh token (encrypted)', null=True),
        ),
    ]
