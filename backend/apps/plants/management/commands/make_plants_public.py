from django.core.management.base import BaseCommand
from apps.plants.models import Plant
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Make some plants public for testing the public garden feature'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Make all plants public',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Number of plants to make public (default: 5)',
        )

    def handle(self, *args, **options):
        if options['all']:
            # Make all plants public
            plants = Plant.objects.all()
            count = plants.count()
            plants.update(is_public=True)
            self.stdout.write(
                self.style.SUCCESS(f'Successfully made {count} plants public')
            )
        else:
            # Make a specific number of plants public
            count = options['count']
            plants = Plant.objects.filter(is_public=False)[:count]
            actual_count = plants.count()
            for plant in plants:
                plant.is_public = True
                plant.save()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully made {actual_count} plants public')
            )
        
        # Show some stats
        total_plants = Plant.objects.count()
        public_plants = Plant.objects.filter(is_public=True).count()
        self.stdout.write(f'Total plants: {total_plants}')
        self.stdout.write(f'Public plants: {public_plants}')
        
        # Show some example public plants
        public_plants_list = Plant.objects.filter(is_public=True).select_related('user')[:3]
        if public_plants_list:
            self.stdout.write('\nExample public plants:')
            for plant in public_plants_list:
                self.stdout.write(f'  - {plant.name} by {plant.user.username} ({plant.species})') 