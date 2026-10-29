from rest_framework import serializers
from .models import Delivery
from matching.serializers import MatchSerializer

class DeliverySerializer(serializers.ModelSerializer):
    match_detail = MatchSerializer(source='match', read_only=True)
    package_name = serializers.CharField(source='match.package.package_name', read_only=True)
    vendor_business = serializers.CharField(source='match.package.vendor.business_name', read_only=True)
    commuter_name = serializers.CharField(source='match.commuter_route.commuter.name', read_only=True)
    commuter_phone = serializers.CharField(source='match.commuter_route.commuter.phone', read_only=True)
    vendor_phone = serializers.CharField(source='match.package.vendor.user.phone', read_only=True)
    pickup_location = serializers.CharField(source='match.package.pickup_location', read_only=True)
    destination = serializers.CharField(source='match.package.destination', read_only=True)
    offered_reward = serializers.FloatField(source='match.package.offered_reward', read_only=True)
    direct_distance_km = serializers.FloatField(source='match.package.direct_distance_km', read_only=True)

    class Meta:
        model = Delivery
        fields = [
            'id', 'match', 'match_detail', 'package_name', 'vendor_business',
            'commuter_name', 'commuter_phone', 'vendor_phone',
            'pickup_location', 'destination', 'offered_reward', 'direct_distance_km',
            'pickup_otp', 'delivery_otp', 'pickup_verified', 'delivery_verified',
            'picked_up_at', 'delivered_at', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
