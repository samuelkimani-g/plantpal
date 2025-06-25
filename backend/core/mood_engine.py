"""
Central Mood Engine for PlantPal
Coordinates between Journal sentiment, Music mood, and Plant growth
"""

from typing import Dict, Optional, Union
from datetime import datetime, timedelta
from django.utils import timezone


class MoodEngine:
    """
    Central mood engine that processes and unifies mood data from multiple sources
    """
    
    # Mood type mappings
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
    
    # Weights for different mood sources
    MOOD_SOURCE_WEIGHTS = {
        'journal': 0.6,  # Journal entries carry more weight (primary)
        'music': 0.4,    # Music mood is secondary
    }
    
    # Plant growth stage thresholds
    PLANT_GROWTH_STAGES = {
        'wilt': {'min_score': 0.0, 'max_score': 0.2, 'label': 'Wilting', 'emoji': '🥀'},
        'seedling': {'min_score': 0.2, 'max_score': 0.4, 'label': 'Seedling', 'emoji': '🌱'},
        'sprout': {'min_score': 0.4, 'max_score': 0.7, 'label': 'Sprouting', 'emoji': '🌿'},
        'bloom': {'min_score': 0.7, 'max_score': 1.0, 'label': 'Blooming', 'emoji': '🌸'},
    }

    @classmethod
    def analyze_journal_sentiment(cls, text: str) -> Dict[str, Union[float, str]]:
        """
        Analyze journal text sentiment using TextBlob or similar
        Returns: {'mood_score': float, 'mood_type': str, 'confidence': float}
        """
        try:
            # Try to use TextBlob for sentiment analysis
            from textblob import TextBlob
            
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity  # -1 to 1
            
            # Convert polarity (-1 to 1) to mood score (0.0 to 1.0)
            mood_score = (polarity + 1) / 2
            
            # Determine mood type based on score
            mood_type = cls.score_to_mood_type(mood_score)
            
            # Calculate confidence based on subjectivity
            confidence = blob.sentiment.subjectivity  # 0 to 1
            
            return {
                'mood_score': mood_score,
                'mood_type': mood_type,
                'confidence': confidence,
                'raw_polarity': polarity,
                'method': 'textblob'
            }
            
        except ImportError:
            # Fallback to VADER if TextBlob not available
            try:
                from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
                
                analyzer = SentimentIntensityAnalyzer()
                scores = analyzer.polarity_scores(text)
                
                # Use compound score (-1 to 1) and convert to 0-1 scale
                compound = scores['compound']
                mood_score = (compound + 1) / 2
                
                mood_type = cls.score_to_mood_type(mood_score)
                
                # Confidence based on absolute value of compound score
                confidence = abs(compound)
                
                return {
                    'mood_score': mood_score,
                    'mood_type': mood_type,
                    'confidence': confidence,
                    'raw_compound': compound,
                    'vader_scores': scores,
                    'method': 'vader'
                }
                
            except ImportError:
                # Simple keyword-based fallback
                return cls._simple_sentiment_analysis(text)
    
    @classmethod
    def _simple_sentiment_analysis(cls, text: str) -> Dict[str, Union[float, str]]:
        """Simple keyword-based sentiment analysis fallback"""
        positive_words = [
            'happy', 'joy', 'love', 'good', 'great', 'amazing', 'wonderful', 
            'excited', 'fantastic', 'awesome', 'excellent', 'perfect', 'beautiful'
        ]
        negative_words = [
            'sad', 'bad', 'awful', 'terrible', 'hate', 'angry', 'frustrated', 
            'depressed', 'worried', 'stressed', 'horrible', 'disgusting'
        ]
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        total_words = len(text.split())
        
        if pos_count > neg_count:
            mood_score = 0.6 + (pos_count / total_words * 0.3)
        elif neg_count > pos_count:
            mood_score = 0.4 - (neg_count / total_words * 0.3)
        else:
            mood_score = 0.5
        
        mood_score = max(0.0, min(1.0, mood_score))
        mood_type = cls.score_to_mood_type(mood_score)
        
        return {
            'mood_score': mood_score,
            'mood_type': mood_type,
            'confidence': 0.5,  # Lower confidence for simple analysis
            'positive_words': pos_count,
            'negative_words': neg_count,
            'method': 'simple_keywords'
        }

    @classmethod
    def analyze_music_mood(cls, audio_features: Dict) -> Dict[str, Union[float, str]]:
        """
        Analyze music mood based on Spotify audio features
        audio_features should contain: valence, energy, danceability, tempo
        """
        if not audio_features:
            return {'mood_score': 0.5, 'mood_type': 'neutral', 'confidence': 0.0}
        
        # Extract features with defaults
        valence = audio_features.get('valence', 0.5)
        energy = audio_features.get('energy', 0.5)
        danceability = audio_features.get('danceability', 0.5)
        tempo = audio_features.get('tempo', 120)
        
        # Normalize tempo (60-200 BPM range)
        normalized_tempo = max(0, min(1, (tempo - 60) / 140))
        
        # Calculate weighted mood score
        weights = {
            'valence': 0.4,
            'energy': 0.3,
            'danceability': 0.2,
            'tempo': 0.1
        }
        
        mood_score = (
            valence * weights['valence'] +
            energy * weights['energy'] +
            danceability * weights['danceability'] +
            normalized_tempo * weights['tempo']
        )
        
        mood_score = max(0.0, min(1.0, mood_score))
        mood_type = cls.score_to_mood_type(mood_score)
        
        # Calculate confidence based on feature consistency
        features = [valence, energy, danceability, normalized_tempo]
        avg_feature = sum(features) / len(features)
        variance = sum((f - avg_feature) ** 2 for f in features) / len(features)
        confidence = max(0.3, 1.0 - variance)
        
        return {
            'mood_score': mood_score,
            'mood_type': mood_type,
            'confidence': confidence,
            'features': audio_features,
            'normalized_features': {
                'valence': valence,
                'energy': energy,
                'danceability': danceability,
                'normalized_tempo': normalized_tempo
            }
        }

    @classmethod
    def determine_unified_mood(cls, journal_mood: Optional[Dict] = None, 
                             music_mood: Optional[Dict] = None) -> Dict[str, Union[float, str]]:
        """
        Combine journal and music mood to get unified user mood
        """
        if not journal_mood and not music_mood:
            return {
                'mood_score': 0.5,
                'mood_type': 'neutral',
                'confidence': 0.0,
                'sources': []
            }
        
        # If only one source available
        if not journal_mood:
            result = music_mood.copy()
            result['sources'] = ['music']
            result['primary_source'] = 'music'
            return result
        
        if not music_mood:
            result = journal_mood.copy()
            result['sources'] = ['journal']
            result['primary_source'] = 'journal'
            return result
        
        # Both sources available - weighted combination
        journal_score = journal_mood.get('mood_score', 0.5)
        music_score = music_mood.get('mood_score', 0.5)
        
        # Weighted average
        unified_score = (
            journal_score * cls.MOOD_SOURCE_WEIGHTS['journal'] +
            music_score * cls.MOOD_SOURCE_WEIGHTS['music']
        )
        
        unified_type = cls.score_to_mood_type(unified_score)
        
        # Combined confidence
        journal_conf = journal_mood.get('confidence', 0.5)
        music_conf = music_mood.get('confidence', 0.5)
        unified_confidence = (journal_conf + music_conf) / 2
        
        return {
            'mood_score': unified_score,
            'mood_type': unified_type,
            'confidence': unified_confidence,
            'sources': ['journal', 'music'],
            'primary_source': 'journal' if journal_conf > music_conf else 'music',
            'source_breakdown': {
                'journal': journal_mood,
                'music': music_mood
            }
        }

    @classmethod
    def calculate_plant_growth_impact(cls, unified_mood: Dict, 
                                    current_growth_points: int = 0) -> Dict[str, Union[int, str]]:
        """
        Calculate how mood affects plant growth
        Returns growth point changes and stage updates
        """
        mood_score = unified_mood.get('mood_score', 0.5)
        mood_type = unified_mood.get('mood_type', 'neutral')
        
        # Growth point changes based on mood
        if mood_score >= 0.8:  # euphoric/happy
            growth_change = 3
        elif mood_score >= 0.6:  # upbeat/good
            growth_change = 2
        elif mood_score >= 0.4:  # neutral/calm
            growth_change = 1
        elif mood_score >= 0.2:  # sad/melancholy
            growth_change = 0
        else:  # very sad/depressed
            growth_change = -1
        
        # Calculate new growth points
        new_growth_points = max(0, current_growth_points + growth_change)
        
        # Determine plant stage
        plant_stage = cls.get_plant_stage(new_growth_points)
        
        return {
            'growth_change': growth_change,
            'new_growth_points': new_growth_points,
            'plant_stage': plant_stage['label'],
            'stage_emoji': plant_stage['emoji'],
            'mood_influence': mood_type,
            'growth_multiplier': cls.get_growth_multiplier(mood_score)
        }

    @classmethod
    def score_to_mood_type(cls, score: float) -> str:
        """Convert mood score (0.0-1.0) to mood type string"""
        for mood_type, data in cls.MOOD_TYPES.items():
            if abs(score - data['score']) < 0.1:
                return mood_type
        
        # Fallback based on ranges
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
    def get_plant_stage(cls, growth_points: int) -> Dict[str, str]:
        """Get plant stage based on growth points"""
        # Convert growth points to a 0-1 scale (assuming max 20 points)
        score = min(1.0, growth_points / 20.0)
        
        for stage, data in cls.PLANT_GROWTH_STAGES.items():
            if data['min_score'] <= score <= data['max_score']:
                return data
        
        return cls.PLANT_GROWTH_STAGES['seedling']  # Default

    @classmethod
    def get_growth_multiplier(cls, mood_score: float) -> float:
        """Get growth rate multiplier based on mood"""
        if mood_score >= 0.8:
            return 1.5  # 50% faster growth
        elif mood_score >= 0.6:
            return 1.2  # 20% faster growth
        elif mood_score >= 0.4:
            return 1.0  # Normal growth
        elif mood_score >= 0.2:
            return 0.8  # 20% slower growth
        else:
            return 0.5  # 50% slower growth

    @classmethod
    def get_mood_emoji(cls, mood_type: str) -> str:
        """Get emoji for mood type"""
        return cls.MOOD_TYPES.get(mood_type, {}).get('emoji', '😐')

    @classmethod
    def get_daily_mood_summary(cls, user, date: Optional[datetime] = None) -> Dict:
        """Get mood summary for a specific day"""
        if not date:
            date = timezone.now().date()
        
        # This would integrate with actual models to get daily data
        # For now, return structure
        return {
            'date': date.isoformat(),
            'journal_entries': 0,
            'music_sessions': 0,
            'unified_mood': cls.determine_unified_mood(),
            'plant_growth_impact': 0,
            'recommendations': []
        }

    @classmethod
    def generate_mood_recommendations(cls, mood_data: Dict) -> list:
        """Generate recommendations based on current mood"""
        mood_type = mood_data.get('mood_type', 'neutral')
        mood_score = mood_data.get('mood_score', 0.5)
        
        recommendations = []
        
        if mood_score < 0.3:  # Low mood
            recommendations.extend([
                "Consider writing about what's bothering you in your journal",
                "Listen to some uplifting music to help your plant grow",
                "Take a moment to water your virtual plant - it needs your care",
                "Try a short breathing exercise"
            ])
        elif mood_score < 0.5:  # Neutral-low
            recommendations.extend([
                "Share what's on your mind in a journal entry",
                "Put on some energizing music to boost your mood",
                "Check in with your plant - how is it feeling today?"
            ])
        elif mood_score > 0.7:  # High mood
            recommendations.extend([
                "Your positive energy is helping your plant thrive!",
                "Consider journaling about what made you feel good today",
                "Your plant is blooming thanks to your positive mood!"
            ])
        
        return recommendations[:3]  # Return top 3 recommendations 