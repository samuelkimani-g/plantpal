from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.reminders.tasks import run_daily_reminder_check, send_test_reminder
from apps.reminders.models import Reminder, ReminderLog
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Django management command for sending reminders
    
    Usage:
    python manage.py send_reminders                    # Run daily reminder check
    python manage.py send_reminders --test <user_id>   # Send test reminder to user
    python manage.py send_reminders --stats            # Show reminder statistics
    python manage.py send_reminders --cleanup          # Clean up old logs
    """
    
    help = 'Send journal reminders to users'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--test',
            type=int,
            help='Send test reminder to specific user ID',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show reminder statistics instead of sending reminders',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up old reminder logs',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force send reminders even if already sent today',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(f'Starting reminder command at {timezone.now()}')
        )
        
        try:
            if options['test']:
                self.send_test_reminder(options['test'])
            elif options['stats']:
                self.show_stats()
            elif options['cleanup']:
                self.cleanup_logs()
            elif options['dry_run']:
                self.dry_run()
            else:
                self.send_reminders(force=options['force'])
                
        except Exception as e:
            logger.error(f"Command failed: {str(e)}")
            raise CommandError(f'Command failed: {str(e)}')

    def send_reminders(self, force=False):
        """Send daily reminders"""
        self.stdout.write('Running daily reminder check...')
        
        if force:
            self.stdout.write(self.style.WARNING('Force mode enabled - ignoring timing checks'))
        
        results = run_daily_reminder_check()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Reminder check complete:\n'
                f'  - Reminders sent: {results["reminders_sent"]}\n'
                f'  - Errors: {results["reminder_errors"]}\n'
                f'  - Missed journals updated: {results["missed_journals_updated"]}'
            )
        )

    def send_test_reminder(self, user_id):
        """Send test reminder to specific user"""
        self.stdout.write(f'Sending test reminder to user {user_id}...')
        
        success = send_test_reminder(user_id)
        
        if success:
            self.stdout.write(
                self.style.SUCCESS(f'Test reminder sent successfully to user {user_id}')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f'Failed to send test reminder to user {user_id}')
            )

    def show_stats(self):
        """Show reminder statistics"""
        self.stdout.write('Reminder Statistics:')
        self.stdout.write('=' * 50)
        
        # Total reminders configured
        total_reminders = Reminder.objects.count()
        enabled_reminders = Reminder.objects.filter(enabled=True).count()
        
        self.stdout.write(f'Total reminder configurations: {total_reminders}')
        self.stdout.write(f'Enabled reminders: {enabled_reminders}')
        self.stdout.write(f'Disabled reminders: {total_reminders - enabled_reminders}')
        
        # Reminder logs statistics
        total_logs = ReminderLog.objects.count()
        successful_logs = ReminderLog.objects.filter(success=True).count()
        failed_logs = ReminderLog.objects.filter(success=False).count()
        
        self.stdout.write(f'\nReminder Logs:')
        self.stdout.write(f'Total logs: {total_logs}')
        self.stdout.write(f'Successful: {successful_logs}')
        self.stdout.write(f'Failed: {failed_logs}')
        
        if total_logs > 0:
            success_rate = (successful_logs / total_logs) * 100
            self.stdout.write(f'Success rate: {success_rate:.1f}%')
        
        # Recent activity
        from datetime import timedelta
        recent_logs = ReminderLog.objects.filter(
            sent_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        self.stdout.write(f'Reminders sent in last 7 days: {recent_logs}')
        
        # Users with consecutive misses
        users_with_misses = Reminder.objects.filter(consecutive_misses__gt=0).count()
        wilting_users = Reminder.objects.filter(consecutive_misses__gte=3).count()
        
        self.stdout.write(f'\nUser Activity:')
        self.stdout.write(f'Users with missed journals: {users_with_misses}')
        self.stdout.write(f'Users with wilting plants: {wilting_users}')

    def cleanup_logs(self):
        """Clean up old reminder logs"""
        self.stdout.write('Cleaning up old reminder logs...')
        
        from apps.reminders.tasks import cleanup_old_reminder_logs
        deleted_count = cleanup_old_reminder_logs(days_to_keep=30)
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleaned up {deleted_count} old reminder logs')
        )

    def dry_run(self):
        """Show what reminders would be sent without sending them"""
        self.stdout.write('Dry run - showing what would be sent:')
        self.stdout.write('=' * 50)
        
        due_reminders = []
        
        for reminder in Reminder.objects.filter(enabled=True):
            if reminder.is_due_today:
                due_reminders.append(reminder)
                
                status = "WILTING WARNING" if reminder.should_send_wilting_warning else "NORMAL"
                self.stdout.write(
                    f'User: {reminder.user.username} '
                    f'({reminder.user.email}) - '
                    f'Method: {reminder.method} - '
                    f'Status: {status} - '
                    f'Misses: {reminder.consecutive_misses}'
                )
        
        if not due_reminders:
            self.stdout.write('No reminders due to be sent.')
        else:
            self.stdout.write(f'\nTotal reminders that would be sent: {len(due_reminders)}')
        
        self.stdout.write('\nUse --force flag with normal command to send all reminders.') 