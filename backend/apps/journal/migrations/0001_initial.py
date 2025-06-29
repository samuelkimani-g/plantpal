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
            name='JournalEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(help_text='The main content of the journal entry.')),
                ('mood', models.CharField(choices=[('happy', 'Happy'), ('sad', 'Sad'), ('neutral', 'Neutral'), ('excited', 'Excited'), ('anxious', 'Anxious'), ('calm', 'Calm'), ('angry', 'Angry'), ('content', 'Content')], default='neutral', help_text='Mood extracted from sentiment analysis', max_length=20)),
                ('mood_score', models.FloatField(default=0.5, help_text='Numerical mood score from sentiment analysis (0.0=sad, 1.0=happy)')),
                ('sentiment_confidence', models.FloatField(default=0.5, help_text='Confidence level of sentiment analysis')),
                ('date', models.DateField(auto_now_add=True, help_text='The date the entry was created.')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='The exact time the entry was created.')),
                ('is_favorite', models.BooleanField(default=False, help_text='Whether this entry is marked as a favorite.')),
                ('user', models.ForeignKey(help_text='The user who created this journal entry.', on_delete=django.db.models.deletion.CASCADE, related_name='journal_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Journal Entry',
                'verbose_name_plural': 'Journal Entries',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user', '-date'], name='journal_jou_user_id_aca642_idx'), models.Index(fields=['user', 'mood'], name='journal_jou_user_id_8668cb_idx')],
            },
        ),
    ]
