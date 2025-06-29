from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import logging
from apps.journal.models import JournalEntry # To listen for journal entry saves
from .models import Plant, PlantLog # Your Plant and PlantLog models

logger = logging.getLogger(__name__)

# --- Configuration for Plant Growth Logic ---
# These values can be adjusted to fine-tune growth and health
MOOD_IMPACT_FACTOR = 5         # How much a mood score (0-1) impacts health (e.g., 0.5 * 5 = 2.5 health)
WATER_HEALTH_BOOST = 15        # Health gained from watering
FERTILIZE_HEALTH_BOOST = 20    # Health gained from fertilizing
HEALTH_THRESHOLD_FOR_GROWTH = 80 # Minimum health for growth to occur
GROWTH_XP_PER_HEALTH_POINT = 0.5 # XP equivalent for health points (e.g. 100 health = 50 XP)
MAX_GROWTH_LEVEL = 10          # Maximum growth level for a plant
XP_REQUIRED_FOR_LEVEL_UP = 100 # Base XP needed to level up. Can be scaled per level.

@receiver(post_save, sender=JournalEntry)
def update_plant_from_journal_mood(sender, instance, created, **kwargs):
    """
    Signal receiver to update the user's *current* plant's health and growth
    based on the sentiment of a new JournalEntry.
    """
    if not created: # Only process newly created journal entries for mood impact
        return

    # Check if the journal entry has a mood score
    if instance.mood_score is not None:
        user_plant = Plant.objects.filter(user=instance.user).first() # Get the user's first plant (or current primary)

        if user_plant:
            # Calculate health change based on mood_score (0.0 to 1.0)
            # A higher mood_score boosts health, lower can reduce it
            # Neutral (0.5) implies no significant change from mood alone
            mood_health_change = (instance.mood_score - 0.5) * MOOD_IMPACT_FACTOR
            
            # Apply health change, clamping between 0 and 100
            user_plant.health = max(0, min(100, user_plant.health + mood_health_change))
            
            # Update growth level if health is good
            if user_plant.health >= HEALTH_THRESHOLD_FOR_GROWTH and user_plant.growth_level < MAX_GROWTH_LEVEL:
                # Simple growth: gain 1 level per threshold achievement.
                # More complex: could add XP system and accumulate XP for level up.
                user_plant.growth_level += 1
                user_plant.health = 70 # Reset health slightly to encourage continued care after growth
                
            user_plant.save()

            # Optional: Log this mood-driven growth update as a PlantLog
            PlantLog.objects.create(
                plant=user_plant,
                activity_type="journal_sentiment",
                note=f"Mood from journal entry {instance.id}: {instance.mood} ({instance.mood_score:.2f}) affected plant health by {mood_health_change:.2f}.",
                value=instance.mood_score # Store the mood score for reference
            )
        else:
            print(f"User {instance.user.username} has no plants to update for journal entry {instance.id}")

@receiver(post_save, sender=PlantLog)
def update_plant_from_plant_log(sender, instance, created, **kwargs):
    """
    Signal receiver to update a plant's health and last care timestamps
    based on a new PlantLog entry (e.g., watering, fertilizing).
    """
    if not created: # Only process newly created logs
        return

    plant = instance.plant
    
    health_change = 0

    if instance.activity_type == "watered":
        health_change = WATER_HEALTH_BOOST
        plant.last_watered = timezone.now()
    elif instance.activity_type == "fertilized":
        health_change = FERTILIZE_HEALTH_BOOST
        plant.last_fertilized = timezone.now()
    
    # Apply health change, clamping between 0 and 100
    plant.health = max(0, min(100, plant.health + health_change))
    plant.save()

    print(f"Plant {plant.name} health updated to {plant.health} due to {instance.activity_type}")

@receiver(post_save, sender='music.MusicMoodProfile')
def update_plant_mood_from_music(sender, instance, created, **kwargs):
    """
    Signal receiver to update plant health based on music mood changes.
    This runs whenever a MusicMoodProfile is saved (created or updated).
    """
    try:
        user = instance.user
        current_mood_score = instance.current_mood_score
        
        try:
            plant = Plant.objects.get(user=user)
            logger.info(f"Updating plant {plant.name} for user {user.username} with mood score: {current_mood_score}")

            # Example logic: Adjust plant health based on mood score
            if current_mood_score is not None:
                # Scale mood score (e.g., 0-1) to an effect on health (-1 to 1 for health change)
                mood_effect = (current_mood_score - 0.5) * 2  # Transforms 0-1 to -1 to 1
                health_change = mood_effect * 5  # Max change of 5 health points

                # Update both health and health_score fields
                plant.health = max(0, min(100, plant.health + health_change))
                plant.health_score = max(0, min(100, plant.health_score + health_change))
                plant.spotify_mood_score = current_mood_score
                plant.last_mood_update = timezone.now()
                plant.save()
                logger.info(f"Plant {plant.name} health updated to {plant.health} based on music mood.")
        except Plant.DoesNotExist:
            logger.warning(f"No plant found for user {user.username} to update with music mood.")
        except Exception as e:
            logger.exception(f"Error updating plant mood from music for user {user.username}: {e}")
            
    except Exception as e:
        logger.exception(f"Error in update_plant_mood_from_music signal: {e}")
