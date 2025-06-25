from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from django.contrib.auth.models import User
from datetime import datetime, timedelta
import logging
from .models import Reminder, ReminderLog

logger = logging.getLogger(__name__)


def send_journal_reminders():
    """
    Background task to check and send journal reminders
    This can be called by Celery, django-cron, or management command
    """
    current_time = timezone.now()
    sent_count = 0
    error_count = 0
    
    logger.info(f"Starting reminder check at {current_time}")
    
    # Get all enabled reminders that are due
    reminders = Reminder.objects.filter(enabled=True)
    
    for reminder in reminders:
        try:
            # Check if this reminder should be sent
            if not reminder.is_due_today:
                continue
                
            # Check if it's time to send (within 1 hour window)
            user_time = current_time.time()
            reminder_time = reminder.time
            
            # Create time range (1 hour window around reminder time)
            reminder_datetime = datetime.combine(current_time.date(), reminder_time)
            time_diff = abs((current_time.time().hour * 60 + current_time.time().minute) - 
                          (reminder_time.hour * 60 + reminder_time.minute))
            
            # Send if within 30 minutes of reminder time
            if time_diff <= 30:
                success = send_individual_reminder(reminder)
                if success:
                    sent_count += 1
                else:
                    error_count += 1
                    
        except Exception as e:
            logger.error(f"Error processing reminder for {reminder.user.username}: {str(e)}")
            error_count += 1
    
    logger.info(f"Reminder check complete. Sent: {sent_count}, Errors: {error_count}")
    return {'sent': sent_count, 'errors': error_count}


def send_individual_reminder(reminder):
    """
    Send a single reminder via the specified method
    """
    try:
        success = False
        error_message = ""
        
        # Determine if this is a wilting warning
        is_wilting_warning = reminder.should_send_wilting_warning
        
        if reminder.method in ['email', 'both']:
            success = send_email_reminder(reminder, is_wilting_warning)
            
        if reminder.method in ['push', 'both']:
            # TODO: Implement push notifications with FCM
            success = True  # For now, mark as successful
            
        # Log the reminder
        ReminderLog.objects.create(
            reminder=reminder,
            method_used=reminder.method,
            success=success,
            error_message=error_message,
            consecutive_misses_at_time=reminder.consecutive_misses,
            was_wilting_warning=is_wilting_warning
        )
        
        if success:
            reminder.mark_reminder_sent()
            
        return success
        
    except Exception as e:
        logger.error(f"Failed to send reminder to {reminder.user.username}: {str(e)}")
        
        # Log the error
        ReminderLog.objects.create(
            reminder=reminder,
            method_used=reminder.method,
            success=False,
            error_message=str(e),
            consecutive_misses_at_time=reminder.consecutive_misses,
            was_wilting_warning=is_wilting_warning
        )
        
        return False


def send_email_reminder(reminder, is_wilting_warning=False):
    """
    Send email reminder to user
    """
    try:
        email_content = reminder.get_email_content()
        
        # Customize subject for wilting warnings
        if is_wilting_warning:
            email_content['subject'] = f"🚨 {email_content['subject']} - Your plant needs you!"
        
        # Send the email
        send_mail(
            subject=email_content['subject'],
            message=email_content['message'],
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[reminder.user.email],
            fail_silently=False,
        )
        
        logger.info(f"Email reminder sent to {reminder.user.username} ({reminder.user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {reminder.user.email}: {str(e)}")
        return False


def check_missed_journals():
    """
    Daily task to check for missed journals and update consecutive miss counters
    """
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    updated_count = 0
    
    # Get all users with reminders
    reminders = Reminder.objects.filter(enabled=True)
    
    for reminder in reminders:
        try:
            # Check if user journaled yesterday
            try:
                from apps.journal.models import JournalEntry
                has_journaled_yesterday = JournalEntry.objects.filter(
                    user=reminder.user,
                    date=yesterday
                ).exists()
                
                if not has_journaled_yesterday:
                    # User missed yesterday - increment counter
                    reminder.increment_consecutive_misses()
                    
                    # Update plant if wilting threshold reached
                    if reminder.consecutive_misses >= reminder.wilting_threshold:
                        update_plant_for_wilting(reminder.user)
                    
                    updated_count += 1
                    
            except ImportError:
                # Journal app not available
                continue
                
        except Exception as e:
            logger.error(f"Error checking missed journal for {reminder.user.username}: {str(e)}")
    
    logger.info(f"Checked missed journals. Updated {updated_count} users.")
    return updated_count


def update_plant_for_wilting(user):
    """
    Update user's plant to wilted state due to missed journals
    """
    try:
        from apps.plants.models import Plant
        
        plant = Plant.objects.filter(user=user).first()
        if plant and plant.stage != 'wilted':
            plant.stage = 'wilted'
            plant.save()
            logger.info(f"Plant set to wilted for user {user.username}")
            
    except ImportError:
        # Plants app not available
        pass
    except Exception as e:
        logger.error(f"Error updating plant for {user.username}: {str(e)}")


def send_test_reminder(user_id):
    """
    Send a test reminder to a specific user (for testing purposes)
    """
    try:
        user = User.objects.get(id=user_id)
        reminder, created = Reminder.objects.get_or_create(user=user)
        
        if created:
            logger.info(f"Created new reminder for {user.username}")
        
        success = send_individual_reminder(reminder)
        return success
        
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found")
        return False
    except Exception as e:
        logger.error(f"Error sending test reminder: {str(e)}")
        return False


def cleanup_old_reminder_logs(days_to_keep=30):
    """
    Clean up old reminder logs to prevent database bloat
    """
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    deleted_count = ReminderLog.objects.filter(sent_at__lt=cutoff_date).delete()[0]
    
    logger.info(f"Cleaned up {deleted_count} old reminder logs")
    return deleted_count


# Utility functions for different scheduler types

def run_daily_reminder_check():
    """
    Main entry point for daily reminder checking
    Combines reminder sending and missed journal checking
    """
    logger.info("Running daily reminder check...")
    
    # Send due reminders
    reminder_results = send_journal_reminders()
    
    # Check for missed journals from yesterday
    missed_count = check_missed_journals()
    
    # Clean up old logs
    cleanup_old_reminder_logs()
    
    return {
        'reminders_sent': reminder_results['sent'],
        'reminder_errors': reminder_results['errors'],
        'missed_journals_updated': missed_count
    }


# For django-cron integration
def cron_reminder_job():
    """Entry point for django-cron"""
    return run_daily_reminder_check()


# For Celery integration (if using Celery)
try:
    from celery import shared_task
    
    @shared_task
    def celery_send_reminders():
        """Celery task for sending reminders"""
        return send_journal_reminders()
    
    @shared_task
    def celery_check_missed_journals():
        """Celery task for checking missed journals"""
        return check_missed_journals()
    
    @shared_task
    def celery_daily_reminder_check():
        """Celery task for full daily reminder check"""
        return run_daily_reminder_check()
        
except ImportError:
    # Celery not installed
    pass 