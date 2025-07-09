#!/usr/bin/env python
"""
Script to fix existing journal entries with correct mood scores and emojis
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.journal.models import JournalEntry
from utils.mood_logic import MoodEngine

def fix_journal_moods():
    """Update existing journal entries with correct mood scores"""
    print("🔧 Fixing journal entry moods...")
    
    entries = JournalEntry.objects.all()
    updated_count = 0
    
    for entry in entries:
        try:
            # Get the correct mood score for the mood type
            mood_score = MoodEngine.MOOD_TYPES.get(entry.mood, {}).get('score', 0.5)
            
            # Update the entry if the score is different
            if entry.mood_score != mood_score:
                entry.mood_score = mood_score
                entry.sentiment_confidence = 0.9  # High confidence for user-selected mood
                entry.save(update_fields=['mood_score', 'sentiment_confidence'])
                updated_count += 1
                print(f"✅ Updated entry {entry.id}: {entry.mood} -> score {mood_score}")
            
        except Exception as e:
            print(f"❌ Error updating entry {entry.id}: {e}")
    
    print(f"🎉 Updated {updated_count} journal entries!")
    return updated_count

if __name__ == "__main__":
    fix_journal_moods() 