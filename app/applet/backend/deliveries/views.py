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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        otp_input = str(request.data.get('otp', '')).strip()
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package

            if delivery.status != 'PICKUP_PENDING':
                return Response(
                    {'detail': f'Cannot verify pickup. Status is: {delivery.status}'},
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

            Notification.objects.create(
                user=package.vendor.user,
                title="Package Picked Up!",
                message=f"Commuter {delivery.match.commuter_route.commuter.name} collected '{package.package_name}'. Delivery OTP: {delivery.delivery_otp}"
            )

            return Response({
                'detail': 'Pickup OTP verified successfully. Package is now in transit!',
                'status': delivery.status,
                'picked_up_at': delivery.picked_up_at
            })
        except Delivery.DoesNotExist:
            return Response({'detail': 'Delivery not found'}, status=status.HTTP_404_NOT_FOUND)

class VerifyDeliveryOTPView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        otp_input = str(request.data.get('otp', '')).strip()
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package
            commuter = delivery.match.commuter_route.commuter

            if delivery.status != 'IN_TRANSIT':
                return Response(
                    {'detail': f'Cannot verify delivery. Status must be IN_TRANSIT, currently: {delivery.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if delivery.delivery_otp != otp_input:
                return Response({'detail': 'Invalid Delivery OTP.'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            delivery.delivery_verified = True
            delivery.delivered_at = now
            delivery.status = 'DELIVERED'
            delivery.save()

            package.status = 'DELIVERED'
            package.save()

            reward_total = package.offered_reward
            commuter_payout = round(reward_total * 0.75, 2)
            platform_fee = round(reward_total * 0.25, 2)

            Transaction.objects.get_or_create(
                delivery=delivery,
                defaults={
                    'vendor_amount': reward_total,
                    'commuter_reward': commuter_payout,
                    'platform_fee': platform_fee
                }
            )

            distance_saved = round(max(package.direct_distance_km, 1.5), 2)
            co2_saved = round(distance_saved * 0.144, 2)

            EcoImpact.objects.get_or_create(
                delivery=delivery,
                defaults={
                    'estimated_distance_saved': distance_saved,
                    'estimated_co2_saved': co2_saved
                }
            )

            commuter.reliability_score = min(100.0, round(commuter.reliability_score + 2.0, 1))
            commuter.save()

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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            delivery = Delivery.objects.get(pk=pk)
            package = delivery.match.package
            user = request.user

            if delivery.status in ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']:
                return Response(
                    {'detail': f'Cannot cancel after pickup has occurred.'},
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

                package.status = 'SEARCHING'
                package.save()
                MatchingService.find_and_record_matches(package)

                return Response({
                    'detail': 'Commuter cancellation processed. Package returned to active searching pool.',
                    'new_reliability_score': commuter.reliability_score
                })
            else:
                package.status = 'CANCELLED'
                package.save()
                return Response({'detail': 'Delivery cancelled successfully.'})
        except Delivery.DoesNotExist:
            return Response({'detail': 'Delivery not found'}, status=status.HTTP_404_NOT_FOUND)
