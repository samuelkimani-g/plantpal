from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from .models import JournalEntry
from apps.moods.models import MoodEntry

# Initialize the sentiment analyzer globally to avoid re-initializing on every request
try:
    import nltk
    nltk.download('vader_lexicon', quiet=True)
    sid = SentimentIntensityAnalyzer()
except ImportError:
    sid = None
    print("NLTK not installed. Sentiment analysis will be disabled.")

@receiver(post_save, sender=JournalEntry)
def analyze_journal_sentiment(sender, instance, created, **kwargs):
    """
    Signal receiver to analyze the sentiment of a JournalEntry's text
    and create or update an associated MoodEntry.
    """
    if not sid:
        return  # Skip if NLTK is not available
        
    if created:  # Only run on creation
        # Perform sentiment analysis
        sentiment_scores = sid.polarity_scores(instance.text)
        compound_score = sentiment_scores['compound']

        # Map compound score (-1.0 to 1.0) to our 0.0 to 1.0 mood_score scale
        mood_score = (compound_score + 1) / 2

        # Determine mood_type based on the compound score
        if compound_score >= 0.05:
            mood_type = "Positive"
        elif compound_score <= -0.05:
            mood_type = "Negative"
        else:
            mood_type = "Neutral"

        # Create a new MoodEntry for this journal entry
        mood_entry = MoodEntry.objects.create(
            user=instance.user,
            mood_type=mood_type,
            mood_score=mood_score,
            note=f"Auto-generated from journal entry {instance.id}",
            created_at=instance.created_at  # Use journal entry's created_at for consistency
        )
