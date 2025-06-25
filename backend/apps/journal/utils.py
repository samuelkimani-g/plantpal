"""
Sentiment Analysis utilities for Journal entries
Using TextBlob and VADER for comprehensive mood analysis
"""

from typing import Dict, Union
import re


def analyze_sentiment(text: str) -> Dict[str, Union[float, str]]:
    """
    Analyze sentiment of journal text using TextBlob or VADER
    Returns: {'mood_score': float, 'mood_type': str, 'confidence': float}
    """
    if not text or not text.strip():
        return {
            'mood_score': 0.5,
            'mood_type': 'neutral',
            'confidence': 0.0,
            'method': 'empty_text'
        }
    
    # Clean text
    cleaned_text = clean_text(text)
    
    try:
        # Try TextBlob first
        from textblob import TextBlob
        
        blob = TextBlob(cleaned_text)
        polarity = blob.sentiment.polarity  # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
        
        # Convert polarity (-1 to 1) to mood score (0.0 to 1.0)
        mood_score = (polarity + 1) / 2
        
        # Determine mood type based on score and polarity
        mood_type = score_to_mood_type(mood_score, polarity)
        
        # Confidence based on subjectivity (more subjective = more confident)
        confidence = min(1.0, subjectivity + 0.2)
        
        return {
            'mood_score': round(mood_score, 3),
            'mood_type': mood_type,
            'confidence': round(confidence, 3),
            'raw_polarity': round(polarity, 3),
            'raw_subjectivity': round(subjectivity, 3),
            'method': 'textblob'
        }
        
    except ImportError:
        # Fallback to VADER if TextBlob not available
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            
            analyzer = SentimentIntensityAnalyzer()
            scores = analyzer.polarity_scores(cleaned_text)
            
            # Use compound score (-1 to 1) and convert to 0-1 scale
            compound = scores['compound']
            mood_score = (compound + 1) / 2
            
            mood_type = score_to_mood_type(mood_score, compound)
            
            # Confidence based on absolute value of compound score
            confidence = min(1.0, abs(compound) + 0.1)
            
            return {
                'mood_score': round(mood_score, 3),
                'mood_type': mood_type,
                'confidence': round(confidence, 3),
                'raw_compound': round(compound, 3),
                'vader_scores': scores,
                'method': 'vader'
            }
            
        except ImportError:
            # Simple keyword-based fallback
            return simple_sentiment_analysis(cleaned_text)


