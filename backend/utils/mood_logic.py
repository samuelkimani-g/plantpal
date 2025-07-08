"""
Comprehensive Mood Engine for PlantPal
Every action affects mood, which affects plant health
Mood is very sensitive, plant health changes gradually
"""

from typing import Dict, Optional, Union, List
from django.utils import timezone
from django.db import models
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MoodEngine:
    """
    Comprehensive mood engine that tracks every user action and affects plant health
    """
    
    # Very sensitive mood types with fine-grained scoring
    MOOD_TYPES = {
        'euphoric': {'score': 0.95, 'label': 'euphoric', 'emoji': '🤩', 'health_boost': 3},
        'happy': {'score': 0.85, 'label': 'happy', 'emoji': '😊', 'health_boost': 2},
        'upbeat': {'score': 0.75, 'label': 'upbeat', 'emoji': '😎', 'health_boost': 1.5},
        'energetic': {'score': 0.7, 'label': 'energetic', 'emoji': '⚡', 'health_boost': 1},
        'positive': {'score': 0.65, 'label': 'positive', 'emoji': '😌', 'health_boost': 0.5},
        'neutral': {'score': 0.5, 'label': 'neutral', 'emoji': '😐', 'health_boost': 0},
        'calm': {'score': 0.4, 'label': 'calm', 'emoji': '😌', 'health_boost': -0.5},
        'melancholy': {'score': 0.3, 'label': 'melancholy', 'emoji': '😔', 'health_boost': -1},
        'sad': {'score': 0.2, 'label': 'sad', 'emoji': '😢', 'health_boost': -1.5},
        'low': {'score': 0.1, 'label': 'low', 'emoji': '😞', 'health_boost': -2},
        'depressed': {'score': 0.05, 'label': 'depressed', 'emoji': '😭', 'health_boost': -3},
    }
    
    # Action-based mood impacts (very sensitive)
    ACTION_MOOD_IMPACTS = {
        # Journal actions
        'journal_entry_positive': 0.15,    # Writing positive journal entry
        'journal_entry_negative': -0.15,   # Writing negative journal entry
        'journal_entry_neutral': 0.02,     # Writing neutral journal entry
        'journal_favorite': 0.1,           # Marking entry as favorite
        
        # Music actions
        'music_listen_happy': 0.12,        # Listening to happy music
        'music_listen_sad': -0.08,         # Listening to sad music
        'music_listen_energetic': 0.1,     # Listening to energetic music
        'music_connect_spotify': 0.05,     # Connecting Spotify
        
        # Plant care actions
        'water_plant': 0.08,               # Watering plant
        'fertilize_plant': 0.1,            # Fertilizing plant
        'plant_growth': 0.15,              # Plant growing
        'plant_wilting': -0.1,             # Plant wilting
        
        # Mindfulness actions
        'breathing_exercise': 0.12,        # Completing breathing exercise
        'meditation_session': 0.15,        # Completing meditation
        'gratitude_journal': 0.2,          # Writing gratitude
        'visualization_exercise': 0.1,     # Completing visualization
        'mindfulness_game': 0.08,          # Playing mindfulness game
        
        # Social actions
        'water_other_plant': 0.1,          # Watering someone else's plant
        'receive_water': 0.08,             # Receiving water from others
        'community_garden_visit': 0.05,    # Visiting community garden
        
        # Memory and personal actions
        'open_memory_seed': 0.12,          # Opening memory seed
        'create_memory_seed': 0.1,         # Creating memory seed
        'chatbot_positive': 0.08,          # Positive chatbot interaction
        'chatbot_negative': -0.05,         # Negative chatbot interaction
        
        # Premium and rewards
        'premium_purchase': 0.05,          # Buying premium
        'earn_leaves': 0.03,               # Earning leaves
        'spend_leaves': -0.02,             # Spending leaves
        
        # Negative actions
        'miss_watering': -0.05,            # Missing watering
        'plant_dying': -0.15,              # Plant dying
        'app_neglect': -0.02,              # Not using app for long time
    }
    
    @classmethod
    def record_action(cls, user, action_type: str, action_data: Dict = None) -> Dict:
        """
        Record any user action and update mood accordingly
        This is the main entry point for all mood tracking
        """
        try:
            # Get user's plant
            plant = cls._get_user_plant(user)
            if not plant:
                return {'error': 'No plant found for user'}
            
            # Get current mood
            current_mood = cls.get_current_mood(user)
            current_score = current_mood.get('mood_score', 0.5)
            
            # Calculate mood impact from action
            mood_impact = cls.ACTION_MOOD_IMPACTS.get(action_type, 0)
            
            # Apply additional modifiers based on action data
            if action_data:
                mood_impact = cls._calculate_action_modifiers(mood_impact, action_data)
            
            # Update mood score (very sensitive)
            new_mood_score = max(0.0, min(1.0, current_score + mood_impact))
            
            # Update plant mood
            plant.combined_mood_score = new_mood_score
            plant.current_mood_influence = cls.score_to_mood_type(new_mood_score)
            
            # Calculate health impact (less sensitive)
            health_impact = cls._calculate_health_impact(new_mood_score, current_score)
            new_health = max(0, min(100, plant.health_score + health_impact))
            plant.health_score = new_health
            
            # Update plant
            plant.last_mood_update = timezone.now()
            plant.save()
            
            return {
                'action_type': action_type,
                'mood_change': mood_impact,
                'new_mood_score': new_mood_score,
                'new_mood_type': plant.current_mood_influence,
                'health_change': health_impact,
                'new_health_score': new_health
            }
            
        except Exception as e:
            logger.error(f"Error recording action {action_type}: {str(e)}")
            return {'error': str(e)}
    
    @classmethod
    def _calculate_action_modifiers(cls, base_impact: float, action_data: Dict) -> float:
        """Calculate additional mood modifiers based on action data"""
        modified_impact = base_impact
        
        # Journal entry sentiment
        if 'sentiment' in action_data:
            sentiment = action_data['sentiment']
            if sentiment > 0.7:
                modified_impact += 0.05
            elif sentiment < 0.3:
                modified_impact -= 0.05
        
        # Music mood
        if 'music_mood' in action_data:
            music_mood = action_data['music_mood']
            if music_mood > 0.7:
                modified_impact += 0.03
            elif music_mood < 0.3:
                modified_impact -= 0.03
        
        return modified_impact
    
    @classmethod
    def _calculate_health_impact(cls, new_mood: float, old_mood: float) -> float:
        """Calculate plant health impact from mood change (less sensitive)"""
        mood_change = new_mood - old_mood
        
        # Health changes are 1/3 as sensitive as mood changes
        health_change = mood_change * 3
        
        # Cap health changes to prevent extreme swings
        health_change = max(-2, min(2, health_change))
        
        return health_change
    
    @classmethod
    def get_current_mood(cls, user) -> Dict:
        """Get current mood for user"""
        try:
            plant = cls._get_user_plant(user)
            if not plant:
                return {'mood_score': 0.5, 'mood_type': 'neutral'}
            
            return {
                'mood_score': plant.combined_mood_score,
                'mood_type': plant.current_mood_influence,
                'health_score': plant.health_score
            }
        except Exception as e:
            logger.error(f"Error getting current mood: {str(e)}")
            return {'mood_score': 0.5, 'mood_type': 'neutral'}
    
    @classmethod
    def score_to_mood_type(cls, score: float) -> str:
        """Convert mood score to mood type"""
        for mood_type, data in cls.MOOD_TYPES.items():
            if score >= data['score']:
                return mood_type
        return 'neutral'
    
    @classmethod
    def get_mood_emoji(cls, mood_type: str) -> str:
        """Get emoji for mood type"""
        return cls.MOOD_TYPES.get(mood_type, {}).get('emoji', '😐')
    
    @classmethod
    def _get_user_plant(cls, user):
        """Get user's plant"""
        try:
            return user.plant
        except:
            return None 