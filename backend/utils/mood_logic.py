"""
Central Mood Engine for PlantPal
Coordinates between Journal sentiment, Music mood, and Plant growth
Following the architecture specification for unified mood determination
"""

from typing import Dict, Optional, Union
from datetime import datetime, timedelta
from django.utils import timezone


class MoodEngine:
    """
    Central mood engine that processes and unifies mood data from multiple sources
    As specified in the architecture: Merges journal + music mood to get unified emotional state
    """
    
    # Mood type mappings as specified in architecture
    MOOD_TYPES = {
        'euphoric': {'score': 0.95, 'label': 'euphoric', 'emoji': '🤩'},
        'happy': {'score': 0.8, 'label': 'happy', 'emoji': '😊'},
        'upbeat': {'score': 0.7, 'label': 'upbeat', 'emoji': '😎'},
        'energetic': {'score': 0.75, 'label': 'energetic', 'emoji': '⚡'},
        'neutral': {'score': 0.5, 'label': 'neutral', 'emoji': '😐'},
        'calm': {'score': 0.4, 'label': 'calm', 'emoji': '😌'},
        'melancholy': {'score': 0.3, 'label': 'melancholy', 'emoji': '😔'},
        'sad': {'score': 0.2, 'label': 'sad', 'emoji': '😢'},
        'low': {'score': 0.15, 'label': 'low', 'emoji': '😞'},
    }
    
    # Weights for different mood sources as per architecture
    MOOD_SOURCE_WEIGHTS = {
        'journal': 0.6,  # Journal entries carry more weight (primary)
        'music': 0.4,    # Music mood is secondary
    }
    
    # Plant growth stage thresholds as specified
    PLANT_GROWTH_STAGES = {
        'wilt': {'min_score': 0.0, 'max_score': 0.2, 'label': 'Wilting', 'emoji': '🥀'},
        'seedling': {'min_score': 0.2, 'max_score': 0.4, 'label': 'Seedling', 'emoji': '🌱'},
        'sprout': {'min_score': 0.4, 'max_score': 0.7, 'label': 'Sprouting', 'emoji': '🌿'},
        'bloom': {'min_score': 0.7, 'max_score': 1.0, 'label': 'Blooming', 'emoji': '🌸'},
    }

    @classmethod
    def determine_user_mood(cls, journal_mood: Optional[str] = None, 
                           music_mood: Optional[str] = None,
                           journal_score: Optional[float] = None,
                           music_score: Optional[float] = None) -> Dict[str, Union[float, str]]:
        """
        Implementation of the architecture's determine_user_mood function:
        "Merge journal + music mood to get unified emotional state"
        """
        # Handle the case where we have mood strings
        if journal_mood and music_mood:
            if journal_mood == music_mood:
                return {
                    'unified_mood': journal_mood,
                    'mood_score': cls.MOOD_TYPES.get(journal_mood, {}).get('score', 0.5),
                    'confidence': 0.9,
                    'sources': ['journal', 'music'],
                    'agreement': True
                }
            
            # Different moods - use architecture logic
            if 'sad' in [journal_mood, music_mood]:
                unified_mood = 'low'
            elif 'happy' in [journal_mood, music_mood]:
                unified_mood = 'balanced'
            else:
                unified_mood = 'neutral'
            
            return {
                'unified_mood': unified_mood,
                'mood_score': cls.MOOD_TYPES.get(unified_mood, {}).get('score', 0.5),
                'confidence': 0.7,
                'sources': ['journal', 'music'],
                'agreement': False,
                'source_moods': {'journal': journal_mood, 'music': music_mood}
            }
        
        # Handle numerical scores
        if journal_score is not None and music_score is not None:
            # Weighted combination as per architecture
            unified_score = (
                journal_score * cls.MOOD_SOURCE_WEIGHTS['journal'] +
                music_score * cls.MOOD_SOURCE_WEIGHTS['music']
            )
            
            unified_mood = cls.score_to_mood_type(unified_score)
            
            return {
                'unified_mood': unified_mood,
                'mood_score': unified_score,
                'confidence': 0.8,
                'sources': ['journal', 'music'],
                'source_scores': {'journal': journal_score, 'music': music_score}
            }
        
        # Single source
        if journal_mood or journal_score is not None:
            score = journal_score if journal_score is not None else cls.MOOD_TYPES.get(journal_mood, {}).get('score', 0.5)
            mood = journal_mood if journal_mood else cls.score_to_mood_type(score)
            
            return {
                'unified_mood': mood,
                'mood_score': score,
                'confidence': 0.7,
                'sources': ['journal'],
                'primary_source': 'journal'
            }
        
        if music_mood or music_score is not None:
            score = music_score if music_score is not None else cls.MOOD_TYPES.get(music_mood, {}).get('score', 0.5)
            mood = music_mood if music_mood else cls.score_to_mood_type(score)
            
            return {
                'unified_mood': mood,
                'mood_score': score,
                'confidence': 0.6,
                'sources': ['music'],
                'primary_source': 'music'
            }
        
        # Default neutral
        return {
            'unified_mood': 'neutral',
            'mood_score': 0.5,
            'confidence': 0.0,
            'sources': []
        }

    @classmethod
    def update_plant_mood(cls, plant, unified_mood_data: Dict) -> Dict[str, Union[int, str]]:
        """
        Update plant based on unified mood as specified in architecture:
        "Mood affects plant → Stage updated (via growth points)"
        """
        mood_score = unified_mood_data.get('mood_score', 0.5)
        mood_type = unified_mood_data.get('unified_mood', 'neutral')
        
        # Calculate growth points change as per architecture
        current_growth_points = getattr(plant, 'growth_points', 0)
        
        # Growth logic as specified
        if mood_type == 'happy' or mood_score >= 0.8:
            growth_change = 2
        elif mood_type == 'neutral' or 0.4 <= mood_score < 0.6:
            growth_change = 1
        elif mood_score < 0.3:  # sad mood
            growth_change = -1
        else:
            growth_change = 0
        
        # Update growth points
        new_growth_points = max(0, current_growth_points + growth_change)
        
        # Determine stage as per architecture
        if new_growth_points >= 10:
            current_stage = 'bloom'
        elif new_growth_points >= 5:
            current_stage = 'sprout'
        elif new_growth_points <= 0:
            current_stage = 'wilt'
        else:
            current_stage = 'seedling'
        
        # Update plant
        plant.growth_points = new_growth_points
        plant.current_stage = current_stage
        plant.last_mood = mood_type
        plant.combined_mood_score = mood_score
        plant.save()
        
        return {
            'growth_change': growth_change,
            'new_growth_points': new_growth_points,
            'current_stage': current_stage,
            'mood_influence': mood_type
        }

    @classmethod
    def get_combined_user_mood(cls, user) -> Dict[str, Union[float, str]]:
        """
        Get the combined user mood from recent journal and music data
        Implementation of architecture's get_combined_user_mood function
        """
        from apps.journal.models import JournalEntry
        from apps.music.models import ListeningSession
        
        # Get recent journal mood (last 3 days)
        recent_journals = JournalEntry.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(days=3)
        )
        
        journal_mood_score = None
        if recent_journals.exists():
            journal_mood_score = recent_journals.aggregate(
                avg_score=models.Avg('mood_score')
            )['avg_score']
        
        # Get recent music mood (last 3 days)
        music_mood_score = None
        try:
            recent_sessions = ListeningSession.objects.filter(
                user=user,
                session_start__gte=timezone.now() - timedelta(days=3)
            )
            
            if recent_sessions.exists():
                music_mood_score = recent_sessions.aggregate(
                    avg_score=models.Avg('computed_mood_score')
                )['avg_score']
        except:
            # Handle case where music app might not be available
            pass
        
        # Combine moods
        return cls.determine_user_mood(
            journal_score=journal_mood_score,
            music_score=music_mood_score
        )

    @classmethod
    def score_to_mood_type(cls, score: float) -> str:
        """Convert mood score (0.0-1.0) to mood type string"""
        if score >= 0.8:
            return 'happy'
        elif score >= 0.6:
            return 'upbeat'
        elif score >= 0.4:
            return 'neutral'
        elif score >= 0.2:
            return 'sad'
        else:
            return 'low'

    @classmethod
    def get_plant_stage_from_points(cls, growth_points: int) -> Dict[str, str]:
        """
        Get plant stage based on growth points as per architecture:
        seedling, sprout, bloom, wilt
        """
        if growth_points >= 10:
            return {'stage': 'bloom', 'label': 'Blooming', 'emoji': '🌸'}
        elif growth_points >= 5:
            return {'stage': 'sprout', 'label': 'Sprouting', 'emoji': '🌿'}
        elif growth_points <= 0:
            return {'stage': 'wilt', 'label': 'Wilting', 'emoji': '🥀'}
        else:
            return {'stage': 'seedling', 'label': 'Seedling', 'emoji': '🌱'}

    @classmethod
    def get_mood_emoji(cls, mood_type: str) -> str:
        """Get emoji for mood type"""
        return cls.MOOD_TYPES.get(mood_type, {}).get('emoji', '😐')

    @classmethod
    def calculate_plant_growth_impact(cls, unified_mood: Dict, 
                                    current_growth_points: int = 0) -> Dict[str, Union[int, str]]:
        """
        Calculate how mood affects plant growth following the architecture
        """
        mood_score = unified_mood.get('mood_score', 0.5)
        mood_type = unified_mood.get('unified_mood', 'neutral')
        
        # Growth changes as per architecture specification
        if mood_score >= 0.8:  # happy
            growth_change = 2
        elif mood_score >= 0.4:  # neutral
            growth_change = 1
        else:  # sad
            growth_change = -1
        
        new_growth_points = max(0, current_growth_points + growth_change)
        plant_stage = cls.get_plant_stage_from_points(new_growth_points)
        
        return {
            'growth_change': growth_change,
            'new_growth_points': new_growth_points,
            'plant_stage': plant_stage['stage'],
            'stage_emoji': plant_stage['emoji'],
            'mood_influence': mood_type
        }

    @classmethod
    def get_daily_mood_summary(cls, user, date: Optional[datetime] = None) -> Dict:
        """
        Get daily mood summary as specified in architecture flow:
        "User writes journal or listens to music → Mood is analyzed → Score is stored"
        """
        if not date:
            date = timezone.now().date()
        
        from apps.journal.models import JournalEntry
        
        # Get journal entries for the day
        journal_entries = JournalEntry.objects.filter(
            user=user,
            date=date
        )
        
        # Get music sessions for the day (if available)
        music_sessions = 0
        try:
            from apps.music.models import ListeningSession
            music_sessions = ListeningSession.objects.filter(
                user=user,
                session_start__date=date
            ).count()
        except:
            pass
        
        # Calculate unified mood
        unified_mood = cls.get_combined_user_mood(user)
        
        # Calculate plant growth impact
        growth_impact = 0
        if hasattr(user, 'plant'):
            plant_data = cls.calculate_plant_growth_impact(
                unified_mood, 
                getattr(user.plant, 'growth_points', 0)
            )
            growth_impact = plant_data['growth_change']
        
        return {
            'date': date.isoformat(),
            'journal_entries': journal_entries.count(),
            'music_sessions': music_sessions,
            'unified_mood': unified_mood,
            'plant_growth_impact': growth_impact,
            'recommendations': cls.generate_mood_recommendations(unified_mood)
        }

    @classmethod
    def generate_mood_recommendations(cls, mood_data: Dict) -> list:
        """
        Generate recommendations based on mood as specified in architecture:
        "Mood reminders, wilting, encouragements"
        """
        mood_type = mood_data.get('unified_mood', 'neutral')
        mood_score = mood_data.get('mood_score', 0.5)
        
        recommendations = []
        
        if mood_score < 0.3:  # Low mood - encouragement needed
            recommendations.extend([
                "Your plant needs some positive energy - try writing about something good today",
                "Listen to some uplifting music to help both you and your plant feel better",
                "Your plant is wilting - it needs your care and positive thoughts",
                "Take a moment to water your plant and reflect on something you're grateful for"
            ])
        elif mood_score < 0.5:  # Neutral-low
            recommendations.extend([
                "Share what's on your mind in a journal entry to help your plant grow",
                "Some energizing music could boost both your mood and your plant's health",
                "Your plant is waiting for your positive energy - how are you feeling today?"
            ])
        elif mood_score > 0.7:  # High mood - positive reinforcement
            recommendations.extend([
                "Your positive energy is making your plant bloom beautifully!",
                "Keep journaling about the good things - your plant loves your happiness!",
                "Your plant is thriving thanks to your positive mood - keep it up!"
            ])
        else:  # Neutral
            recommendations.extend([
                "Write in your journal to help your plant continue growing steadily",
                "Your plant is doing well - maintain this balance with regular check-ins",
                "Consider what might boost your mood a little higher to help your plant bloom"
            ])
        
        return recommendations[:3]  # Return top 3 recommendations 