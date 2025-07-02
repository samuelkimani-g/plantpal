#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.payments.models import LeafPackage

def create_default_packages():
    """Create default leaf packages if they don't exist"""
    
    packages = [
        {
            'name': 'Starter Pack',
            'leaves': 10,
            'price': 50.00,
            'description': 'Perfect for beginners - get started with watering plants!',
            'is_active': True
        },
        {
            'name': 'Garden Lover',
            'leaves': 25,
            'price': 100.00,
            'description': 'Great value for regular plant carers',
            'is_active': True
        },
        {
            'name': 'PlantPal Pro',
            'leaves': 60,
            'price': 200.00,
            'description': 'Best value! Perfect for active community members',
            'is_active': True
        },
        {
            'name': 'Ultimate Green',
            'leaves': 150,
            'price': 500.00,
            'description': 'Maximum leaves for the ultimate plant enthusiast!',
            'is_active': True
        }
    ]
    
    created_count = 0
    for package_data in packages:
        package, created = LeafPackage.objects.get_or_create(
            name=package_data['name'],
            defaults=package_data
        )
        if created:
            created_count += 1
            print(f"✅ Created package: {package.name} - {package.leaves} leaves for KES {package.price}")
        else:
            print(f"📦 Package already exists: {package.name}")
    
    print(f"\n🎉 Created {created_count} new packages!")
    print(f"📊 Total active packages: {LeafPackage.objects.filter(is_active=True).count()}")

if __name__ == "__main__":
    create_default_packages() 