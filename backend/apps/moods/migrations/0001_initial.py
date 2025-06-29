# Generated by Django 5.2.3 on 2025-06-25 16:48

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MoodEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mood_type', models.CharField(help_text="The general mood (e.g., 'Happy', 'Stressed', 'Neutral').", max_length=50)),
                ('mood_score', models.FloatField(default=0.5, help_text='Numerical representation of mood (0.0 to 1.0, 0.5 is neutral)')),
                ('note', models.TextField(blank=True, help_text='Optional: A short note or context for this mood entry.', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='The date and time the mood entry was recorded.')),
                ('user', models.ForeignKey(help_text='The user this mood entry belongs to.', on_delete=django.db.models.deletion.CASCADE, related_name='mood_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Mood Entry',
                'verbose_name_plural': 'Mood Entries',
                'ordering': ['-created_at'],
            },
        ),
    ]
