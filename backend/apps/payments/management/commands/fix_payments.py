from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.payments.models import MpesaTransaction, LeafPackage
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix pending payments and add test packages'

    def add_arguments(self, parser):
        parser.add_argument(
            '--complete-pending',
            action='store_true',
            help='Complete all pending transactions (for testing)',
        )
        parser.add_argument(
            '--add-test-packages',
            action='store_true',
            help='Add cheap test packages',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username to complete transactions for (optional)',
        )

    def handle(self, *args, **options):
        if options['complete_pending']:
            self.complete_pending_transactions(options.get('username'))
        
        if options['add_test_packages']:
            self.add_test_packages()

    def complete_pending_transactions(self, username=None):
        """Complete all pending transactions"""
        query = MpesaTransaction.objects.filter(status='PENDING')
        
        if username:
            try:
                user = User.objects.get(username=username)
                query = query.filter(user=user)
                self.stdout.write(f"Completing pending transactions for user: {username}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User {username} not found"))
                return
        else:
            self.stdout.write("Completing ALL pending transactions")
        
        pending_transactions = query.order_by('-created_at')
        
        if not pending_transactions.exists():
            self.stdout.write(self.style.WARNING("No pending transactions found"))
            return
        
        self.stdout.write(f"Found {pending_transactions.count()} pending transactions:")
        
        for transaction in pending_transactions:
            self.stdout.write(f"  • Transaction {transaction.id}: {transaction.user.username} - KES {transaction.amount} ({transaction.leaves} leaves)")
        
        confirm = input("\nComplete these transactions? (y/N): ")
        if confirm.lower() != 'y':
            self.stdout.write("Aborted")
            return
        
        completed_count = 0
        for transaction in pending_transactions:
            try:
                # Create a fake receipt number
                fake_receipt = f"FIX{transaction.id}{timezone.now().strftime('%Y%m%d%H%M%S')}"
                
                # Mark as successful
                transaction.mark_successful(
                    receipt_number=fake_receipt,
                    result_code="0",
                    result_desc="Manually completed - money was deducted"
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Completed transaction {transaction.id}: "
                        f"{transaction.leaves} leaves credited to {transaction.user.username}"
                    )
                )
                completed_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ Failed to complete transaction {transaction.id}: {e}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"\n🎉 Completed {completed_count} transactions!")
        )

    def add_test_packages(self):
        """Add cheap test packages"""
        test_packages = [
            {
                'name': 'Test Package - 1 KES',
                'leaves': 10,
                'price': 1,
                'description': 'Test package for 1 KES - 10 leaves'
            },
            {
                'name': 'Mini Test - 5 KES',
                'leaves': 50,
                'price': 5,
                'description': 'Mini test package for 5 KES - 50 leaves'
            },
            {
                'name': 'Small Test - 10 KES',
                'leaves': 100,
                'price': 10,
                'description': 'Small test package for 10 KES - 100 leaves'
            }
        ]
        
        created_count = 0
        for package_data in test_packages:
            package, created = LeafPackage.objects.get_or_create(
                name=package_data['name'],
                defaults=package_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Created package: {package.name}")
                )
                created_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(f"⚠️ Package already exists: {package.name}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"\n🎉 Created {created_count} test packages!")
        ) 