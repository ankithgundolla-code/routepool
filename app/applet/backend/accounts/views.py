from rest_framework import status, views, permissions
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
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        role = request.data.get('role', 'vendor')
        email = f"demo_{role}@routepool.local"
        user = User.objects.filter(email=email).first()

        if not user:
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
