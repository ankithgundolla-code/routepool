from rest_framework import serializers
from .models import Match
from packages.serializers import PackageSerializer
from commuters.serializers import CommuterRouteSerializer

class MatchSerializer(serializers.ModelSerializer):
    package_detail = PackageSerializer(source='package', read_only=True)
    route_detail = CommuterRouteSerializer(source='commuter_route', read_only=True)
    vendor_business_name = serializers.CharField(source='package.vendor.business_name', read_only=True)
    commuter_name = serializers.CharField(source='commuter_route.commuter.name', read_only=True)
    commuter_reliability = serializers.FloatField(source='commuter_route.commuter.reliability_score', read_only=True)
    
    # Financial breakdown
    offered_reward = serializers.FloatField(source='package.offered_reward', read_only=True)
    commuter_earnings = serializers.SerializerMethodField()
    platform_fee = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'package', 'commuter_route', 'package_detail', 'route_detail',
            'vendor_business_name', 'commuter_name', 'commuter_reliability',
            'pickup_distance', 'destination_distance', 'normal_distance',
            'delivery_distance', 'estimated_detour',
            'time_score', 'package_score', 'route_score', 'reliability_score',
            'detour_penalty', 'final_score', 'match_level', 'status',
            'offered_reward', 'commuter_earnings', 'platform_fee',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_commuter_earnings(self, obj):
        # 75% of offered reward
        return round(obj.package.offered_reward * 0.75, 2)

    def get_platform_fee(self, obj):
        # 25% of offered reward
        return round(obj.package.offered_reward * 0.25, 2)
