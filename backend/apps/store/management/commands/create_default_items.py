from django.core.management.base import BaseCommand
from apps.store.models import StoreItem

class Command(BaseCommand):
    help = 'Creates default items for the store'

    def handle(self, *args, **options):
        self.stdout.write('Creating default store items...')

        items_to_create = [
            # Avatars
            {'name': 'Golden Leaf Avatar', 'description': 'A shiny golden leaf avatar for premium users.', 'price': 500, 'item_type': 'AVATAR', 'image_url': 'https://i.imgur.com/gYfD4Sj.png', 'is_premium_only': True},
            {'name': 'Smiling Plant Avatar', 'description': 'A happy, smiling plant.', 'price': 100, 'item_type': 'AVATAR', 'image_url': 'https://i.imgur.com/example.png'},
            
            # Pots
            {'name': 'Classic Terracotta', 'description': 'A timeless classic pot.', 'price': 50, 'item_type': 'POT', 'image_url': 'https://i.imgur.com/example.png'},
            {'name': 'Modern Ceramic Pot', 'description': 'A sleek and modern pot.', 'price': 150, 'item_type': 'POT', 'image_url': 'https://i.imgur.com/example.png'},
            {'name': 'Diamond Pot (Premium)', 'description': 'An exclusive, shimmering diamond pot for premium users.', 'price': 1000, 'item_type': 'POT', 'image_url': 'https://i.imgur.com/example.png', 'is_premium_only': True},

            # Decorations
            {'name': 'Garden Gnome', 'description': 'A friendly gnome to watch over your plant.', 'price': 200, 'item_type': 'DECORATION', 'image_url': 'https://i.imgur.com/example.png'},
            {'name': 'Fairy Lights', 'description': 'Sparkling lights to brighten your plant\'s day.', 'price': 300, 'item_type': 'DECORATION', 'image_url': 'https://i.imgur.com/example.png'},
        ]

        for item_data in items_to_create:
            item, created = StoreItem.objects.get_or_create(name=item_data['name'], defaults=item_data)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created {item.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'{item.name} already exists.'))
        
        self.stdout.write(self.style.SUCCESS('Finished creating default items.')) 