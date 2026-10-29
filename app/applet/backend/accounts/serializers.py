from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'name': self.user.name or self.user.email.split('@')[0],
            'phone': self.user.phone,
            'role': self.user.role,
            'reliability_score': self.user.reliability_score,
        }
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'role', 'reliability_score', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'reliability_score', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    business_name = serializers.CharField(required=False, allow_blank=True)
    business_address = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False, default=17.4065)
    lng = serializers.FloatField(required=False, default=78.4772)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'password', 'role', 'business_name', 'business_address', 'lat', 'lng']

    def create(self, validated_data):
        role = validated_data.get('role', 'commuter')
        business_name = validated_data.pop('business_name', '')
        business_address = validated_data.pop('business_address', '')
        lat = validated_data.pop('lat', 17.4065)
        lng = validated_data.pop('lng', 78.4772)
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)

        if role == 'vendor':
            from vendors.models import Vendor
            Vendor.objects.create(
                user=user,
                business_name=business_name or f"{user.name}'s Store",
                location=business_address or "Hyderabad Central Market",
                lat=lat,
                lng=lng
            )

        return user
