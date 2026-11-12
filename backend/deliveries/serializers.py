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
            data['pickup_otp'] = None
            data['delivery_otp'] = None
            return data

        is_admin = getattr(user, 'role', '') == 'admin' or user.is_staff or user.is_superuser
        is_vendor = False
        try:
            if getattr(user, 'role', '') == 'vendor':
                is_vendor = (
                    hasattr(instance, 'match') and
                    instance.match and
                    instance.match.package and
                    instance.match.package.vendor and
                    instance.match.package.vendor.user_id == user.id
                )
        except Exception:
            is_vendor = False

        # Security Policy:
        # - Admin: full operational access
        # - Origin Vendor: holds pickup_otp to display to commuter; receives delivery_otp on completion
        # - Commuter (or unauthorized caller):
        #   Must NEVER see pickup_otp prior to pickup verification (must ask vendor physically)
        #   Must NEVER see delivery_otp prior to delivery verification (must ask recipient physically)
        if not (is_admin or is_vendor):
            if not instance.pickup_verified:
                data['pickup_otp'] = None
            if not instance.delivery_verified:
                data['delivery_otp'] = None

        return data
