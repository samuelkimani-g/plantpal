import random

def get_journal_prompt(mood=None):
    """
    Returns a journal prompt based on mood or a random one if no mood is specified.
    """
    prompts = {
        'happy': [
            "What made you smile today?",
            "Describe a moment of joy you experienced recently.",
            "What are you most grateful for right now?",
        ],
        'sad': [
            "What would help you feel better right now?",
            "Write about someone who makes you feel supported.",
            "What's one small thing you can do to care for yourself today?",
        ],
        'stressed': [
            "What's weighing on your mind? Write it all out.",
            "What would you tell a friend who was feeling this way?",
            "What's one thing you can let go of today?",
        ],
        'calm': [
            "What brings you peace?",
            "Describe your ideal peaceful moment.",
            "What are you learning about yourself lately?",
        ],
        'excited': [
            "What are you looking forward to?",
            "Describe something that energizes you.",
            "What dreams are you working toward?",
        ],
        'anxious': [
            "What would help you feel more grounded right now?",
            "Write about a time you overcame a challenge.",
            "What are three things you can control in this situation?",
        ],
    }
    
    general_prompts = [
        "How are you feeling right now, and why?",
        "What's one thing you learned about yourself today?",
        "Describe your current state of mind.",
        "What would you like to remember about today?",
        "What's on your heart right now?",
    ]
    
    if mood and mood.lower() in prompts:
        return random.choice(prompts[mood.lower()])
    else:
        return random.choice(general_prompts)
