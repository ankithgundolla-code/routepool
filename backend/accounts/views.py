from rest_framework import status, views, permissions, serializers
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserProfileSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception("Registration unexpected failure: %s", exc)
            return Response(
                {'non_field_errors': ['Unable to complete registration. Please verify your details and try again.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)

class ProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserProfileSerializer(user).data
        if user.role == 'vendor' and hasattr(user, 'vendor_profile'):
            from vendors.serializers import VendorSerializer
            data['vendor_profile'] = VendorSerializer(user.vendor_profile).data
        return Response(data)

    def patch(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DemoLoginView(views.APIView):
    """Explicit 1-click role switcher strictly for project demo evaluation (vendor, commuter, admin)"""
    permission_classes = [permissions.AllowAny]

    ALLOWED_DEMO_ROLES = {'vendor', 'commuter', 'admin'}

    def post(self, request):
        role = request.data.get('role')
        if not role or not isinstance(role, str) or not role.strip():
            return Response(
                {
                    'detail': 'Demo authentication requires an explicit role (vendor, commuter, admin). '
                              'Name-only login is not permitted.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        role = role.strip().lower()
        if role not in self.ALLOWED_DEMO_ROLES:
            return Response(
                {
                    'detail': f"Invalid demo role '{role}'. Allowed demo roles are: vendor, commuter, admin."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        email = f"demo_{role}@routepool.local"
        user = User.objects.filter(email=email).first()

        if not user:
            # Create standard pre-seeded demo user if not yet initialized
            names = {
                'vendor': 'Sri Krishna Electronics (Vendor)',
                'commuter': 'Rajesh Sharma (Daily Commuter)',
                'admin': 'RoutePool Admin Operations'
            }
            user = User.objects.create_user(
                email=email,
                password='demopassword123',
                name=names.get(role, f"Demo {role.capitalize()}"),
                role=role,
                phone='+91 98765 43210'
            )
            if role == 'vendor':
                from vendors.models import Vendor
                Vendor.objects.create(
                    user=user,
                    business_name="Sri Krishna Electronics & Gadgets",
                    location="Khairatabad Circle, Hyderabad",
                    lat=17.4116,
                    lng=78.4611
                )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'phone': user.phone,
                'role': user.role,
                'reliability_score': user.reliability_score,
            }
        })

