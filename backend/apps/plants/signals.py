from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.journal.models import JournalEntry # To listen for journal entry saves
from .models import Plant, PlantLog # Your Plant and PlantLog models

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

    # Check if the journal entry has an associated mood entry with a score
    if instance.mood_entry and instance.mood_entry.mood_score is not None:
        user_plant = Plant.objects.filter(user=instance.user).first() # Get the user's first plant (or current primary)

        if user_plant:
            # Calculate health change based on mood_score (0.0 to 1.0)
            # A higher mood_score boosts health, lower can reduce it
            # Neutral (0.5) implies no significant change from mood alone
            mood_health_change = (instance.mood_entry.mood_score - 0.5) * MOOD_IMPACT_FACTOR
            
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
                note=f"Mood from journal entry {instance.id}: {instance.mood_entry.mood_type} ({instance.mood_entry.mood_score:.2f}) affected plant health by {mood_health_change:.2f}.",
                value=instance.mood_entry.mood_score # Store the mood score for reference
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

# Optional: Add a signal for when a plant hasn't been watered/fertilized for a long time
# This would require periodic tasks (e.g., Django management command + cron job)
# @receiver(post_save, sender=Plant)
# def check_plant_decay(sender, instance, **kwargs):
#     if not kwargs.get('raw', False): # Only run on saves, not on initial load from db
#         if instance.last_watered and (timezone.now() - instance.last_watered).days > 3:
#             instance.health = max(0, instance.health - 5) # Example decay
#             instance.save()
