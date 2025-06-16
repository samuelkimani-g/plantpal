def get_suggestion(mood_type):
    """
    Provides a simple suggestion based on a detected mood type.
    This is a stub for future AI-powered mood suggestions.

    Args:
        mood_type (str): The categorized mood (e.g., "stressed", "happy", "neutral").

    Returns:
        str: A relevant suggestion or a default message.
    """
    mood_type = mood_type.lower() # Convert to lowercase for consistent comparison

    if mood_type == "stressed":
        return "Feeling stressed? Take a deep breath and connect with your plant for a few minutes. 🌿"
    elif mood_type == "happy":
        return "Great mood! Log today's plant growth or give it some extra care! ✨"
    elif mood_type == "sad":
        return "It's okay to feel down. Spending some quiet time near your plants can be soothing. 💧"
    elif mood_type == "relaxed":
        return "Feeling relaxed? Enjoy the calm with your plant. Maybe plan its next watering. 🧘‍♀️"
    elif mood_type == "energetic":
        return "Full of energy? Your plants might benefit from a gentle clean or repotting! 🚀"
    else:
        return "Remember to check on your PlantPal today. A little attention goes a long way! 😊"

# In a future step, i might integrate this into a serializer's to_representation
# or a custom API endpoint that takes a journal entry/mood and returns suggestions.
# For example, in your JournalEntrySerializer:
# class JournalEntrySerializer(...):
#     # ...
#     suggestion = serializers.SerializerMethodField()
#
#     def get_suggestion(self, obj):
#         return get_suggestion(obj.mood_entry.mood if obj.mood_entry else "neutral")

