from rest_framework import serializers
from .models import Vendor

class VendorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Vendor
        fields = ['id', 'user', 'business_name', 'location', 'lat', 'lng', 'email', 'name', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
