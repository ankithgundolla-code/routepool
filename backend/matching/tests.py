from datetime import time, timedelta, datetime
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from commuters.models import CommuterRoute
from packages.models import Package
from matching.models import Match
from matching.services import (
    calculate_detour,
    MatchingService,
    get_remaining_route_capacity,
    calculate_direction_and_overlap
)
from matching.scoring import (
    calculate_package_score,
    check_time_compatibility,
    calculate_match_score,
    calculate_detour_penalty,
    evaluate_hard_constraints
)
from deliveries.models import Delivery
from rest_framework.test import APIClient

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

        # Commuter 1: Khairatabad to Ameerpet (low detour)
        self.commuter1 = User.objects.create_user(
            email='commuter1@routepool.local',
            password='testpassword123',
            name='Commuter Low Detour',
            role='commuter',
            reliability_score=100.0
        )
        # Note: Set available_days across all 7 days for general test package
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
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=5.0,
            max_package_size='medium',
            max_detour=2.0,
            travel_mode='two_wheeler',
            is_active=True
        )

        # Commuter 2: Begumpet to Secunderabad (far detour)
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
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=2.0,
            max_package_size='small',
            max_detour=1.5,
            travel_mode='two_wheeler',
            is_active=True
        )

        # Package: Khairatabad to Ameerpet
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
            ready_time=now.replace(hour=8, minute=0, second=0, microsecond=0),
            delivery_deadline=now.replace(hour=11, minute=0, second=0, microsecond=0),
            offered_reward=50.0,
            status='SEARCHING'
        )

    def test_detour_calculation(self):
        """Detour calculation must return normal distance, delivery distance, and additional distance"""
        detour_res = calculate_detour(self.route_low_detour, self.package)
        self.assertIn('normal_distance', detour_res)
        self.assertIn('delivery_distance', detour_res)
        self.assertIn('additional_distance', detour_res)
        self.assertIn('is_road_distance_estimated', detour_res)
        self.assertTrue(detour_res['is_road_distance_estimated'])
        self.assertLessEqual(detour_res['additional_distance'], 0.5)

    def test_minimum_detour_preference(self):
        """Commuter with lower detour must rank significantly higher in score"""
        matches = MatchingService.find_and_record_matches(self.package)
        self.assertTrue(len(matches) >= 1)
        best_match = matches[0]
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
        """Commuter departing long before package is ready should fail schedule check"""
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
            ready_time=now.replace(hour=14, minute=0, second=0, microsecond=0), # Ready at 2:00 PM
            delivery_deadline=now.replace(hour=18, minute=0, second=0, microsecond=0),
            offered_reward=40.0,
            status='SEARCHING'
        )
        time_score = check_time_compatibility(late_package, self.route_low_detour)
        self.assertEqual(time_score, 0.0)

    def test_pooling_limit_enforcement(self):
        """A commuter route with 2 active deliveries cannot take a 3rd delivery"""
        m1 = Match.objects.create(
            package=self.package,
            commuter_route=self.route_low_detour,
            status='ACCEPTED',
            final_score=95.0
        )
        Delivery.objects.create(
            match=m1,
            pickup_otp='111111',
            delivery_otp='222222',
            status='PICKUP_PENDING'
        )

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
            ready_time=now.replace(hour=8, minute=0),
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
        Delivery.objects.create(
            match=m2,
            pickup_otp='333333',
            delivery_otp='444444',
            status='IN_TRANSIT'
        )

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
            ready_time=now.replace(hour=8, minute=0),
            delivery_deadline=now + timedelta(hours=3),
            offered_reward=40.0,
            status='SEARCHING'
        )
        matches = MatchingService.find_and_record_matches(pkg3)
        matched_routes = [m.commuter_route.id for m in matches]
        self.assertNotIn(self.route_low_detour.id, matched_routes)

    def test_wait_and_notify_fallback(self):
        """When no commuter is compatible, package remains SEARCHING and notification is recorded"""
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

    # =========================================================================
    # Phase 9: New Matching Engine Verification Tests (Scenarios 1 to 12)
    # =========================================================================

    def test_insufficient_remaining_weight_capacity(self):
        """Scenario 1: Route with max 5kg carries 4kg; new 2kg package must be rejected"""
        # Assign 4kg delivery to route_low_detour
        pkg_existing = Package.objects.create(
            vendor=self.vendor,
            package_name="4kg Existing Box",
            pickup_location="Khairatabad", pickup_lat=17.4116, pickup_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            weight=4.0, size='medium',
            ready_time=timezone.now(), delivery_deadline=timezone.now() + timedelta(hours=3),
            status='MATCHED'
        )
        m_existing = Match.objects.create(
            package=pkg_existing, commuter_route=self.route_low_detour, status='ACCEPTED'
        )
        Delivery.objects.create(
            match=m_existing, pickup_otp='123456', delivery_otp='654321', status='IN_TRANSIT'
        )

        remaining_cap = get_remaining_route_capacity(self.route_low_detour)
        self.assertEqual(remaining_cap, 1.0) # 5.0 - 4.0 = 1.0 kg remaining

        # New package is 2.0 kg
        pkg_new = Package.objects.create(
            vendor=self.vendor,
            package_name="2kg Parcel (Exceeds Remaining 1kg)",
            pickup_location="Khairatabad", pickup_lat=17.4116, pickup_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            weight=2.0, size='small',
            ready_time=timezone.now().replace(hour=8, minute=0),
            delivery_deadline=timezone.now().replace(hour=11, minute=0),
            status='SEARCHING'
        )

        res = evaluate_hard_constraints(
            package=pkg_new,
            commuter_route=self.route_low_detour,
            additional_detour=0.2,
            remaining_capacity=remaining_cap,
            active_deliveries_count=1,
            max_pooled_packages=2
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'INSUFFICIENT_WEIGHT_CAPACITY')
        self.assertIn("exceeds remaining vehicle capacity", res['reason'])

    def test_maximum_package_size_violation(self):
        """Scenario 2: Route with 'small' size limit must reject 'large' package"""
        # route_far has max_package_size='small'
        large_pkg = Package.objects.create(
            vendor=self.vendor,
            package_name="Large Equipment",
            pickup_location="Begumpet", pickup_lat=17.4448, pickup_lng=78.4664,
            destination="Secunderabad", dest_lat=17.4399, dest_lng=78.4983,
            weight=1.5, size='large',
            ready_time=timezone.now().replace(hour=8, minute=30),
            delivery_deadline=timezone.now().replace(hour=12, minute=0),
            status='SEARCHING'
        )
        res = evaluate_hard_constraints(
            package=large_pkg,
            commuter_route=self.route_far,
            additional_detour=0.2,
            remaining_capacity=2.0,
            active_deliveries_count=0,
            max_pooled_packages=2
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'SIZE_EXCEEDED')

    def test_pooling_limit_reached(self):
        """Scenario 3: Hard constraint gatekeeper rejects when active count == max_pooled"""
        res = evaluate_hard_constraints(
            package=self.package,
            commuter_route=self.route_low_detour,
            additional_detour=0.2,
            remaining_capacity=5.0,
            active_deliveries_count=2,
            max_pooled_packages=2
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'POOLING_LIMIT_REACHED')

    def test_unavailable_weekday(self):
        """Scenario 4: Commuter operating Mon-Fri must reject package on Sunday"""
        self.route_low_detour.available_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        self.route_low_detour.save()

        # Date for a Sunday: 2026-11-08 is a Sunday
        sunday_dt = timezone.make_aware(datetime(2026, 11, 8, 8, 0, 0))
        sunday_pkg = Package.objects.create(
            vendor=self.vendor,
            package_name="Sunday Dispatch",
            pickup_location="Khairatabad", pickup_lat=17.4116, pickup_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            weight=1.0, size='small',
            ready_time=sunday_dt,
            delivery_deadline=sunday_dt + timedelta(hours=3),
            status='SEARCHING'
        )
        res = evaluate_hard_constraints(
            package=sunday_pkg,
            commuter_route=self.route_low_detour,
            additional_detour=0.2,
            remaining_capacity=5.0,
            active_deliveries_count=0,
            max_pooled_packages=2
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'DAY_MISMATCH')
        self.assertIn("Sun", res['reason'])

    def test_delivery_deadline_violation(self):
        """Scenario 5: Commuter arriving after delivery deadline must be rejected"""
        # Commuter departs 8:30, arrival ~9:15. Package deadline is 8:40 AM!
        now = timezone.now()
        tight_deadline_pkg = Package.objects.create(
            vendor=self.vendor,
            package_name="Impossible Deadline Box",
            pickup_location="Khairatabad", pickup_lat=17.4116, pickup_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            weight=1.0, size='small',
            ready_time=now.replace(hour=8, minute=0),
            delivery_deadline=now.replace(hour=8, minute=35), # Deadline before commuter can reach drop-off!
            status='SEARCHING'
        )
        res = evaluate_hard_constraints(
            package=tight_deadline_pkg,
            commuter_route=self.route_low_detour,
            additional_detour=0.2,
            remaining_capacity=5.0,
            active_deliveries_count=0,
            max_pooled_packages=2,
            start_to_pickup_km=0.5,
            delivery_journey_km=5.0 # ~12 mins travel, arrives ~8:42 after 8:35 deadline!
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'DEADLINE_VIOLATION')

    def test_package_not_ready_for_pickup(self):
        """Scenario 6: Commuter arriving before package is ready must be rejected"""
        now = timezone.now()
        # Commuter departs 8:30 AM, arrives at pickup ~8:35 AM. Package ready at 10:30 AM!
        future_pkg = Package.objects.create(
            vendor=self.vendor,
            package_name="Afternoon Ready Parcel",
            pickup_location="Khairatabad", pickup_lat=17.4116, pickup_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            weight=1.0, size='small',
            ready_time=now.replace(hour=10, minute=30),
            delivery_deadline=now.replace(hour=14, minute=0),
            status='SEARCHING'
        )
        res = evaluate_hard_constraints(
            package=future_pkg,
            commuter_route=self.route_low_detour,
            additional_detour=0.2,
            remaining_capacity=5.0,
            active_deliveries_count=0,
            max_pooled_packages=2,
            start_to_pickup_km=0.5,
            delivery_journey_km=5.0
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'NOT_READY_FOR_PICKUP')

    def test_excessive_detour(self):
        """Scenario 7: Detour exceeding commuter max_detour must be rejected"""
        res = evaluate_hard_constraints(
            package=self.package,
            commuter_route=self.route_low_detour,
            additional_detour=3.5, # Exceeds max_detour 2.0 km
            remaining_capacity=5.0,
            active_deliveries_count=0,
            max_pooled_packages=2
        )
        self.assertFalse(res['is_eligible'])
        self.assertEqual(res['code'], 'DETOUR_EXCEEDED')

    def test_same_direction_route_compatibility(self):
        """Scenario 8: Same-direction route returns high overlap and positive cosine"""
        # Route: Khairatabad (17.4116, 78.4611) -> Ameerpet (17.4375, 78.4482)
        route_pts = [(17.4116, 78.4611), (17.4375, 78.4482)]
        # Package inside same corridor: Somajiguda (17.4260, 78.4590) -> Punjagutta (17.4265, 78.4526)
        dir_res = calculate_direction_and_overlap(
            route_pts,
            p_pick=(17.4200, 78.4580),
            p_dest=(17.4350, 78.4500)
        )
        self.assertGreater(dir_res['direction_cosine'], 0.5)
        self.assertFalse(dir_res['is_opposite_direction'])
        self.assertTrue(dir_res['overlap_available'])
        self.assertGreater(dir_res['route_overlap_percentage'], 40.0)

    def test_opposite_direction_route_compatibility(self):
        """Scenario 9: Opposite-direction route returns zero overlap and negative cosine"""
        # Route goes South to North: Khairatabad -> Ameerpet
        route_pts = [(17.4116, 78.4611), (17.4375, 78.4482)]
        # Package goes North to South: Ameerpet -> Khairatabad
        dir_res = calculate_direction_and_overlap(
            route_pts,
            p_pick=(17.4375, 78.4482),
            p_dest=(17.4116, 78.4611)
        )
        self.assertLess(dir_res['direction_cosine'], -0.5)
        self.assertTrue(dir_res['is_opposite_direction'])
        self.assertEqual(dir_res['route_overlap_percentage'], 0.0)

    def test_waypoint_preservation(self):
        """Scenario 10: Intermediate waypoints are preserved in delivery journey distance"""
        route_with_wps = CommuterRoute.objects.create(
            commuter=self.commuter1,
            route_name="Route with Intermediate Stops",
            start_location="Khairatabad", start_lat=17.4116, start_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            intermediate_points=[
                {'name': 'Punjagutta', 'lat': 17.4265, 'lng': 78.4526},
                {'name': 'SR Nagar', 'lat': 17.4428, 'lng': 78.4481}
            ],
            departure_time=time(8, 30), arrival_time=time(9, 30),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=5.0, travel_mode='two_wheeler', max_detour=3.0,
            is_active=True
        )
        detour_res = calculate_detour(route_with_wps, self.package)
        self.assertIn('normal_distance', detour_res)
        self.assertIn('delivery_distance', detour_res)
        # Normal distance must include the intermediate waypoints (> direct distance)
        self.assertGreater(detour_res['normal_distance'], 3.5)
        # Delivery journey must be >= normal distance
        self.assertGreaterEqual(detour_res['delivery_distance'], detour_res['normal_distance'])

    def test_correct_candidate_ranking(self):
        """Scenario 11: Correct candidate ranking based on classification, score desc, detour asc"""
        # Create third commuter with very close route and higher reliability
        commuter3 = User.objects.create_user(
            email='commuter3@routepool.local', password='pwd', name='Commuter Top Star',
            role='commuter', reliability_score=100.0
        )
        route_optimal = CommuterRoute.objects.create(
            commuter=commuter3,
            route_name="Direct Corridor",
            start_location="Khairatabad", start_lat=17.4116, start_lng=78.4611,
            destination="Ameerpet", dest_lat=17.4375, dest_lng=78.4482,
            departure_time=time(8, 30), arrival_time=time(9, 10),
            available_days=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            max_package_weight=6.0, travel_mode='two_wheeler', max_detour=1.5,
            is_active=True
        )

        matches = MatchingService.find_and_record_matches(self.package)
        self.assertGreaterEqual(len(matches), 1)

        # Check ranking assignment
        for i, m in enumerate(matches):
            self.assertEqual(m.rank, i + 1)

        # Ensure top match has highest compatibility score or exact classification
        self.assertIn(matches[0].match_level, ['EXACT', 'NEARBY'])
        if len(matches) > 1:
            self.assertGreaterEqual(matches[0].final_score, matches[1].final_score)

    def test_commuter_opportunities_and_lifecycle(self):
        """Phase 1: Real-time Commuter Opportunities Verification"""
        client = APIClient()

        # 1. Unauthenticated request must be denied
        res = client.get('/api/matching/commuter/opportunities/')
        self.assertEqual(res.status_code, 401)

        # 2. Authenticated commuter without matches initially gets empty opportunities
        client.force_authenticate(user=self.commuter1)
        res = client.get('/api/matching/commuter/opportunities/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['routes_count'], 1)

        # 3. Newly created package immediately triggers matching and appears for commuter1
        client_vendor = APIClient()
        client_vendor.force_authenticate(user=self.vendor_user)
        today = timezone.now().date()
        ready_time = timezone.make_aware(datetime.combine(today, time(8, 0)))
        delivery_deadline = timezone.make_aware(datetime.combine(today, time(14, 0)))
        create_res = client_vendor.post('/api/packages/', {
            'package_name': 'Instant Match Medical Supplies',
            'pickup_location': 'Khairatabad Circle',
            'pickup_lat': 17.4116,
            'pickup_lng': 78.4611,
            'destination': 'Ameerpet Market',
            'dest_lat': 17.4375,
            'dest_lng': 78.4482,
            'weight': 1.5,
            'size': 'small',
            'ready_time': ready_time.isoformat(),
            'delivery_deadline': delivery_deadline.isoformat(),
            'offered_reward': 220.0
        }, format='json')
        self.assertEqual(create_res.status_code, 201)
        pkg_id = create_res.data['id']

        # Confirm match was automatically created in DB
        matches = Match.objects.filter(package_id=pkg_id, commuter_route=self.route_low_detour)
        self.assertEqual(matches.count(), 1)
        match_obj = matches.first()
        self.assertEqual(match_obj.status, 'PROPOSED')

        # Commuter opportunities endpoint now returns the new opportunity
        opp_res = client.get('/api/matching/commuter/opportunities/')
        self.assertEqual(opp_res.status_code, 200)
        opp_ids = [o['id'] for o in opp_res.data['opportunities']]
        self.assertIn(match_obj.id, opp_ids)

        # Commuter cannot see other commuter's opportunities
        client_c2 = APIClient()
        client_c2.force_authenticate(user=self.commuter2)
        res_c2 = client_c2.get('/api/matching/commuter/opportunities/')
        self.assertEqual(res_c2.status_code, 200)
        c2_opp_ids = [o['id'] for o in res_c2.data['opportunities']]
        self.assertNotIn(match_obj.id, c2_opp_ids)

        # 4. Repeated evaluation does not duplicate Match records
        pkg = Package.objects.get(id=pkg_id)
        MatchingService.find_and_record_matches(pkg)
        self.assertEqual(Match.objects.filter(package_id=pkg_id, commuter_route=self.route_low_detour).count(), 1)

        # 5. When accepted, opportunity immediately disappears from commuter opportunities
        accept_res = client.post(f'/api/matching/match/{match_obj.id}/accept/')
        self.assertEqual(accept_res.status_code, 200)

        # Check opportunities again - accepted match must NOT appear
        opp_res_after = client.get('/api/matching/commuter/opportunities/')
        self.assertEqual(opp_res_after.status_code, 200)
        opp_ids_after = [o['id'] for o in opp_res_after.data['opportunities']]
        self.assertNotIn(match_obj.id, opp_ids_after)

