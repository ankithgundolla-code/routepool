import math
from rest_framework import serializers
from .models import Package
from vendors.models import Vendor

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class PackageSerializer(serializers.ModelSerializer):
    vendor_business_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_email = serializers.EmailField(source='vendor.user.email', read_only=True)
    estimated_savings = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            'id', 'vendor', 'vendor_business_name', 'vendor_email', 'package_name',
            'description', 'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination', 'dest_lat', 'dest_lng', 'weight', 'size',
            'ready_time', 'delivery_deadline', 'offered_reward', 'status',
            'direct_distance_km', 'estimated_standard_courier_price',
            'estimated_savings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'vendor', 'created_at', 'updated_at', 'direct_distance_km', 'estimated_standard_courier_price']

    def get_estimated_savings(self, obj):
        return max(0.0, round(obj.estimated_standard_courier_price - obj.offered_reward, 2))

    def create(self, validated_data):
        pickup_lat = validated_data.get('pickup_lat')
        pickup_lng = validated_data.get('pickup_lng')
        dest_lat = validated_data.get('dest_lat')
        dest_lng = validated_data.get('dest_lng')
        offered_reward = validated_data.get('offered_reward', 40.0)

        dist = haversine_km(pickup_lat, pickup_lng, dest_lat, dest_lng)
        validated_data['direct_distance_km'] = dist
        # Traditional courier estimates: base ~40 INR + ~6.5 INR per km + weight surcharge
        std_price = round(45.0 + (dist * 6.5) + (validated_data.get('weight', 1.0) * 5.0), 2)
        validated_data['estimated_standard_courier_price'] = max(std_price, offered_reward + 20.0)

        return super().create(validated_data)
