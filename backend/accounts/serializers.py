from django.db import IntegrityError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email = (attrs.get('email') or '').strip().lower()
        password = attrs.get('password', '')
        if not email:
            raise serializers.ValidationError({'email': ['Email address is required.']})
        if not password or not str(password).strip():
            raise serializers.ValidationError({'password': ['Password is required.']})

        attrs['email'] = email
        attrs.setdefault('username', email)

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
    name = serializers.CharField(
        required=True,
        allow_blank=False,
        min_length=2,
        error_messages={
            'required': 'Full name is required.',
            'blank': 'Full name cannot be blank.',
            'min_length': 'Full name must be at least 2 characters.'
        }
    )
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': 'Email address is required.',
            'invalid': 'Enter a valid email address.'
        }
    )
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=25,
        default='',
        error_messages={
            'max_length': 'Phone number cannot exceed 25 characters.'
        }
    )
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        error_messages={
            'required': 'Password is required.',
            'min_length': 'Password must be at least 6 characters.'
        }
    )
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=['vendor', 'commuter'],
        default='commuter',
        error_messages={
            'invalid_choice': 'Registration role must be either vendor or commuter.'
        }
    )
    business_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    business_address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    lat = serializers.FloatField(required=False, default=17.4065)
    lng = serializers.FloatField(required=False, default=78.4772)

    class Meta:
        model = User
        fields = [
            'name', 'email', 'phone', 'password', 'password_confirm',
            'role', 'business_name', 'business_address', 'location', 'lat', 'lng'
        ]

    def validate_name(self, value):
        cleaned = (value or '').strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError('Full name must be at least 2 characters.')
        return cleaned

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError('Email address is required.')
        norm = value.strip().lower()
        if User.objects.filter(email__iexact=norm).exists() or User.objects.filter(username__iexact=norm).exists():
            raise serializers.ValidationError('An account with this email address already exists. Please sign in instead.')
        return norm

    def validate_phone(self, value):
        if value is None:
            return ''
        return str(value).strip()

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        if password_confirm and password != password_confirm:
            raise serializers.ValidationError({'password_confirm': ['Passwords do not match. Please verify both password fields.']})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        role = validated_data.get('role', 'commuter')
        business_name = (validated_data.pop('business_name', '') or '').strip()
        business_address = (
            validated_data.pop('business_address', '') or
            validated_data.pop('location', '') or
            ''
        ).strip()
        validated_data.pop('location', None)
        lat = validated_data.pop('lat', 17.4065)
        lng = validated_data.pop('lng', 78.4772)
        password = validated_data.pop('password')

        email = validated_data.get('email', '').strip().lower()
        validated_data['email'] = email
        if not validated_data.get('username'):
            validated_data['username'] = email

        phone = validated_data.get('phone')
        if phone is None:
            validated_data['phone'] = ''

        try:
            user = User(
                email=email,
                username=validated_data.get('username', email),
                name=validated_data.get('name', ''),
                phone=validated_data.get('phone', ''),
                role=role
            )
            user.set_password(password)
            user.save()
        except IntegrityError:
            raise serializers.ValidationError({
                'email': ['An account with this email address already exists. Please sign in instead.']
            })

        if role == 'vendor':
            from vendors.models import Vendor
            Vendor.objects.get_or_create(
                user=user,
                defaults={
                    'business_name': business_name or f"{user.name or user.email}'s Store",
                    'location': business_address or "Hyderabad Central Market",
                    'lat': lat,
                    'lng': lng
                }
            )
        elif role == 'commuter':
            # Commuter is identified via user.role='commuter'; profile is safely verified/initialized
            user.role = 'commuter'
            user.save(update_fields=['role'])

        return user
