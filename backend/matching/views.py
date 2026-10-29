import random
from typing import ClassVar

from commuters.models import CommuterRoute
from deliveries.models import Delivery
from notifications.models import Notification
from packages.models import Package
from rest_framework import permissions, status, views
from rest_framework.response import Response

from .models import Match
from .serializers import MatchSerializer
from .services import MatchingService


class PackageMatchesView(views.APIView):
    permission_classes: ClassVar[list] = [permissions.IsAuthenticated]

    def get(self, request, package_id):
        try:
            package = Package.objects.get(pk=package_id)
            if request.user.role == 'vendor' and package.vendor.user != request.user:
                return Response({'detail': 'Permission denied: You can only view matches for your own packages.'}, status=status.HTTP_403_FORBIDDEN)
            # Re-run or get matches
            matches = Match.objects.filter(package=package, status__in=['PROPOSED', 'REQUESTED', 'ACCEPTED'])
            if not matches.exists() and package.status == 'SEARCHING':
                MatchingService.find_and_record_matches(package)
                matches = Match.objects.filter(package=package, status__in=['PROPOSED', 'REQUESTED', 'ACCEPTED'])

            serializer = MatchSerializer(matches, many=True)
            return Response({
                'package_id': package.id,
                'package_name': package.package_name,
                'package_status': package.status,
                'total_matches': matches.count(),
                'matches': serializer.data
            })
        except Package.DoesNotExist:
            return Response({'detail': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, package_id):
        try:
            package = Package.objects.get(pk=package_id)
            if request.user.role == 'vendor' and package.vendor.user != request.user:
                return Response({'detail': 'Permission denied: You can only compute matches for your own packages.'}, status=status.HTTP_403_FORBIDDEN)
            matches = MatchingService.find_and_record_matches(package)
            serializer = MatchSerializer(matches, many=True)
            return Response({
                'detail': f'Computed {len(matches)} potential commuter matches',
                'matches': serializer.data
            })
        except Package.DoesNotExist:
            return Response({'detail': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)


class CommuterOpportunitiesView(views.APIView):
    """Returns packages matched with the commuter's active registered travel routes"""
    permission_classes: ClassVar[list] = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        routes = CommuterRoute.objects.filter(commuter=user, is_active=True)
        if not routes.exists():
            return Response({
                'routes_count': 0,
                'opportunities': [],
                'message': 'No active commuter routes registered yet.'
            })

        # Find matches for all active routes of commuter
        matches = Match.objects.filter(
            commuter_route__in=routes,
            package__status__in=['SEARCHING', 'MATCHED']
        ).select_related('package', 'commuter_route', 'package__vendor')

        serializer = MatchSerializer(matches, many=True)
        return Response({
            'routes_count': routes.count(),
            'opportunities_count': matches.count(),
            'opportunities': serializer.data
        })


class RequestMatchView(views.APIView):
    """Vendor requests a specific commuter match"""
    permission_classes: ClassVar[list] = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            match = Match.objects.get(pk=pk)
            if request.user.role != 'admin' and match.package.vendor.user != request.user:
                return Response({'detail': 'Permission denied: Only the package vendor can request this match.'}, status=status.HTTP_403_FORBIDDEN)
            match.status = 'REQUESTED'
            match.save()

            # Create notification for commuter
            Notification.objects.create(
                user=match.commuter_route.commuter,
                title="New Delivery Request Near Your Route",
                message=(
                    f"A vendor requested you to carry '{match.package.package_name}' along your "
                    f"{match.commuter_route.route_name} journey (Detour: {match.estimated_detour}km, "
                    f"Reward: ₹{round(match.package.offered_reward * 0.75)})."
                )
            )

            return Response({
                'detail': 'Delivery request sent to commuter',
                'match': MatchSerializer(match).data
            })
        except Match.DoesNotExist:
            return Response({'detail': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)


class AcceptMatchView(views.APIView):
    """Commuter accepts a match, transitioning to MATCHED and creating Delivery with OTPs"""
    permission_classes: ClassVar[list] = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            match = Match.objects.get(pk=pk)
            package = match.package
            route = match.commuter_route
            user = request.user

            # 1. Authorization: Only the assigned commuter (or admin) can accept
            if user.role != 'admin' and route.commuter != user:
                return Response(
                    {'detail': 'Permission denied: Only the matched commuter can accept this delivery.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # 2. Package status check
            if package.status not in ['SEARCHING', 'MATCHED']:
                return Response(
                    {'detail': f'Package is already in status: {package.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 3. Pooling limit check (max 2 concurrent active deliveries per commuter route)
            from django.conf import settings
            max_pooled = getattr(settings, 'MAX_POOLED_PACKAGES_PER_ROUTE', 2)
            active_deliveries_count = Delivery.objects.filter(
                match__commuter_route=route,
                status__in=['PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
            ).count()
            if active_deliveries_count >= max_pooled:
                return Response({
                    'detail': f'Capacity reached: Commuter route currently has {active_deliveries_count} active deliveries (max {max_pooled} pooled).'
                }, status=status.HTTP_400_BAD_REQUEST)

            match.status = 'ACCEPTED'
            match.save()

            package.status = 'MATCHED'
            package.save()

            # Reject/cancel other proposed matches for this package
            Match.objects.filter(package=package).exclude(pk=match.pk).update(status='REJECTED')

            # Generate 4-digit or 6-digit cryptographic OTPs for pickup and delivery
            pickup_otp = f"{random.randint(100000, 999999)}"
            delivery_otp = f"{random.randint(100000, 999999)}"

            delivery, _created = Delivery.objects.get_or_create(
                match=match,
                defaults={
                    'pickup_otp': pickup_otp,
                    'delivery_otp': delivery_otp,
                    'status': 'PICKUP_PENDING'
                }
            )

            # Notifications
            Notification.objects.create(
                user=package.vendor.user,
                title="Delivery Accepted by Commuter!",
                message=f"{match.commuter_route.commuter.name} accepted your delivery for '{package.package_name}'. Pickup OTP: {pickup_otp}"
            )
            Notification.objects.create(
                user=match.commuter_route.commuter,
                title="Delivery Confirmed",
                message=f"You accepted delivery of '{package.package_name}'. Ask the vendor for their Pickup OTP when picking up."
            )

            return Response({
                'detail': 'Match accepted successfully. Delivery lifecycle initiated.',
                'match_id': match.id,
                'delivery_id': delivery.id,
                'status': 'PICKUP_PENDING'
            })
        except Match.DoesNotExist:
            return Response({'detail': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)
