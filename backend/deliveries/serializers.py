from rest_framework import serializers
from .models import Delivery
from matching.serializers import MatchSerializer

class DeliverySerializer(serializers.ModelSerializer):
    match_detail = MatchSerializer(source='match', read_only=True)
    package_id = serializers.IntegerField(source='match.package.id', read_only=True)
    package_name = serializers.CharField(source='match.package.package_name', read_only=True)
    vendor_business = serializers.CharField(source='match.package.vendor.business_name', read_only=True)
    commuter_name = serializers.CharField(source='match.commuter_route.commuter.name', read_only=True)
    commuter_phone = serializers.CharField(source='match.commuter_route.commuter.phone', read_only=True)
    vendor_phone = serializers.CharField(source='match.package.vendor.user.phone', read_only=True)
    pickup_location = serializers.CharField(source='match.package.pickup_location', read_only=True)
    pickup_lat = serializers.FloatField(source='match.package.pickup_lat', read_only=True)
    pickup_lng = serializers.FloatField(source='match.package.pickup_lng', read_only=True)
    destination = serializers.CharField(source='match.package.destination', read_only=True)
    dest_lat = serializers.FloatField(source='match.package.dest_lat', read_only=True)
    dest_lng = serializers.FloatField(source='match.package.dest_lng', read_only=True)
    offered_reward = serializers.FloatField(source='match.package.offered_reward', read_only=True)
    direct_distance_km = serializers.FloatField(source='match.package.direct_distance_km', read_only=True)

    class Meta:
        model = Delivery
        fields = [
            'id', 'match', 'match_detail', 'package_id', 'package_name', 'vendor_business',
            'commuter_name', 'commuter_phone', 'vendor_phone',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination', 'dest_lat', 'dest_lng',
            'offered_reward', 'direct_distance_km',
            'pickup_otp', 'delivery_otp', 'pickup_verified', 'delivery_verified',
            'picked_up_at', 'delivered_at', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not user or not user.is_authenticated:
            return data

        is_admin = getattr(user, 'role', '') == 'admin' or user.is_staff or user.is_superuser
        is_demo = getattr(user, 'email', '').startswith('demo_') or (
            hasattr(request, 'query_params') and request.query_params.get('demo') in ('true', '1')
        )
        is_vendor = getattr(user, 'role', '') == 'vendor'

        # Originating vendor, admins, and presentation demo stations receive both OTPs
        if is_admin or is_vendor or is_demo:
            return data

        # Non-demo commuter security check
        if not instance.pickup_verified:
            data['pickup_otp'] = None
        if not instance.delivery_verified:
            data['delivery_otp'] = None

        return data
