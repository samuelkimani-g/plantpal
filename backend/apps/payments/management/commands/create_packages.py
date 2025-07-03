"""
Django management command to create default leaf packages
Usage: python manage.py create_packages
"""

from django.core.management.base import BaseCommand
from apps.payments.models import LeafPackage


class Command(BaseCommand):
    help = 'Create default leaf packages for PlantPal'

    def handle(self, *args, **options):
        self.stdout.write("🌱 Creating default leaf packages...")
        
        # Define the packages
        packages_data = [
            {
                'name': 'Starter Pack',
                'leaves': 10,
                'price': 20,
                'description': 'Perfect for beginners! Water 5 plants and try premium features.'
            },
            {
                'name': 'Growth Pack', 
                'leaves': 25,
                'price': 45,
                'description': 'Great value! Water 12 plants and unlock more features.'
            },
            {
                'name': 'Garden Pack',
                'leaves': 50, 
                'price': 80,
                'description': 'Popular choice! Water 25 plants with bonus features.'
            },
            {
                'name': 'Premium Pack',
                'leaves': 100,
                'price': 150, 
                'description': 'Best value! Water 50 plants and get full premium access.'
            },
            {
                'name': 'Super Pack',
                'leaves': 200,
                'price': 280,
                'description': 'Ultimate pack! Water 100 plants and enjoy all features.'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for pkg_data in packages_data:
            package, created = LeafPackage.objects.get_or_create(
                name=pkg_data['name'],
                defaults={
                    'leaves': pkg_data['leaves'],
                    'price': pkg_data['price'],
                    'description': pkg_data['description'],
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Created: {package.name} - {package.leaves} leaves for KES {package.price}")
                )
                created_count += 1
            else:
                # Update existing package
                package.leaves = pkg_data['leaves']
                package.price = pkg_data['price'] 
                package.description = pkg_data['description']
                package.is_active = True
                package.save()
                self.stdout.write(
                    self.style.WARNING(f"🔄 Updated: {package.name} - {package.leaves} leaves for KES {package.price}")
                )
                updated_count += 1
        
        # Deactivate any old packages that aren't in our list
        current_names = [pkg['name'] for pkg in packages_data]
        old_packages = LeafPackage.objects.exclude(name__in=current_names)
        if old_packages.exists():
            old_count = old_packages.count()
            old_packages.update(is_active=False)
            self.stdout.write(
                self.style.WARNING(f"🚫 Deactivated {old_count} old packages")
            )
        
        # Summary
        total_active = LeafPackage.objects.filter(is_active=True).count()
        self.stdout.write("\n📊 Summary:")
        self.stdout.write(f"   • Created: {created_count} packages")
        self.stdout.write(f"   • Updated: {updated_count} packages") 
        self.stdout.write(f"   • Total active packages: {total_active}")
        self.stdout.write(self.style.SUCCESS("✅ Default packages setup complete!")) 