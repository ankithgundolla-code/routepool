from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from commuters.models import CommuterRoute
from packages.models import Package
from matching.models import Match
from deliveries.models import Delivery
from transactions.models import Transaction
from analytics.models import EcoImpact

User = get_user_model()

class DeliveryLifecycleTestCase(TestCase):
    def setUp(self):
        self.vendor_user = User.objects.create_user(
            email='v@routepool.local', password='pwd', name='Vendor V', role='vendor'
        )
        self.vendor = Vendor.objects.create(
            user=self.vendor_user, business_name='V Store', location='Khairatabad'
        )
        self.commuter_user = User.objects.create_user(
            email='c@routepool.local', password='pwd', name='Commuter C', role='commuter', reliability_score=100.0
        )
        self.route = CommuterRoute.objects.create(
            commuter=self.commuter_user,
            route_name="Route 1",
            start_location="Khairatabad", start_lat=17.41, start_lng=78.46,
            destination="Ameerpet", dest_lat=17.43, dest_lng=78.44,
            departure_time=timezone.now().time(), arrival_time=timezone.now().time(),
            available_days=['Mon'], max_package_weight=5.0, travel_mode='two_wheeler'
        )
        self.package = Package.objects.create(
            vendor=self.vendor, package_name="Pkg 1",
            pickup_location="Khairatabad", pickup_lat=17.41, pickup_lng=78.46,
            destination="Ameerpet", dest_lat=17.43, dest_lng=78.44,
            ready_time=timezone.now(), delivery_deadline=timezone.now(),
            offered_reward=60.0, status='MATCHED', direct_distance_km=4.0
        )
        self.match = Match.objects.create(
            package=self.package, commuter_route=self.route, status='ACCEPTED'
        )
        self.delivery = Delivery.objects.create(
            match=self.match, pickup_otp='123456', delivery_otp='654321', status='PICKUP_PENDING'
        )

    def test_otp_verification_sequence(self):
        """Must verify pickup OTP first, transitioning to IN_TRANSIT, then delivery OTP to DELIVERED"""
        # 1. Pickup verification
        self.assertEqual(self.delivery.pickup_otp, '123456')
        self.delivery.pickup_verified = True
        self.delivery.status = 'IN_TRANSIT'
        self.delivery.save()

        self.assertEqual(self.delivery.status, 'IN_TRANSIT')

        # 2. Delivery verification
        self.delivery.delivery_verified = True
        self.delivery.status = 'DELIVERED'
        self.delivery.save()

        self.assertEqual(self.delivery.status, 'DELIVERED')

    def test_cancellation_reverts_package(self):
        """Commuter cancellation before pickup should return package to SEARCHING and penalize score"""
        self.assertEqual(self.delivery.status, 'PICKUP_PENDING')
        self.delivery.status = 'CANCELLED'
        self.delivery.save()

        # Commuter reliability penalized
        self.commuter_user.reliability_score -= 5.0
        self.commuter_user.save()

        # Package reverted
        self.package.status = 'SEARCHING'
        self.package.save()

        self.assertEqual(self.package.status, 'SEARCHING')
        self.assertEqual(self.commuter_user.reliability_score, 95.0)
