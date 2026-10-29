from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='delivery.match.package.package_name', read_only=True)
    vendor_business = serializers.CharField(source='delivery.match.package.vendor.business_name', read_only=True)
    commuter_name = serializers.CharField(source='delivery.match.commuter_route.commuter.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'delivery', 'package_name', 'vendor_business', 'commuter_name',
            'vendor_amount', 'commuter_reward', 'platform_fee', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
