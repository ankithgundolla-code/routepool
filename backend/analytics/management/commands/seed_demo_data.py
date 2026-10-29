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
            self.stdout.write("Clearing previous records...")
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

        # 1. Create Core Demo Users
        # Vendor User
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

        # Secondary Vendor
        vendor_user2, _ = User.objects.get_or_create(
            email='medicart@routepool.local',
            defaults={
                'username': 'medicart@routepool.local',
                'name': 'MedPulse Health Care',
                'role': 'vendor',
                'phone': '+91 94401 98765',
                'reliability_score': 100.0
            }
        )
        vendor_user2.set_password('demopassword123')
        vendor_user2.save()

        Vendor.objects.get_or_create(
            user=vendor_user2,
            defaults={
                'business_name': 'MedPulse Surgical & Diagnostics',
                'location': 'Punjagutta Central, Hyderabad',
                'lat': 17.4265,
                'lng': 78.4526
            }
        )

        # Commuter User (Main Demo)
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

        # Secondary Commuter Users
        commuter2, _ = User.objects.get_or_create(
            email='priya.verma@routepool.local',
            defaults={
                'username': 'priya.verma@routepool.local',
                'name': 'Priya Verma',
                'role': 'commuter',
                'phone': '+91 99887 76655',
                'reliability_score': 96.0
            }
        )
        commuter2.set_password('demopassword123')
        commuter2.save()

        commuter3, _ = User.objects.get_or_create(
            email='syed.khalid@routepool.local',
            defaults={
                'username': 'syed.khalid@routepool.local',
                'name': 'Syed Khalid',
                'role': 'commuter',
                'phone': '+91 91234 56789',
                'reliability_score': 100.0
            }
        )
        commuter3.set_password('demopassword123')
        commuter3.save()

        # Admin User
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

        # 2. Create Registered Commuter Routes
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

        route2, _ = CommuterRoute.objects.get_or_create(
            commuter=commuter2,
            route_name="Morning Corridor: Lakdikapul to Begumpet",
            defaults={
                'start_location': 'Lakdikapul Old Bridge',
                'start_lat': 17.4042,
                'start_lng': 78.4659,
                'destination': 'Begumpet Tech Park',
                'dest_lat': 17.4448,
                'dest_lng': 78.4664,
                'intermediate_points': [
                    {'name': 'Khairatabad RTA', 'lat': 17.4116, 'lng': 78.4611},
                    {'name': 'Somajiguda Circle', 'lat': 17.4260, 'lng': 78.4590}
                ],
                'departure_time': time(8, 45),
                'arrival_time': time(9, 25),
                'available_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                'max_package_weight': 5.0,
                'max_package_size': 'medium',
                'max_detour': 2.0,
                'travel_mode': 'two_wheeler',
                'is_active': True
            }
        )

        route3, _ = CommuterRoute.objects.get_or_create(
            commuter=commuter3,
            route_name="Suburban Car Commute: Banjara Hills to Secunderabad",
            defaults={
                'start_location': 'Banjara Hills Road No 12',
                'start_lat': 17.4156,
                'start_lng': 78.4357,
                'destination': 'Secunderabad Railway Station',
                'dest_lat': 17.4399,
                'dest_lng': 78.4983,
                'intermediate_points': [
                    {'name': 'Punjagutta Flyover', 'lat': 17.4265, 'lng': 78.4526},
                    {'name': 'Begumpet Airport Road', 'lat': 17.4448, 'lng': 78.4664}
                ],
                'departure_time': time(9, 0),
                'arrival_time': time(9, 50),
                'available_days': ['Mon', 'Wed', 'Fri'],
                'max_package_weight': 8.0,
                'max_package_size': 'large',
                'max_detour': 2.5,
                'travel_mode': 'car',
                'is_active': True
            }
        )

        # 3. Create Packages with realistic coordinates along Hyderabad corridors
        now = timezone.now()
        ready_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
        deadline = now.replace(hour=12, minute=0, second=0, microsecond=0)

        # Package 1: Khairatabad to Ameerpet (Exact Corridor Match for Route 1!)
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

        # Package 2: Punjagutta to Begumpet
        pkg2, _ = Package.objects.get_or_create(
            vendor=vendor_profile,
            package_name="Optical Fiber Patch Cords & Adapters",
            defaults={
                'description': 'Network accessories parcel packed in bubble wrap',
                'pickup_location': 'Punjagutta Junction Road',
                'pickup_lat': 17.4265,
                'pickup_lng': 78.4526,
                'destination': 'Begumpet Software Tower',
                'dest_lat': 17.4448,
                'dest_lng': 78.4664,
                'weight': 1.5,
                'size': 'medium',
                'ready_time': ready_time,
                'delivery_deadline': deadline + timedelta(hours=2),
                'offered_reward': 50.0,
                'status': 'SEARCHING',
                'direct_distance_km': 2.8,
                'estimated_standard_courier_price': 80.0
            }
        )

        # Package 3: Completed Delivery Demo (for instant analytics & history demo)
        pkg3, _ = Package.objects.get_or_create(
            vendor=vendor_profile,
            package_name="Precision Calibration Multimeter",
            defaults={
                'description': 'Handheld digital multimeter for engineering lab',
                'pickup_location': 'Lakdikapul Station',
                'pickup_lat': 17.4042,
                'pickup_lng': 78.4659,
                'destination': 'SR Nagar Engineering College Lab',
                'dest_lat': 17.4428,
                'dest_lng': 78.4481,
                'weight': 1.2,
                'size': 'medium',
                'ready_time': ready_time - timedelta(days=1),
                'delivery_deadline': deadline - timedelta(days=1),
                'offered_reward': 55.0,
                'status': 'DELIVERED',
                'direct_distance_km': 4.8,
                'estimated_standard_courier_price': 88.0
            }
        )

        # Run matching engine to populate matches
        self.stdout.write("Running minimum-detour matching engine...")
        MatchingService.find_and_record_matches(pkg1)
        MatchingService.find_and_record_matches(pkg2)

        # Create sample completed delivery for pkg3
        match3, _ = Match.objects.get_or_create(
            package=pkg3,
            commuter_route=route1,
            defaults={
                'pickup_distance': 0.3,
                'destination_distance': 0.2,
                'normal_distance': 4.2,
                'delivery_distance': 4.9,
                'estimated_detour': 0.7,
                'time_score': 95.0,
                'package_score': 100.0,
                'route_score': 92.0,
                'reliability_score': 98.0,
                'detour_penalty': 2.5,
                'final_score': 96.0,
                'match_level': 'EXACT',
                'status': 'ACCEPTED'
            }
        )

        del3, _ = Delivery.objects.get_or_create(
            match=match3,
            defaults={
                'pickup_otp': '782941',
                'delivery_otp': '419382',
                'pickup_verified': True,
                'delivery_verified': True,
                'picked_up_at': timezone.now() - timedelta(hours=3),
                'delivered_at': timezone.now() - timedelta(hours=2),
                'status': 'DELIVERED'
            }
        )

        Transaction.objects.get_or_create(
            delivery=del3,
            defaults={
                'vendor_amount': 55.0,
                'commuter_reward': 41.25,
                'platform_fee': 13.75
            }
        )

        EcoImpact.objects.get_or_create(
            delivery=del3,
            defaults={
                'estimated_distance_saved': 4.8,
                'estimated_co2_saved': round(4.8 * 0.144, 2)
            }
        )

        Review.objects.get_or_create(
            delivery=del3,
            reviewer=vendor_user,
            reviewed_user=commuter_user,
            defaults={
                'rating': 5,
                'comment': 'Prompt pickup along the way and flawless delivery to our Ameerpet lab!'
            }
        )

        # Create introductory notifications
        Notification.objects.get_or_create(
            user=commuter_user,
            title="Welcome to RoutePool!",
            message="Your daily corridor 'Khairatabad to Ameerpet' is active. Check 'Delivery Opportunities' to carry packages with minimal detour."
        )

        Notification.objects.get_or_create(
            user=vendor_user,
            title="Active Matches Found",
            message="Found 3 compatible commuter matches for your 'Microcontroller ICs' delivery package with under 0.8km detour."
        )

        self.stdout.write(self.style.SUCCESS("RoutePool demo dataset successfully populated!"))
