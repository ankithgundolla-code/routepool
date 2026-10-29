from django.utils import timezone
from rest_framework import views, generics, permissions, status
from rest_framework.response import Response
from .models import Delivery
from .serializers import DeliverySerializer
from packages.models import Package
from transactions.models import Transaction
from analytics.models import EcoImpact
from notifications.models import Notification
from matching.services import MatchingService

class DeliveryListView(generics.ListAPIView):
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Delivery.objects.all()
        if user.role == 'vendor':
            return Delivery.objects.filter(match__package__vendor__user=user)
        # Commuter
        return Delivery.objects.filter(match__commuter_route__commuter=user)

class DeliveryDetailView(generics.RetrieveAPIView):
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Delivery.objects.all()
        if user.role == 'vendor':
            return Delivery.objects.filter(match__package__vendor__user=user)
        return Delivery.objects.filter(match__commuter_route__commuter=user)

class VerifyPickupOTPView(views.APIView):
    """
    Vendor provides Pickup OTP to Commuter upon physical handover.
    Commuter submits OTP -> transitions to PICKED_UP and IN_TRANSIT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        otp_input = str(request.data.get('otp', '')).strip()
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package
            commuter = delivery.match.commuter_route.commuter
            user = request.user

            if user.role != 'admin' and commuter != user and package.vendor.user != user:
                return Response({'detail': 'Permission denied: Only the assigned commuter or vendor can perform pickup verification.'}, status=status.HTTP_403_FORBIDDEN)

            if delivery.status != 'PICKUP_PENDING':
                return Response(
                    {'detail': f'Cannot verify pickup. Delivery is in status: {delivery.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if delivery.pickup_otp != otp_input:
                return Response({'detail': 'Invalid Pickup OTP. Please verify with the vendor.'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            delivery.pickup_verified = True
            delivery.picked_up_at = now
            delivery.status = 'IN_TRANSIT'
            delivery.save()

            package.status = 'IN_TRANSIT'
            package.save()

            # Notifications
            Notification.objects.create(
                user=package.vendor.user,
                title="Package Picked Up!",
                message=f"Commuter {delivery.match.commuter_route.commuter.name} has collected '{package.package_name}' and is en route. Delivery OTP: {delivery.delivery_otp}"
            )

            return Response({
                'detail': 'Pickup OTP verified successfully. Package is now in transit!',
                'status': delivery.status,
                'picked_up_at': delivery.picked_up_at
            })
        except Delivery.DoesNotExist:
            return Response({'detail': 'Delivery not found'}, status=status.HTTP_404_NOT_FOUND)

class VerifyDeliveryOTPView(views.APIView):
    """
    Recipient or Vendor verifies package receipt with Delivery OTP.
    Transitions IN_TRANSIT -> DELIVERED.
    Settles reward transaction, records EcoImpact, and increments commuter reliability score.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        otp_input = str(request.data.get('otp', '')).strip()
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package
            commuter = delivery.match.commuter_route.commuter
            user = request.user

            if user.role != 'admin' and commuter != user and package.vendor.user != user:
                return Response({'detail': 'Permission denied: Only the assigned commuter or vendor can perform delivery verification.'}, status=status.HTTP_403_FORBIDDEN)

            if delivery.status != 'IN_TRANSIT':
                return Response(
                    {'detail': f'Cannot verify delivery. Status must be IN_TRANSIT, currently: {delivery.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if delivery.delivery_otp != otp_input:
                return Response({'detail': 'Invalid Delivery OTP. Please request correct OTP from recipient.'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            delivery.delivery_verified = True
            delivery.delivered_at = now
            delivery.status = 'DELIVERED'
            delivery.save()

            package.status = 'DELIVERED'
            package.save()

            # 1. Financial Settlement (Transaction)
            reward_total = package.offered_reward
            commuter_payout = round(reward_total * 0.75, 2)
            platform_fee = round(reward_total * 0.25, 2)

            transaction, _ = Transaction.objects.get_or_create(
                delivery=delivery,
                defaults={
                    'vendor_amount': reward_total,
                    'commuter_reward': commuter_payout,
                    'platform_fee': platform_fee
                }
            )

            # 2. Environmental Impact Calculation
            # Avoided travel = direct courier travel avoided by attaching to existing journey
            distance_saved = round(max(package.direct_distance_km, 1.5), 2)
            co2_saved = round(distance_saved * 0.144, 2)

            eco_impact, _ = EcoImpact.objects.get_or_create(
                delivery=delivery,
                defaults={
                    'estimated_distance_saved': distance_saved,
                    'estimated_co2_saved': co2_saved
                }
            )

            # 3. Increment Commuter Reliability Score
            commuter.reliability_score = min(100.0, round(commuter.reliability_score + 2.0, 1))
            commuter.save()

            # Notifications
            Notification.objects.create(
                user=package.vendor.user,
                title="Delivery Completed Successfully!",
                message=f"'{package.package_name}' has been safely delivered. You saved ~₹{round(package.estimated_standard_courier_price - package.offered_reward)} vs traditional courier."
            )
            Notification.objects.create(
                user=commuter,
                title="Delivery Completed & Reward Earned!",
                message=f"You completed delivery for '{package.package_name}'. ₹{commuter_payout} credited to your earnings wallet! Reliability score increased to {commuter.reliability_score}."
            )

            return Response({
                'detail': 'Delivery successfully verified and completed!',
                'status': 'DELIVERED',
                'delivered_at': delivery.delivered_at,
                'payout': commuter_payout,
                'eco_impact': {
                    'distance_saved_km': distance_saved,
                    'co2_saved_kg': co2_saved
                }
            })
        except Delivery.DoesNotExist:
            return Response({'detail': 'Delivery not found'}, status=status.HTTP_404_NOT_FOUND)

class CancelDeliveryView(views.APIView):
    """
    Handles cancellation before pickup.
    If Commuter cancels:
    - Package reverts to SEARCHING
    - Commuter reliability score penalized (-5)
    - Auto-rematching triggered
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package
            user = request.user

            if delivery.status in ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']:
                return Response(
                    {'detail': f'Cannot cancel after pickup has occurred (status: {delivery.status}).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            delivery.status = 'CANCELLED'
            delivery.save()

            delivery.match.status = 'CANCELLED'
            delivery.match.save()

            is_commuter = (delivery.match.commuter_route.commuter == user)

            if is_commuter:
                commuter = user
                commuter.reliability_score = max(20.0, round(commuter.reliability_score - 5.0, 1))
                commuter.save()

                # Revert package back to SEARCHING and re-trigger matching
                package.status = 'SEARCHING'
                package.save()
                MatchingService.find_and_record_matches(package)

                Notification.objects.create(
                    user=package.vendor.user,
                    title="Commuter Cancelled - Re-searching Matches",
                    message=f"The assigned commuter had to cancel. RoutePool is automatically re-matching package '{package.package_name}'."
                )

                return Response({
                    'detail': 'Commuter cancellation processed. Reliability score adjusted. Package returned to active searching pool.',
                    'new_reliability_score': commuter.reliability_score
                })
            else:
                # Vendor or admin cancelled
                package.status = 'CANCELLED'
                package.save()

                Notification.objects.create(
                    user=delivery.match.commuter_route.commuter,
                    title="Delivery Cancelled by Vendor",
                    message=f"The vendor cancelled the delivery request for '{package.package_name}'."
                )

                return Response({'detail': 'Delivery and package cancelled successfully.'})

        except Delivery.DoesNotExist:
            return Response({'detail': 'Delivery not found'}, status=status.HTTP_404_NOT_FOUND)
