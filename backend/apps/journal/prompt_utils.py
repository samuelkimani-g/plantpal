import random
from datetime import datetime

MOOD_QUESTIONS = [
    "How are you feeling right now? Take a moment to really check in with yourself.",
    "What emotions have you experienced today? Try to name them specifically.",
    "On a scale from 1-10, how would you rate your current mood? Why?",
    "Has anything particularly affected your mood today? What was it?",
    "What's the strongest emotion you're feeling right now?",
]

REFLECTION_PROMPTS = {
    'happy': [
        "What made you smile today?",
        "What are you grateful for in this moment?",
        "How can you share your positive energy with others?",
        "What accomplishment are you proud of today?",
    ],
    'sad': [
        "What's weighing on your mind?",
        "What would help you feel better right now?",
        "Is there someone you could reach out to for support?",
        "What self-care activity might lift your spirits?",
    ],
    'neutral': [
        "What would make today more meaningful?",
        "What are you looking forward to?",
        "How could you add more joy to your routine?",
        "What's something new you'd like to try?",
    ],
    'anxious': [
        "What's causing you to feel anxious?",
        "What helps you feel grounded when you're anxious?",
        "What's one small step you could take to address your concerns?",
        "How can you show yourself kindness right now?",
    ],
}

GENERAL_PROMPTS = [
    "What's been on your mind lately?",
    "Describe your ideal day. What would it look like?",
    "What's a goal you're working towards?",
    "What's something you've learned about yourself recently?",
    "Write about a challenge you're facing and how you might overcome it.",
]

def get_journal_prompt(mood=None):
    """
    Generate a journal prompt based on mood and time of day.
    Always starts with a mood check-in question.
    """
    # Always start with a mood check-in
    prompt = random.choice(MOOD_QUESTIONS) + "\n\n"
    
    # Add mood-specific prompt if mood is provided
    if mood and mood.lower() in REFLECTION_PROMPTS:
        prompt += random.choice(REFLECTION_PROMPTS[mood.lower()]) + "\n\n"
    
    # Add a general reflection prompt
    prompt += random.choice(GENERAL_PROMPTS)
    
    return prompt

def analyze_mood_keywords(text):
    """
    Analyze text for mood-related keywords to help determine emotional state.
    Returns a dictionary of mood scores.
    """
    text = text.lower()
    
    mood_keywords = {
        'happy': ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'good', 'positive'],
        'sad': ['sad', 'down', 'depressed', 'unhappy', 'terrible', 'miserable', 'upset'],
        'anxious': ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'fear'],
        'neutral': ['okay', 'fine', 'alright', 'normal', 'neutral']
    }
    
    scores = {mood: 0 for mood in mood_keywords}
    
    for mood, keywords in mood_keywords.items():
        for keyword in keywords:
            if keyword in text:
                scores[mood] += 1
    
    return scores

def get_dominant_mood(text):
    """
    Determine the dominant mood from text analysis.
    Returns tuple of (mood, confidence_score)
    """
    scores = analyze_mood_keywords(text)
    if not any(scores.values()):
        return ('neutral', 0.5)
    
    dominant_mood = max(scores.items(), key=lambda x: x[1])
    total_mentions = sum(scores.values())
    confidence = dominant_mood[1] / total_mentions if total_mentions > 0 else 0.5
    
    return (dominant_mood[0], confidence)
