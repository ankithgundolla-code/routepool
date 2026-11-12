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

    # Phase 7: Additive Diagnostics & Ranking
    rank = serializers.SerializerMethodField()
    route_overlap_percentage = serializers.SerializerMethodField()
    scoring_breakdown = serializers.SerializerMethodField()
    feasibility_checks = serializers.SerializerMethodField()
    disqualification_reason = serializers.SerializerMethodField()

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
            'rank', 'route_overlap_percentage', 'scoring_breakdown',
            'feasibility_checks', 'disqualification_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_commuter_earnings(self, obj):
        # 75% of offered reward
        return round(obj.package.offered_reward * 0.75, 2)

    def get_platform_fee(self, obj):
        # 25% of offered reward
        return round(obj.package.offered_reward * 0.25, 2)

    def get_rank(self, obj):
        return getattr(obj, 'rank', None)

    def get_route_overlap_percentage(self, obj):
        if hasattr(obj, 'route_overlap_percentage') and obj.route_overlap_percentage is not None:
            return obj.route_overlap_percentage
        # If not cached on instance, derive from route points if package is available
        try:
            from .services import calculate_direction_and_overlap
            route = obj.commuter_route
            normal_points = [(route.start_lat, route.start_lng)]
            if route.intermediate_points and isinstance(route.intermediate_points, list):
                for pt in route.intermediate_points:
                    if isinstance(pt, dict) and 'lat' in pt and 'lng' in pt:
                        normal_points.append((float(pt['lat']), float(pt['lng'])))
            normal_points.append((route.dest_lat, route.dest_lng))
            dir_info = calculate_direction_and_overlap(
                normal_points,
                (obj.package.pickup_lat, obj.package.pickup_lng),
                (obj.package.dest_lat, obj.package.dest_lng)
            )
            return dir_info.get('route_overlap_percentage')
        except Exception:
            return None

    def get_scoring_breakdown(self, obj):
        if hasattr(obj, 'scoring_breakdown') and obj.scoring_breakdown:
            return obj.scoring_breakdown
        # Fallback diagnostic mapping from component scores
        overlap_pct = self.get_route_overlap_percentage(obj)
        return {
            'detour_score': round(max(0.0, 100.0 - obj.detour_penalty), 1),
            'overlap_score': round(overlap_pct if overlap_pct is not None else obj.route_score, 1),
            'pickup_proximity_score': round(max(0.0, 100.0 - (obj.pickup_distance * 25.0)), 1),
            'dropoff_proximity_score': round(max(0.0, 100.0 - (obj.destination_distance * 25.0)), 1),
            'departure_time_score': obj.time_score,
            'deadline_margin_score': obj.time_score,
            'capacity_score': obj.package_score,
            'reliability_score': obj.reliability_score
        }

    def get_feasibility_checks(self, obj):
        if hasattr(obj, 'feasibility_checks') and obj.feasibility_checks:
            return obj.feasibility_checks
        try:
            from .services import get_remaining_route_capacity
            remaining_cap = get_remaining_route_capacity(obj.commuter_route)
        except Exception:
            remaining_cap = obj.commuter_route.max_package_weight

        overlap_pct = self.get_route_overlap_percentage(obj)
        return {
            'is_eligible': True,
            'day_matched': True,
            'remaining_capacity_kg': remaining_cap,
            'package_weight_kg': obj.package.weight,
            'overlap_available': (overlap_pct is not None),
            'route_overlap_percentage': overlap_pct
        }

    def get_disqualification_reason(self, obj):
        return getattr(obj, 'disqualification_reason', None)
