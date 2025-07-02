from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import logging
from apps.journal.models import JournalEntry # To listen for journal entry saves
from .models import Plant, PlantLog # Your Plant and PlantLog models
from apps.music.models import MusicMoodProfile # Import the MusicMoodProfile model

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
    Signal receiver to update the user's plant based on journal mood
    Uses the MoodEngine for proper mood calculation
    """
    if not created: # Only process newly created journal entries for mood impact
        return

    # Check if the journal entry has a mood score
    if instance.mood_score is not None:
        user_plant = Plant.objects.filter(user=instance.user).first()

        if user_plant:
            try:
                from utils.mood_logic import MoodEngine
                
                # Get combined mood using MoodEngine
                combined_mood = MoodEngine.get_combined_user_mood(instance.user)
                
                # Update plant mood fields
                user_plant.journal_mood_score = instance.mood_score
                user_plant.combined_mood_score = combined_mood.get('mood_score', 0.5)
                user_plant.current_mood_influence = combined_mood.get('unified_mood', 'neutral')
                
                # Calculate growth impact
                mood_impact = MoodEngine.calculate_plant_growth_impact(
                    combined_mood, 
                    user_plant.growth_points
                )
                
                # Apply growth points if there's a change
                if mood_impact['growth_change'] != 0:
                    user_plant.add_growth_points(
                        mood_impact['growth_change'], 
                        source=f"journal_signal_{instance.mood}"
                    )
                
                # Update health based on mood (positive mood improves health)
                mood_health_change = (combined_mood.get('mood_score', 0.5) - 0.5) * 10
                user_plant.health_score = max(0, min(100, user_plant.health_score + mood_health_change))
                
                user_plant.last_mood_update = timezone.now()
                user_plant.save()

                # Log this mood-driven update
                PlantLog.objects.create(
                    plant=user_plant,
                    activity_type="journal_sentiment",
                    note=f"Journal signal: {instance.mood} ({instance.mood_score:.2f}) → {user_plant.current_mood_influence}",
                    value=instance.mood_score,
                    growth_impact=mood_impact['growth_change']
                )
                
                print(f"Plant {user_plant.name} mood updated via signal: {user_plant.current_mood_influence}")
                
            except Exception as e:
                print(f"Error in journal signal mood update: {e}")
                import traceback
                print(traceback.format_exc())
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

@receiver(post_save, sender=MusicMoodProfile)
def update_plant_mood_from_music(sender, instance, created, **kwargs):
    """
    Signal receiver to update plant mood based on music mood changes.
    Uses MoodEngine for proper mood calculation.
    """
    try:
        user = instance.user
        current_mood_score = instance.current_mood_score
        
        try:
            plant = Plant.objects.get(user=user)
            logger.info(f"Updating plant {plant.name} for user {user.username} with music mood score: {current_mood_score}")

            if current_mood_score is not None:
                try:
                    from utils.mood_logic import MoodEngine
                    
                    # Update plant's music mood score
                    plant.spotify_mood_score = current_mood_score
                    plant.music_mood_score = current_mood_score
                    
                    # Get combined mood using MoodEngine
                    combined_mood = MoodEngine.get_combined_user_mood(user)
                    
                    # Update plant mood fields
                    plant.combined_mood_score = combined_mood.get('mood_score', 0.5)
                    plant.current_mood_influence = combined_mood.get('unified_mood', 'neutral')
                    
                    # Calculate growth impact
                    mood_impact = MoodEngine.calculate_plant_growth_impact(
                        combined_mood, 
                        plant.growth_points
                    )
                    
                    # Apply growth points if there's a change
                    if mood_impact['growth_change'] != 0:
                        plant.add_growth_points(
                            mood_impact['growth_change'], 
                            source=f"music_signal_{combined_mood.get('unified_mood', 'neutral')}"
                        )
                    
                    # Update health based on mood
                    mood_health_change = (combined_mood.get('mood_score', 0.5) - 0.5) * 8
                    plant.health_score = max(0, min(100, plant.health_score + mood_health_change))
                    
                    plant.last_mood_update = timezone.now()
                    plant.save()
                    
                    logger.info(f"Plant {plant.name} mood updated from music: {plant.current_mood_influence}")
                    
                except Exception as e:
                    logger.error(f"Error using MoodEngine in music signal: {e}")
                    # Fallback to simple mood update
                    mood_effect = (current_mood_score - 0.5) * 2
                    health_change = mood_effect * 5
                    plant.health_score = max(0, min(100, plant.health_score + health_change))
                    plant.spotify_mood_score = current_mood_score
                    plant.last_mood_update = timezone.now()
                    plant.save()
                    
        except Plant.DoesNotExist:
            logger.warning(f"No plant found for user {user.username} to update with music mood.")
        except Exception as e:
            logger.exception(f"Error updating plant mood from music for user {user.username}: {e}")
            
    except Exception as e:
        logger.exception(f"Error in update_plant_mood_from_music signal: {e}")
