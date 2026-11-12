from datetime import time, timedelta, datetime
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from vendors.models import Vendor
from commuters.models import CommuterRoute
from packages.models import Package
from matching.models import Match
from deliveries.models import Delivery
from matching.scoring import evaluate_schedule_feasibility

User = get_user_model()


class P0SystemRepairVerificationTests(TestCase):
    def setUp(self):
        # 1. Vendor A
        self.vendor_a_user = User.objects.create_user(
            email='vendor_a@test.local',
            password='Password123!',
            name='Vendor Alpha',
            role='vendor'
        )
        self.vendor_a = Vendor.objects.create(
            user=self.vendor_a_user,
            business_name='Alpha Electronics',
            location='Khairatabad',
            lat=17.4116,
            lng=78.4611
        )

        # 2. Vendor B
        self.vendor_b_user = User.objects.create_user(
            email='vendor_b@test.local',
            password='Password123!',
            name='Vendor Beta',
            role='vendor'
        )
        self.vendor_b = Vendor.objects.create(
            user=self.vendor_b_user,
            business_name='Beta Hardware',
            location='Secunderabad',
            lat=17.4399,
            lng=78.4983
        )

        # 3. Commuter C
        self.commuter_user = User.objects.create_user(
            email='commuter_c@test.local',
            password='Password123!',
            name='Commuter Charlie',
            role='commuter',
            reliability_score=95.0
        )

        # 4. Admin User
        self.admin_user = User.objects.create_user(
            email='admin@test.local',
            password='Password123!',
            name='Admin User',
            role='admin',
            is_staff=True
        )

        # Packages
        now = timezone.now()
        self.pkg_a = Package.objects.create(
            vendor=self.vendor_a,
            package_name='Alpha Parcel',
            pickup_location='Khairatabad Circle',
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination='Ameerpet Metro',
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=2.0,
            size='small',
            ready_time=now,
            delivery_deadline=now + timedelta(days=2),
            status='SEARCHING'
        )

        self.pkg_b = Package.objects.create(
            vendor=self.vendor_b,
            package_name='Beta Parcel',
            pickup_location='Secunderabad Clock Tower',
            pickup_lat=17.4399,
            pickup_lng=78.4983,
            destination='Begumpet Airport Road',
            dest_lat=17.4447,
            dest_lng=78.4664,
            weight=3.0,
            size='medium',
            ready_time=now,
            delivery_deadline=now + timedelta(days=2),
            status='SEARCHING'
        )

    # Test 1: Vendor A cannot view Vendor B packages (GET /api/packages/)
    def test_01_vendor_a_cannot_view_vendor_b_packages(self):
        client = APIClient()
        client.force_authenticate(user=self.vendor_a_user)
        response = client.get('/api/packages/')
        self.assertEqual(response.status_code, 200)

        package_ids = [p['id'] for p in response.data]
        self.assertIn(self.pkg_a.id, package_ids)
        self.assertNotIn(self.pkg_b.id, package_ids)

    # Test 2: Commuter receives HTTP 403 on GET /api/packages/
    def test_02_commuter_receives_403_on_packages_list(self):
        client = APIClient()
        client.force_authenticate(user=self.commuter_user)
        response = client.get('/api/packages/')
        self.assertEqual(response.status_code, 403)

    # Test 3: Admin receives all packages on GET /api/packages/
    def test_03_admin_receives_all_packages(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_user)
        response = client.get('/api/packages/')
        self.assertEqual(response.status_code, 200)

        package_ids = [p['id'] for p in response.data]
        self.assertIn(self.pkg_a.id, package_ids)
        self.assertIn(self.pkg_b.id, package_ids)

    # Test 4: Commuter cannot read pickup_otp or delivery_otp before verification
    def test_04_commuter_cannot_read_otps_before_verification(self):
        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Office Commute',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(9, 0),
            arrival_time=time(9, 45),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=5.0,
            max_package_size='medium',
            max_detour=2.0
        )
        match = Match.objects.create(
            package=self.pkg_a,
            commuter_route=route,
            status='ACCEPTED'
        )
        delivery = Delivery.objects.create(
            match=match,
            status='PICKUP_PENDING',
            pickup_otp='123456',
            delivery_otp='654321',
            pickup_verified=False,
            delivery_verified=False
        )

        client = APIClient()
        client.force_authenticate(user=self.commuter_user)
        response = client.get(f'/api/deliveries/{delivery.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data.get('pickup_otp'))
        self.assertIsNone(response.data.get('delivery_otp'))

    # Test 5: Vendor can read pickup_otp
    def test_05_vendor_can_read_pickup_otp(self):
        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Office Commute',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(9, 0),
            arrival_time=time(9, 45),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=5.0,
            max_package_size='medium',
            max_detour=2.0
        )
        match = Match.objects.create(
            package=self.pkg_a,
            commuter_route=route,
            status='ACCEPTED'
        )
        delivery = Delivery.objects.create(
            match=match,
            status='PICKUP_PENDING',
            pickup_otp='123456',
            delivery_otp='654321',
            pickup_verified=False,
            delivery_verified=False
        )

        client = APIClient()
        client.force_authenticate(user=self.vendor_a_user)
        response = client.get(f'/api/deliveries/{delivery.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get('pickup_otp'), '123456')

    # Test 6: Schedule feasibility matches same-day future departure
    def test_06_schedule_feasibility_matches_same_day_future_departure(self):
        today = timezone.now().date()
        day_abbr = today.strftime('%a')
        ready = timezone.make_aware(datetime.combine(today, time(8, 0)))
        deadline = timezone.make_aware(datetime.combine(today, time(14, 0)))

        pkg = Package.objects.create(
            vendor=self.vendor_a,
            package_name='Morning Delivery',
            pickup_location='Khairatabad',
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=ready,
            delivery_deadline=deadline,
            status='SEARCHING'
        )

        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Morning Commute',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(9, 0),
            arrival_time=time(9, 45),
            available_days=[day_abbr],
            max_package_weight=5.0,
            max_detour=2.0
        )

        res = evaluate_schedule_feasibility(
            package=pkg,
            commuter_route=route,
            start_to_pickup_km=1.0,
            delivery_journey_km=5.0
        )
        self.assertTrue(res['is_feasible'])
        self.assertIsNone(res['reason'])

    # Test 7: Schedule feasibility matches next scheduled day when today's departure has passed
    def test_07_schedule_feasibility_matches_next_day_when_today_passed(self):
        today = timezone.now().date()
        ready = timezone.make_aware(datetime.combine(today, time(11, 0)))
        deadline = timezone.make_aware(datetime.combine(today + timedelta(days=2), time(18, 0)))

        pkg = Package.objects.create(
            vendor=self.vendor_a,
            package_name='Next Day Delivery',
            pickup_location='Khairatabad',
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=ready,
            delivery_deadline=deadline,
            status='SEARCHING'
        )

        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Daily Routine',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(8, 30),
            arrival_time=time(9, 15),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=5.0,
            max_detour=2.0
        )

        res = evaluate_schedule_feasibility(
            package=pkg,
            commuter_route=route,
            start_to_pickup_km=1.0,
            delivery_journey_km=5.0
        )
        self.assertTrue(res['is_feasible'])

    # Test 8: Schedule feasibility matches across weekend when route includes weekend days
    def test_08_schedule_feasibility_matches_across_weekend(self):
        today = timezone.now().date()
        # Find next Saturday
        days_ahead = 5 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_saturday = today + timedelta(days=days_ahead)
        next_sunday = next_saturday + timedelta(days=1)

        ready = timezone.make_aware(datetime.combine(next_saturday, time(9, 0)))
        deadline = timezone.make_aware(datetime.combine(next_sunday, time(18, 0)))

        pkg = Package.objects.create(
            vendor=self.vendor_a,
            package_name='Weekend Delivery',
            pickup_location='Khairatabad',
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=ready,
            delivery_deadline=deadline,
            status='SEARCHING'
        )

        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Weekend Routine',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(10, 0),
            arrival_time=time(10, 45),
            available_days=['Sat', 'Sun'],
            max_package_weight=5.0,
            max_detour=2.0
        )

        res = evaluate_schedule_feasibility(
            package=pkg,
            commuter_route=route,
            start_to_pickup_km=1.0,
            delivery_journey_km=5.0
        )
        self.assertTrue(res['is_feasible'])

    # Test 9: Schedule feasibility flags DEADLINE_VIOLATION when dropoff exceeds deadline
    def test_09_schedule_feasibility_flags_deadline_violation(self):
        today = timezone.now().date()
        day_abbr = today.strftime('%a')
        ready = timezone.make_aware(datetime.combine(today, time(8, 0)))
        # Deadline is 09:10, but route departure is 09:00 and arrival is 09:45
        deadline = timezone.make_aware(datetime.combine(today, time(9, 10)))

        pkg = Package.objects.create(
            vendor=self.vendor_a,
            package_name='Tight Deadline Delivery',
            pickup_location='Khairatabad',
            pickup_lat=17.4116,
            pickup_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            weight=1.0,
            size='small',
            ready_time=ready,
            delivery_deadline=deadline,
            status='SEARCHING'
        )

        route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name='Late Arrival Route',
            start_location='Khairatabad',
            start_lat=17.4116,
            start_lng=78.4611,
            destination='Ameerpet',
            dest_lat=17.4375,
            dest_lng=78.4482,
            departure_time=time(9, 0),
            arrival_time=time(9, 45),
            available_days=[day_abbr],
            max_package_weight=5.0,
            max_detour=2.0
        )

        res = evaluate_schedule_feasibility(
            package=pkg,
            commuter_route=route,
            start_to_pickup_km=1.0,
            delivery_journey_km=10.0
        )
        self.assertFalse(res['is_feasible'])
        self.assertEqual(res['code'], 'DEADLINE_VIOLATION')

    # Test 10: Commuter route creation triggers auto-matching on active searching packages without duplicates
    def test_10_commuter_route_creation_triggers_auto_matching(self):
        client = APIClient()
        client.force_authenticate(user=self.commuter_user)

        # Route matching pkg_a (Khairatabad -> Ameerpet)
        with self.captureOnCommitCallbacks(execute=True):
            res = client.post('/api/commuters/routes/', {
                'route_name': 'Khairatabad Corridor',
                'start_location': 'Khairatabad Metro Station',
                'start_lat': 17.4116,
                'start_lng': 78.4611,
                'destination': 'Ameerpet Commercial Complex',
                'dest_lat': 17.4375,
                'dest_lng': 78.4482,
                'departure_time': '08:30',
                'arrival_time': '09:15',
                'available_days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                'max_package_weight': 5.0,
                'max_package_size': 'medium',
                'max_detour': 2.0,
                'travel_mode': 'two_wheeler'
            }, format='json')

        self.assertEqual(res.status_code, 201)
        created_route_id = res.data['id']

        # Verify that pkg_a was matched with this new route
        matches = Match.objects.filter(package=self.pkg_a, commuter_route_id=created_route_id)
        self.assertEqual(matches.count(), 1)
        self.assertEqual(matches.first().status, 'PROPOSED')
