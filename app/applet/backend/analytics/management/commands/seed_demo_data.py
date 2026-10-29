from datetime import time, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from commuters.models import CommuterRoute
from packages.models import Package
from matching.models import Match
from matching.services import MatchingService
from deliveries.models import Delivery
from transactions.models import Transaction
from analytics.models import EcoImpact, Review
from notifications.models import Notification

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds realistic demonstration data around Hyderabad corridors for RoutePool presentation'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **options):
        self.stdout.write("Initializing RoutePool Hyderabad Demo Dataset...")

        if options['clear']:
            Review.objects.all().delete()
            EcoImpact.objects.all().delete()
            Transaction.objects.all().delete()
            Delivery.objects.all().delete()
            Match.objects.all().delete()
            Package.objects.all().delete()
            CommuterRoute.objects.all().delete()
            Vendor.objects.all().delete()
            Notification.objects.all().delete()
            User.objects.filter(email__contains='@routepool.local').delete()

        vendor_user, _ = User.objects.get_or_create(
            email='demo_vendor@routepool.local',
            defaults={
                'username': 'demo_vendor@routepool.local',
                'name': 'Sri Krishna Electronics',
                'role': 'vendor',
                'phone': '+91 98490 12345',
                'reliability_score': 98.0
            }
        )
        vendor_user.set_password('demopassword123')
        vendor_user.save()

        vendor_profile, _ = Vendor.objects.get_or_create(
            user=vendor_user,
            defaults={
                'business_name': 'Sri Krishna Electronics & Gadgets',
                'location': 'Khairatabad Circle, Hyderabad',
                'lat': 17.4116,
                'lng': 78.4611
            }
        )

        commuter_user, _ = User.objects.get_or_create(
            email='demo_commuter@routepool.local',
            defaults={
                'username': 'demo_commuter@routepool.local',
                'name': 'Rajesh Sharma',
                'role': 'commuter',
                'phone': '+91 98765 43210',
                'reliability_score': 98.0
            }
        )
        commuter_user.set_password('demopassword123')
        commuter_user.save()

        admin_user, _ = User.objects.get_or_create(
            email='demo_admin@routepool.local',
            defaults={
                'username': 'demo_admin@routepool.local',
                'name': 'System Administrator',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'phone': '+91 90000 00000',
                'reliability_score': 100.0
            }
        )
        admin_user.set_password('demopassword123')
        admin_user.save()

        route1, _ = CommuterRoute.objects.get_or_create(
            commuter=commuter_user,
            route_name="Daily Office Transit: Khairatabad to Ameerpet",
            defaults={
                'start_location': 'Khairatabad Metro Station',
                'start_lat': 17.4116,
                'start_lng': 78.4611,
                'destination': 'Ameerpet Commercial Complex',
                'dest_lat': 17.4375,
                'dest_lng': 78.4482,
                'intermediate_points': [
                    {'name': 'Punjagutta Junction', 'lat': 17.4265, 'lng': 78.4526},
                    {'name': 'SR Nagar Main Road', 'lat': 17.4428, 'lng': 78.4481}
                ],
                'departure_time': time(8, 30),
                'arrival_time': time(9, 15),
                'available_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                'max_package_weight': 4.0,
                'max_package_size': 'medium',
                'max_detour': 1.5,
                'travel_mode': 'two_wheeler',
                'is_active': True
            }
        )

        now = timezone.now()
        ready_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
        deadline = now.replace(hour=12, minute=0, second=0, microsecond=0)

        pkg1, _ = Package.objects.get_or_create(
            vendor=vendor_profile,
            package_name="Microcontroller ICs & SMD Sensors Batch",
            defaults={
                'description': 'Small box with sensitive ESD sensors and microcontroller boards',
                'pickup_location': 'Khairatabad Circle Vendor Hub',
                'pickup_lat': 17.4116,
                'pickup_lng': 78.4611,
                'destination': 'Ameerpet Computer Electronics Market',
                'dest_lat': 17.4375,
                'dest_lng': 78.4482,
                'weight': 0.8,
                'size': 'small',
                'ready_time': ready_time,
                'delivery_deadline': deadline,
                'offered_reward': 45.0,
                'status': 'SEARCHING',
                'direct_distance_km': 3.2,
                'estimated_standard_courier_price': 75.0
            }
        )

        MatchingService.find_and_record_matches(pkg1)

        self.stdout.write(self.style.SUCCESS("RoutePool demo dataset successfully populated!"))
