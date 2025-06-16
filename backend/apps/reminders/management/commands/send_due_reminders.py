import datetime # Import datetime for timezone.now() adjustments if needed
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.reminders.models import Reminder

class Command(BaseCommand):
    """
    Django custom management command to send (simulate) due reminders.
    This command can be run periodically via a cron job or manually.
    """
    help = 'Sends (simulates) notifications for reminders that are due.'

    def handle(self, *args, **options):
        """
        The main logic for the command.
        Finds due reminders, "sends" them, and marks them as notified.
        """
        self.stdout.write("Checking for due reminders...")

        now = timezone.now()
        
        # Adjust 'now' to be timezone-aware if it's not already
        if not timezone.is_aware(now):
            now = timezone.make_aware(now, timezone.get_current_timezone())

        # Query for reminders that are due (scheduled_for <= now) and have not yet been notified
        # Use select_related to pre-fetch related user and plant objects for efficiency
        due_reminders = Reminder.objects.filter(
            scheduled_for__lte=now,
            notified=False
        ).select_related('user', 'plant') # Pre-fetch user and plant for reminder details

        if not due_reminders.exists():
            self.stdout.write(self.style.SUCCESS("No due reminders found."))
            return

        self.stdout.write(f"Found {due_reminders.count()} due reminder(s).")

        for reminder in due_reminders:
            # Simulate sending a notification
            # In a real application, this would involve:
            # - Sending an email (e.g., using SendGrid, Mailgun)
            # - Sending a push notification (e.g., using FCM, Expo Push Notifications)
            # - Sending an SMS
            
            plant_info = f" for {reminder.plant.name}" if reminder.plant else ""
            self.stdout.write(
                self.style.NOTICE(
                    f"Simulating notification for User: {reminder.user.username} - "
                    f"Reminder: '{reminder.title}'{plant_info} (Scheduled for: {reminder.scheduled_for.strftime('%Y-%m-%d %H:%M')})"
                )
            )

            # Mark the reminder as notified
            reminder.notified = True
            reminder.save()
            self.stdout.write(self.style.SUCCESS(f"  -> Reminder '{reminder.title}' marked as notified."))

        self.stdout.write(self.style.SUCCESS("Reminder check complete."))
