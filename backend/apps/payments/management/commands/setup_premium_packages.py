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
                'bonus_leaves': 50,
                'description': 'Premium membership for 30 days + 50 bonus leaves.'
            },
            {
                'name': 'Premium 90 Days',
                'duration_days': 90,
                'price': 250,
                'bonus_leaves': 150,
                'description': 'Premium membership for 90 days + 150 bonus leaves.'
            },
            {
                'name': 'Premium 365 Days',
                'duration_days': 365,
                'price': 800,
                'bonus_leaves': 500,
                'description': 'Premium membership for 1 year + 500 bonus leaves.'
            },
            {
                'name': 'Test Premium - 7 Days',
                'duration_days': 7,
                'price': 20,
                'bonus_leaves': 10,
                'description': 'Test premium membership for 7 days + 10 bonus leaves.'
            }
        ]
        
        created_count = 0
        for package_data in premium_packages:
            package, created = PremiumPackage.objects.update_or_create(
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
                    self.style.SUCCESS(f"✅ Updated premium package: {package.name}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"\n🎉 Finished setting up premium packages!")
        ) 