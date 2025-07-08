"""
Enhanced Mood System for PlantPal
Every action affects mood, which affects plant health
Mood is very sensitive, plant health changes gradually
"""

from typing import Dict, Optional, Union, List
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EnhancedMoodSystem:
    """
    Comprehensive mood system that tracks every user action and affects plant health
    """
    
    # Very sensitive mood types
    MOOD_TYPES = {
        'euphoric': {'score': 0.95, 'emoji': '🤩'},
        'happy': {'score': 0.85, 'emoji': '😊'},
        'upbeat': {'score': 0.75, 'emoji': '😎'},
        'energetic': {'score': 0.7, 'emoji': '⚡'},
        'positive': {'score': 0.65, 'emoji': '😌'},
        'neutral': {'score': 0.5, 'emoji': '😐'},
        'calm': {'score': 0.4, 'emoji': '😌'},
        'melancholy': {'score': 0.3, 'emoji': '😔'},
        'sad': {'score': 0.2, 'emoji': '😢'},
        'low': {'score': 0.1, 'emoji': '😞'},
        'depressed': {'score': 0.05, 'emoji': '😭'},
    }
    
    # Action-based mood impacts (very sensitive)
    ACTION_IMPACTS = {
        # Journal actions
        'journal_entry_positive': 0.15,
        'journal_entry_negative': -0.15,
        'journal_entry_neutral': 0.02,
        'journal_favorite': 0.1,
        
        # Music actions
        'music_listen_happy': 0.12,
        'music_listen_sad': -0.08,
        'music_listen_energetic': 0.1,
        'music_connect_spotify': 0.05,
        
        # Plant care actions
        'water_plant': 0.08,
        'fertilize_plant': 0.1,
        'plant_growth': 0.15,
        'plant_wilting': -0.1,
        
        # Mindfulness actions
        'breathing_exercise': 0.12,
        'meditation_session': 0.15,
        'gratitude_journal': 0.2,
        'visualization_exercise': 0.1,
        'mindfulness_game': 0.08,
        
        # Social actions
        'water_other_plant': 0.1,
        'receive_water': 0.08,
        'community_garden_visit': 0.05,
        
        # Memory and personal actions
        'open_memory_seed': 0.12,
        'create_memory_seed': 0.1,
        'chatbot_positive': 0.08,
        'chatbot_negative': -0.05,
        
        # Premium and rewards
        'premium_purchase': 0.05,
        'earn_leaves': 0.03,
        'spend_leaves': -0.02,
        
        # Negative actions
        'miss_watering': -0.05,
        'plant_dying': -0.15,
        'app_neglect': -0.02,
    }
    
    @classmethod
    def record_action(cls, user, action_type: str, action_data: Dict = None) -> Dict:
        """Record any user action and update mood accordingly"""
        try:
            plant = cls._get_user_plant(user)
            if not plant:
                return {'error': 'No plant found for user'}
            
            current_score = plant.combined_mood_score or 0.5
            mood_impact = cls.ACTION_IMPACTS.get(action_type, 0)
            
            # Apply modifiers
            if action_data:
                mood_impact = cls._apply_modifiers(mood_impact, action_data)
            
            # Update mood (very sensitive)
            new_mood_score = max(0.0, min(1.0, current_score + mood_impact))
            
            # Update plant mood
            plant.combined_mood_score = new_mood_score
            plant.current_mood_influence = cls.score_to_mood_type(new_mood_score)
            
            # Calculate health impact (less sensitive)
            health_impact = cls._calculate_health_impact(new_mood_score, current_score)
            new_health = max(0, min(100, plant.health_score + health_impact))
            plant.health_score = new_health
            
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
    def _apply_modifiers(cls, base_impact: float, action_data: Dict) -> float:
        """Apply additional mood modifiers"""
        modified_impact = base_impact
        
        if 'sentiment' in action_data:
            sentiment = action_data['sentiment']
            if sentiment > 0.7:
                modified_impact += 0.05
            elif sentiment < 0.3:
                modified_impact -= 0.05
        
        if 'music_mood' in action_data:
            music_mood = action_data['music_mood']
            if music_mood > 0.7:
                modified_impact += 0.03
            elif music_mood < 0.3:
                modified_impact -= 0.03
        
        return modified_impact
    
    @classmethod
    def _calculate_health_impact(cls, new_mood: float, old_mood: float) -> float:
        """Calculate plant health impact (less sensitive than mood)"""
        mood_change = new_mood - old_mood
        health_change = mood_change * 3  # 1/3 as sensitive
        return max(-2, min(2, health_change))
    
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