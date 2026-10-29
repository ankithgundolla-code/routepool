from rest_framework import serializers
from .models import CommuterRoute

class CommuterRouteSerializer(serializers.ModelSerializer):
    commuter_name = serializers.CharField(source='commuter.name', read_only=True)
    commuter_email = serializers.EmailField(source='commuter.email', read_only=True)
    commuter_phone = serializers.CharField(source='commuter.phone', read_only=True)
    reliability_score = serializers.FloatField(source='commuter.reliability_score', read_only=True)

    class Meta:
        model = CommuterRoute
        fields = [
            'id', 'commuter', 'commuter_name', 'commuter_email', 'commuter_phone',
            'reliability_score', 'route_name', 'start_location', 'start_lat', 'start_lng',
            'destination', 'dest_lat', 'dest_lng', 'intermediate_points',
            'route_geometry', 'departure_time', 'arrival_time', 'available_days',
            'max_package_weight', 'max_package_size', 'max_detour', 'travel_mode',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'commuter', 'created_at']
