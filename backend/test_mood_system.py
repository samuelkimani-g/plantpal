#!/usr/bin/env python
"""
Test script to verify mood system is working correctly
"""
import os
import sys
import django

# Setup Django
sys.path.append('/opt/render/project/src/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.plants.models import Plant
from apps.journal.models import JournalEntry
from utils.mood_logic import MoodEngine

User = get_user_model()

def test_mood_system():
    """Test the mood update system"""
    print("🧪 Testing PlantPal Mood System...")
    
    # Get a test user (first user in database)
    try:
        user = User.objects.first()
        if not user:
            print("❌ No users found in database")
            return
            
        print(f"📋 Testing with user: {user.username}")
        
        # Get or create plant
        plant, created = Plant.objects.get_or_create(user=user)
        if created:
            print(f"🌱 Created new plant: {plant.name}")
        else:
            print(f"🌿 Using existing plant: {plant.name}")
        
        print(f"   Current mood: {plant.current_mood_influence}")
        print(f"   Combined mood score: {plant.combined_mood_score}")
        print(f"   Journal mood score: {plant.journal_mood_score}")
        print(f"   Music mood score: {plant.spotify_mood_score}")
        
        # Test MoodEngine directly
        print("\n🔧 Testing MoodEngine...")
        combined_mood = MoodEngine.get_combined_user_mood(user)
        print(f"   MoodEngine result: {combined_mood}")
        
        # Test creating a happy journal entry
        print("\n📝 Creating happy journal entry...")
        journal_entry = JournalEntry.objects.create(
            user=user,
            text="I feel amazing today! Life is wonderful and I'm so grateful for everything.",
            mood="happy",
            mood_score=0.9
        )
        print(f"   Created journal entry: {journal_entry.mood} ({journal_entry.mood_score})")
        
        # Refresh plant and check mood
        plant.refresh_from_db()
        print(f"   Plant mood after journal: {plant.current_mood_influence}")
        print(f"   Combined mood score: {plant.combined_mood_score}")
        print(f"   Growth points: {plant.growth_points}")
        
        # Test creating a sad journal entry
        print("\n😢 Creating sad journal entry...")
        sad_entry = JournalEntry.objects.create(
            user=user,
            text="I'm feeling really down today. Everything seems difficult and I'm struggling.",
            mood="sad", 
            mood_score=0.2
        )
        print(f"   Created journal entry: {sad_entry.mood} ({sad_entry.mood_score})")
        
        # Refresh plant and check mood
        plant.refresh_from_db()
        print(f"   Plant mood after sad journal: {plant.current_mood_influence}")
        print(f"   Combined mood score: {plant.combined_mood_score}")
        print(f"   Growth points: {plant.growth_points}")
        
        # Test applying mood update directly
        print("\n🎯 Testing direct mood update...")
        old_mood = plant.current_mood_influence
        mood_data = {
            'journal_mood': 0.8,
            'music_mood': 0.7
        }
        plant.apply_mood_update(mood_data)
        plant.refresh_from_db()
        print(f"   Mood changed from {old_mood} to {plant.current_mood_influence}")
        
        print("\n✅ Mood system test completed!")
        
    except Exception as e:
        print(f"❌ Error during mood test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mood_system() 