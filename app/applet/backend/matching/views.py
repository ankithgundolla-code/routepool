import random
from rest_framework import views, permissions, status
from rest_framework.response import Response
from .models import Match
from .serializers import MatchSerializer
from .services import MatchingService
from packages.models import Package
from commuters.models import CommuterRoute
from deliveries.models import Delivery
from notifications.models import Notification

class PackageMatchesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, package_id):
        try:
            package = Package.objects.get(pk=package_id)
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
            matches = MatchingService.find_and_record_matches(package)
            serializer = MatchSerializer(matches, many=True)
            return Response({
                'detail': f'Computed {len(matches)} potential commuter matches',
                'matches': serializer.data
            })
        except Package.DoesNotExist:
            return Response({'detail': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)

class CommuterOpportunitiesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        routes = CommuterRoute.objects.filter(commuter=user, is_active=True)
        if not routes.exists():
            return Response({
                'routes_count': 0,
                'opportunities': [],
                'message': 'No active commuter routes registered yet.'
            })

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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            match = Match.objects.get(pk=pk)
            match.status = 'REQUESTED'
            match.save()

            Notification.objects.create(
                user=match.commuter_route.commuter,
                title="New Delivery Request Near Your Route",
                message=f"A vendor requested you to carry '{match.package.package_name}' along your {match.commuter_route.route_name} journey (Detour: {match.estimated_detour}km, Reward: ₹{round(match.package.offered_reward * 0.75)})."
            )

            return Response({
                'detail': 'Delivery request sent to commuter',
                'match': MatchSerializer(match).data
            })
        except Match.DoesNotExist:
            return Response({'detail': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)

class AcceptMatchView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            match = Match.objects.get(pk=pk)
            package = match.package

            if package.status not in ['SEARCHING', 'MATCHED']:
                return Response({'detail': f'Package is already in status: {package.status}'}, status=status.HTTP_400_BAD_REQUEST)

            match.status = 'ACCEPTED'
            match.save()

            package.status = 'MATCHED'
            package.save()

            Match.objects.filter(package=package).exclude(pk=match.pk).update(status='REJECTED')

            pickup_otp = f"{random.randint(100000, 999999)}"
            delivery_otp = f"{random.randint(100000, 999999)}"

            delivery, created = Delivery.objects.get_or_create(
                match=match,
                defaults={
                    'pickup_otp': pickup_otp,
                    'delivery_otp': delivery_otp,
                    'status': 'PICKUP_PENDING'
                }
            )

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
