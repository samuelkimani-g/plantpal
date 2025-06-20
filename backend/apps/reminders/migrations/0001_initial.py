# Generated by Django 5.2.3 on 2025-06-16 17:07

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('plants', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Reminder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='A short, descriptive title for the reminder.', max_length=255)),
                ('description', models.TextField(blank=True, help_text='Optional: Detailed description of the reminder.')),
                ('scheduled_for', models.DateTimeField(help_text='The exact date and time when the reminder is scheduled to occur.')),
                ('notified', models.BooleanField(default=False, help_text='Flag indicating if the user has already been notified for this reminder.')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Timestamp when the reminder was created in the system.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Timestamp of the last update to the reminder.')),
                ('reminder_type', models.CharField(default='custom', help_text='Type of reminder (journal, water, mood, etc.)', max_length=50)),
                ('scheduled_time', models.TimeField(blank=True, help_text='Time component of the scheduled reminder.', null=True)),
                ('is_active', models.BooleanField(default=True, help_text='Whether this reminder is active.')),
                ('days_of_week', models.CharField(default='1234567', help_text='Days of week for recurring reminders (1=Monday, 7=Sunday).', max_length=20)),
                ('plant', models.ForeignKey(blank=True, help_text='Optional: The specific plant this reminder is for.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to='plants.plant')),
                ('user', models.ForeignKey(help_text='The user who created this reminder.', on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Reminder',
                'verbose_name_plural': 'Reminders',
                'ordering': ['scheduled_for'],
            },
        ),
    ]