def clean_text(text: str) -> str:
    """Clean and preprocess text for sentiment analysis"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove special characters but keep emoticons and punctuation
    # that are important for sentiment
    text = re.sub(r'[^\w\s\.\!\?\,\:\;\-\(\)\'\"😀-🙏💀-🙈]', ' ', text)
    
    return text


def score_to_mood_type(score: float, raw_sentiment: float = None) -> str:
    """
    Convert mood score to mood type string
    Uses both normalized score and raw sentiment for better classification
    """
    # Enhanced mood classification using both score and raw sentiment
    if raw_sentiment is not None:
        # Use raw sentiment for more nuanced classification
        if raw_sentiment >= 0.6:
            return 'happy'
        elif raw_sentiment >= 0.3:
            return 'content'
        elif raw_sentiment >= 0.1:
            return 'neutral'
        elif raw_sentiment >= -0.1:
            return 'calm'
        elif raw_sentiment >= -0.3:
            return 'sad'
        else:
            return 'sad'
    
    # Fallback to score-based classification
    if score >= 0.8:
        return 'happy'
    elif score >= 0.65:
        return 'content'
    elif score >= 0.35:
        return 'neutral'
    elif score >= 0.2:
        return 'calm'
    else:
        return 'sad'


def simple_sentiment_analysis(text: str) -> Dict[str, Union[float, str]]:
    """
    Simple keyword-based sentiment analysis fallback
    Based on the architecture specification for mood analysis
    """
    positive_words = [
        'happy', 'joy', 'love', 'good', 'great', 'amazing', 'wonderful', 
        'excited', 'fantastic', 'awesome', 'excellent', 'perfect', 'beautiful',
        'grateful', 'blessed', 'content', 'peaceful', 'cheerful', 'delighted',
        'thrilled', 'ecstatic', 'optimistic', 'hopeful', 'proud', 'accomplished'
    ]
    
    negative_words = [
        'sad', 'bad', 'awful', 'terrible', 'hate', 'angry', 'frustrated', 
        'depressed', 'worried', 'stressed', 'horrible', 'disgusting',
        'anxious', 'upset', 'disappointed', 'lonely', 'hurt', 'pain',
        'difficult', 'hard', 'struggle', 'problem', 'issue', 'concern'
    ]
    
    neutral_words = [
        'okay', 'fine', 'normal', 'usual', 'regular', 'typical',
        'average', 'ordinary', 'standard', 'common'
    ]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    neu_count = sum(1 for word in neutral_words if word in text_lower)
    
    total_words = len(words)
    
    # Calculate sentiment score
    if total_words == 0:
        mood_score = 0.5
    else:
        # Weight by frequency and intensity
        pos_weight = pos_count / total_words
        neg_weight = neg_count / total_words
        
        if pos_weight > neg_weight:
            mood_score = 0.5 + (pos_weight * 0.4)
        elif neg_weight > pos_weight:
            mood_score = 0.5 - (neg_weight * 0.4)
        else:
            mood_score = 0.5
    
    # Ensure score is within bounds
    mood_score = max(0.0, min(1.0, mood_score))
    mood_type = score_to_mood_type(mood_score)
    
    # Confidence based on keyword density
    keyword_density = (pos_count + neg_count + neu_count) / max(1, total_words)
    confidence = min(0.8, keyword_density * 2)  # Cap at 0.8 for simple analysis
    
    return {
        'mood_score': round(mood_score, 3),
        'mood_type': mood_type,
        'confidence': round(confidence, 3),
        'positive_words': pos_count,
        'negative_words': neg_count,
        'neutral_words': neu_count,
        'keyword_density': round(keyword_density, 3),
        'method': 'simple_keywords'
    }


def get_mood_suggestions(mood_type: str, mood_score: float) -> list:
    """
    Generate journal prompt suggestions based on current mood
    As specified in the architecture for "Suggested Prompt" generator
    """
    suggestions = []
    
    if mood_type in ['sad', 'anxious']:
        suggestions = [
            "What's one small thing that could make today a little brighter?",
            "Write about someone who makes you feel supported and loved.",
            "What are three things you're grateful for, even during difficult times?",
            "Describe a memory that always makes you smile.",
            "What would you tell a friend who was feeling the same way?"
        ]
    
    elif mood_type in ['happy', 'excited', 'content']:
        suggestions = [
            "What made you feel so good today? Capture all the details!",
            "Who contributed to your happiness today, and how?",
            "What aspects of your life are you most grateful for right now?",
            "Describe the best moment of your day in vivid detail.",
            "What are you most excited about in the coming days?"
        ]
    
    elif mood_type in ['neutral', 'calm']:
        suggestions = [
            "What's on your mind today? Let your thoughts flow freely.",
            "Reflect on one thing you learned about yourself recently.",
            "What would make tomorrow even better than today?",
            "Write about something you're looking forward to.",
            "What's one goal you're working toward, and how do you feel about it?"
        ]
    
    else:  # Default suggestions
        suggestions = [
            "How are you feeling right now, and what might be influencing that?",
            "What's been the highlight of your week so far?",
            "Write about something that's been on your mind lately.",
            "What's one thing you appreciate about your current situation?",
            "If you could send a message to yourself one year from now, what would it be?"
        ]
    
    return suggestions[:3]  # Return top 3 suggestions


def analyze_mood_trend(recent_entries) -> Dict[str, Union[str, float, list]]:
    """
    Analyze mood trends from recent journal entries
    """
    if not recent_entries:
        return {
            'trend': 'stable',
            'average_mood': 0.5,
            'trend_direction': 'neutral',
            'days_analyzed': 0
        }
    
    scores = [entry.mood_score for entry in recent_entries]
    average_mood = sum(scores) / len(scores)
    
    # Calculate trend
    if len(scores) >= 3:
        recent_avg = sum(scores[:3]) / 3
        older_avg = sum(scores[3:6]) / min(3, len(scores[3:6])) if len(scores) > 3 else recent_avg
        
        if recent_avg > older_avg + 0.1:
            trend = 'improving'
            trend_direction = 'up'
        elif recent_avg < older_avg - 0.1:
            trend = 'declining'
            trend_direction = 'down'
        else:
            trend = 'stable'
            trend_direction = 'neutral'
    else:
        trend = 'insufficient_data'
        trend_direction = 'neutral'
    
    return {
        'trend': trend,
        'average_mood': round(average_mood, 3),
        'trend_direction': trend_direction,
        'days_analyzed': len(scores),
        'mood_scores': scores
    } 