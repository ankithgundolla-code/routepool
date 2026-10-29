from rest_framework import serializers
from .models import EcoImpact, Review

class EcoImpactSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='delivery.match.package.package_name', read_only=True)
    vendor_name = serializers.CharField(source='delivery.match.package.vendor.business_name', read_only=True)
    commuter_name = serializers.CharField(source='delivery.match.commuter_route.commuter.name', read_only=True)

    class Meta:
        model = EcoImpact
        fields = [
            'id', 'delivery', 'package_name', 'vendor_name', 'commuter_name',
            'estimated_distance_saved', 'estimated_co2_saved', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.name', read_only=True)
    reviewed_name = serializers.CharField(source='reviewed_user.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'delivery', 'reviewer', 'reviewer_name', 'reviewed_user', 'reviewed_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'reviewer', 'created_at']
