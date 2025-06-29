# Generated by Django 5.2.3 on 2025-06-25 16:48

import datetime
import django.core.validators
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
            name='Reminder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.TimeField(default=datetime.time(20, 0), help_text='Time to send daily reminder (default 8PM)')),
                ('timezone', models.CharField(default='UTC', help_text="User's timezone for reminders", max_length=100)),
                ('method', models.CharField(choices=[('email', 'Email'), ('push', 'Push Notification'), ('both', 'Email and Push')], default='email', help_text='Notification method for reminders', max_length=20)),
                ('enabled', models.BooleanField(default=True, help_text='Whether reminders are enabled')),
                ('consecutive_misses', models.IntegerField(default=0, help_text='Number of consecutive days without journaling')),
                ('last_journal_date', models.DateField(blank=True, help_text='Last date user wrote a journal entry', null=True)),
                ('last_reminder_sent', models.DateTimeField(blank=True, help_text='Last time a reminder was sent', null=True)),
                ('wilting_threshold', models.IntegerField(default=3, help_text='Days of missed journals before plant starts wilting', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(10)])),
                ('email_subject', models.CharField(default="Don't forget to journal today! 🌱", help_text='Subject line for reminder emails', max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='reminder', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Reminder',
                'verbose_name_plural': 'User Reminders',
            },
        ),
        migrations.CreateModel(
            name='ReminderLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('method_used', models.CharField(max_length=20)),
                ('success', models.BooleanField(default=True)),
                ('error_message', models.TextField(blank=True)),
                ('consecutive_misses_at_time', models.IntegerField(default=0)),
                ('was_wilting_warning', models.BooleanField(default=False)),
                ('reminder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='reminders.reminder')),
            ],
            options={
                'verbose_name': 'Reminder Log',
                'verbose_name_plural': 'Reminder Logs',
                'ordering': ['-sent_at'],
            },
        ),
    ]
