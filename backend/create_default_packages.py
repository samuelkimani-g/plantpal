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
    
    print("🌱 Creating default leaf packages...")
    
    default_packages = [
        {
            'name': 'Starter Pack',
            'leaves': 10,
            'price': 20,
            'description': 'Perfect for beginners! Water 5 plants and try premium features.',
            'is_active': True
        },
        {
            'name': 'Growth Pack',
            'leaves': 25,
            'price': 45,
            'description': 'Great value! Water 12 plants and unlock more features.',
            'is_active': True
        },
        {
            'name': 'Garden Pack',
            'leaves': 50,
            'price': 80,
            'description': 'Popular choice! Water 25 plants with bonus features.',
            'is_active': True
        },
        {
            'name': 'Premium Pack',
            'leaves': 100,
            'price': 150,
            'description': 'Best value! Water 50 plants and get full premium access.',
            'is_active': True
        },
        {
            'name': 'Super Pack',
            'leaves': 200,
            'price': 280,
            'description': 'Ultimate pack! Water 100 plants and enjoy all features.',
            'is_active': True
        },
    ]
    
    created_count = 0
    updated_count = 0
    for package_data in default_packages:
        package, created = LeafPackage.objects.get_or_create(
            name=package_data['name'],
            defaults=package_data
        )
        if created:
            created_count += 1
            print(f"✅ Created: {package.name} - {package.leaves} leaves for KES {package.price}")
        else:
            # Update existing package
            for key, value in package_data.items():
                setattr(package, key, value)
            package.save()
            updated_count += 1
            print(f"🔄 Updated: {package.name} - {package.leaves} leaves for KES {package.price}")
    
    print(f"\n📊 Summary:")
    print(f"   • Created: {created_count} packages")
    print(f"   • Updated: {updated_count} packages")
    print(f"   • Total active packages: {LeafPackage.objects.filter(is_active=True).count()}")
    print("✅ Default packages setup complete!")

if __name__ == "__main__":
    create_default_packages() 