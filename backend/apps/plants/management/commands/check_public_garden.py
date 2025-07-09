from django.core.management.base import BaseCommand
from apps.plants.models import Plant
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Check and fix public garden issues'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Checking public garden status...")
        
        # Check total plants
        total_plants = Plant.objects.count()
        self.stdout.write(f"Total plants in database: {total_plants}")
        
        # Check public plants
        public_plants = Plant.objects.filter(is_public=True)
        public_count = public_plants.count()
        self.stdout.write(f"Public plants: {public_count}")
        
        # Check private plants
        private_plants = Plant.objects.filter(is_public=False)
        private_count = private_plants.count()
        self.stdout.write(f"Private plants: {private_count}")
        
        if total_plants == 0:
            self.stdout.write(self.style.WARNING("❌ No plants found in database!"))
            return
        
        if public_count == 0:
            self.stdout.write(self.style.WARNING("❌ No public plants found!"))
            
            # Ask if user wants to make plants public
            response = input("Would you like to make all plants public? (y/n): ")
            if response.lower() == 'y':
                # Make all plants public
                Plant.objects.all().update(is_public=True)
                self.stdout.write(self.style.SUCCESS("✅ All plants are now public!"))
                
                # Show updated counts
                new_public_count = Plant.objects.filter(is_public=True).count()
                self.stdout.write(f"Public plants after update: {new_public_count}")
            else:
                self.stdout.write("No changes made.")
        else:
            self.stdout.write(self.style.SUCCESS("✅ Public garden is working!"))
            
            # Show some public plant details
            self.stdout.write("\n📋 Public plants:")
            for plant in public_plants[:5]:  # Show first 5
                self.stdout.write(f"  - {plant.name} by {plant.user.username} ({plant.species})")
            
            if public_count > 5:
                self.stdout.write(f"  ... and {public_count - 5} more")
        
        # Check if there are any users without plants
        users_without_plants = User.objects.filter(plant__isnull=True).count()
        if users_without_plants > 0:
            self.stdout.write(self.style.WARNING(f"⚠️  {users_without_plants} users without plants"))
        
        self.stdout.write("\n🎯 Public garden check complete!") 