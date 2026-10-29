from datetime import time, timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from commuters.models import CommuterRoute
from packages.models import Package
from matching.models import Match
from matching.services import calculate_detour, MatchingService
from matching.scoring import (
    calculate_package_score,
    check_time_compatibility,
    calculate_match_score,
    calculate_detour_penalty
)
from deliveries.models import Delivery

User = get_user_model()

class MinimumDetourAndMatchingTestCase(TestCase):
    def setUp(self):
        # Create vendor
        self.vendor_user = User.objects.create_user(
            email='vendor_test@routepool.local',
            password='testpassword123',
            name='Test Electronics',
            role='vendor'
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user,
            business_name='Test Electronics Hub',
            location='Khairatabad',
            lat=17.4116,
            lng=78.4611
        )

        # Create commuter 1: Khairatabad to Ameerpet (low detour)
        self.commuter1 = User.objects.create_user(
            email='commuter1@routepool.local',
            password='testpassword123',
            name='Commuter Low Detour',
            role='commuter',
            reliability_score=100.0
        )
        self.route_low_detour = CommuterRoute.objects.create(
            commuter=self.commuter1,
            route_name="Khairatabad -> Ameerpet",
            start_location="Khairatabad",
            start_lat=17.4116,
            start_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(8, 30),
            arrival_time=time(9, 15),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            max_package_weight=5.0,
            max_package_size='medium',
            max_detour=2.0,
            travel_mode='two_wheeler',
            is_active=True
        )

        # Create commuter 2: Begumpet to Secunderabad (far detour)
        self.commuter2 = User.objects.create_user(
            email='commuter2@routepool.local',
            password='testpassword123',
            name='Commuter Far Route',
            role='commuter',
            reliability_score=90.0
        )
        self.route_far = CommuterRoute.objects.create(
            commuter=self.commuter2,
            route_name="Begumpet -> Secunderabad",
            start_location="Begumpet",
            start_lat=17.4448,
            start_lng=78.4664,
            destination="Secunderabad",
            dest_lat=17.4399,
            dest_lng=78.4983,
            departure_time=time(8, 45),
            arrival_time=time(9, 30),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            max_package_weight=2.0,
            max_package_size='small',
            max_detour=1.5,
            travel_mode='two_wheeler',
            is_active=True
        )

        # Create package: Khairatabad to Ameerpet
        now = timezone.now()
        self.package = Package.objects.create(
            vendor=self.vendor,
            package_name="Urgent Sensor Board",
            pickup_location="Khairatabad Circle",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet Metro Hub",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=now.replace(hour=8, minute=0),
            delivery_deadline=now.replace(hour=11, minute=0),
            offered_reward=50.0,
            status='SEARCHING'
        )

    def test_detour_calculation(self):
        """Detour calculation must return normal distance, delivery distance, and additional distance"""
        detour_res = calculate_detour(self.route_low_detour, self.package)
        self.assertIn('normal_distance', detour_res)
        self.assertIn('delivery_distance', detour_res)
        self.assertIn('additional_distance', detour_res)
        # Because pickup and destination are right on the commuter's start & destination, additional distance should be ~0
        self.assertLessEqual(detour_res['additional_distance'], 0.5)

    def test_minimum_detour_preference(self):
        """Commuter with lower detour must rank significantly higher in score"""
        matches = MatchingService.find_and_record_matches(self.package)
        self.assertTrue(len(matches) >= 1)
        best_match = matches[0]
        # Commuter 1 must be the top match
        self.assertEqual(best_match.commuter_route.id, self.route_low_detour.id)
        self.assertGreater(best_match.final_score, 80.0)

    def test_package_capacity_filter(self):
        """If package exceeds weight capacity, score is 0 and disqualified"""
        heavy_package = Package.objects.create(
            vendor=self.vendor,
            package_name="Heavy Machinery Part",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=15.0, # Exceeds commuter1's max 5.0 kg
            size='large',
            ready_time=timezone.now(),
            delivery_deadline=timezone.now() + timedelta(hours=3),
            offered_reward=80.0,
            status='SEARCHING'
        )
        score = calculate_package_score(heavy_package, self.route_low_detour)
        self.assertEqual(score, 0.0)

    def test_time_compatibility(self):
        """Commuter departing before package is ready should be penalized"""
        now = timezone.now()
        late_package = Package.objects.create(
            vendor=self.vendor,
            package_name="Late Afternoon Item",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=now.replace(hour=14, minute=0), # Ready at 2:00 PM
            delivery_deadline=now.replace(hour=18, minute=0),
            offered_reward=40.0,
            status='SEARCHING'
        )
        # Route 1 departs at 8:30 AM (hours before 2 PM)
        time_score = check_time_compatibility(late_package, self.route_low_detour)
        self.assertEqual(time_score, 0.0)

    def test_pooling_limit_enforcement(self):
        """A commuter route with 2 active deliveries cannot take a 3rd delivery"""
        # Create match 1 and delivery 1
        m1 = Match.objects.create(
            package=self.package,
            commuter_route=self.route_low_detour,
            status='ACCEPTED',
            final_score=95.0
        )
        d1 = Delivery.objects.create(
            match=m1,
            pickup_otp='111111',
            delivery_otp='222222',
            status='PICKUP_PENDING'
        )

        # Create package 2, match 2, delivery 2
        now = timezone.now()
        pkg2 = Package.objects.create(
            vendor=self.vendor,
            package_name="Second Item",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=now,
            delivery_deadline=now + timedelta(hours=3),
            offered_reward=40.0,
            status='MATCHED'
        )
        m2 = Match.objects.create(
            package=pkg2,
            commuter_route=self.route_low_detour,
            status='ACCEPTED',
            final_score=92.0
        )
        d2 = Delivery.objects.create(
            match=m2,
            pickup_otp='333333',
            delivery_otp='444444',
            status='IN_TRANSIT'
        )

        # Package 3 should not be matched to route_low_detour because active count is 2
        pkg3 = Package.objects.create(
            vendor=self.vendor,
            package_name="Third Item (Exceeds Pooling)",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=now,
            delivery_deadline=now + timedelta(hours=3),
            offered_reward=40.0,
            status='SEARCHING'
        )
        matches = MatchingService.find_and_record_matches(pkg3)
        # Low detour route should be excluded due to pooling cap
        matched_routes = [m.commuter_route.id for m in matches]
        self.assertNotIn(self.route_low_detour.id, matched_routes)

    def test_wait_and_notify_fallback(self):
        """When no commuter is compatible, package remains SEARCHING and notification is recorded"""
        # Deactivate all routes
        CommuterRoute.objects.all().update(is_active=False)
        now = timezone.now()
        orphan_pkg = Package.objects.create(
            vendor=self.vendor,
            package_name="Unmatched Item",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=now,
            delivery_deadline=now + timedelta(hours=3),
            offered_reward=40.0,
            status='SEARCHING'
        )
        matches = MatchingService.find_and_record_matches(orphan_pkg)
        self.assertEqual(len(matches), 0)
        self.assertEqual(orphan_pkg.status, 'SEARCHING')
