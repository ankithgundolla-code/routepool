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

User = get_user_model()

class MinimumDetourAndMatchingTestCase(TestCase):
    def setUp(self):
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
        detour_res = calculate_detour(self.route_low_detour, self.package)
        self.assertIn('normal_distance', detour_res)
        self.assertIn('delivery_distance', detour_res)
        self.assertIn('additional_distance', detour_res)
        self.assertLessEqual(detour_res['additional_distance'], 0.5)

    def test_minimum_detour_preference(self):
        matches = MatchingService.find_and_record_matches(self.package)
        self.assertTrue(len(matches) >= 1)
        best_match = matches[0]
        self.assertEqual(best_match.commuter_route.id, self.route_low_detour.id)
        self.assertGreater(best_match.final_score, 80.0)

    def test_package_capacity_filter(self):
        heavy_package = Package.objects.create(
            vendor=self.vendor,
            package_name="Heavy Machinery Part",
            pickup_location="Khairatabad",
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination="Ameerpet",
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=15.0,
            size='large',
            ready_time=timezone.now(),
            delivery_deadline=timezone.now() + timedelta(hours=3),
            offered_reward=80.0,
            status='SEARCHING'
        )
        score = calculate_package_score(heavy_package, self.route_low_detour)
        self.assertEqual(score, 0.0)
