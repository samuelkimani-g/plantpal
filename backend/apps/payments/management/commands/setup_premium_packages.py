from django.core.management.base import BaseCommand
from apps.payments.models import PremiumPackage

class Command(BaseCommand):
    help = 'Set up premium packages for direct M-Pesa purchase'

    def handle(self, *args, **options):
        premium_packages = [
            {
                'name': 'Premium 30 Days',
                'duration_days': 30,
                'price': 100,
                'description': 'Premium membership for 30 days - AI Chat & exclusive features'
            },
            {
                'name': 'Premium 90 Days',
                'duration_days': 90,
                'price': 250,
                'description': 'Premium membership for 90 days - AI Chat & exclusive features'
            },
            {
                'name': 'Premium 365 Days',
                'duration_days': 365,
                'price': 800,
                'description': 'Premium membership for 1 year - AI Chat & exclusive features'
            },
            {
                'name': 'Test Premium - 7 Days',
                'duration_days': 7,
                'price': 20,
                'description': 'Test premium membership for 7 days'
            }
        ]
        
        created_count = 0
        for package_data in premium_packages:
            package, created = PremiumPackage.objects.get_or_create(
                name=package_data['name'],
                defaults=package_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Created premium package: {package.name}")
                )
                created_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(f"⚠️ Premium package already exists: {package.name}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"\n🎉 Created {created_count} premium packages!")
        ) 