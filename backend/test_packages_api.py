#!/usr/bin/env python3
"""
Test script to check packages API and clean up database
"""

import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.payments.models import LeafPackage

def clean_database():
    """Clean up old packages and keep only the new ones"""
    print("🧹 Cleaning up database...")
    
    # Delete old packages
    old_packages = ['Garden Lover', 'PlantPal Pro', 'Ultimate Green']
    deleted = LeafPackage.objects.filter(name__in=old_packages).delete()
    print(f"   Deleted {deleted[0]} old packages")
    
    # Show current packages
    packages = LeafPackage.objects.filter(is_active=True).order_by('price')
    print(f"\n📦 Current active packages ({packages.count()}):")
    for p in packages:
        print(f"   • {p.name}: {p.leaves} leaves for KES {p.price}")

def test_api():
    """Test the packages API endpoint"""
    print("\n🔌 Testing API endpoint...")
    
    try:
        response = requests.get('http://localhost:8000/api/payments/packages/')
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {len(data)} packages returned")
            for pkg in data:
                print(f"   • {pkg['name']}: {pkg['leaves']} leaves for KES {pkg['price']}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    print("🌱 PlantPal Packages Test")
    print("=" * 30)
    
    clean_database()
    test_api()
    print("\n✅ Test complete!") 