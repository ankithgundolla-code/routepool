from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from .models import Package
from .serializers import PackageSerializer
from vendors.models import Vendor

class PackageListCreateView(generics.ListCreateAPIView):
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Package.objects.all()
        if user.role == 'vendor':
            return Package.objects.filter(vendor__user=user)
        return Package.objects.filter(status='SEARCHING')

    def perform_create(self, serializer):
        user = self.request.user
        vendor, _ = Vendor.objects.get_or_create(
            user=user,
            defaults={
                'business_name': f"{user.name or user.email}'s Store",
                'location': 'Hyderabad Central'
            }
        )
        package = serializer.save(vendor=vendor, status='SEARCHING')
        try:
            from matching.services import MatchingService
            MatchingService.find_and_record_matches(package)
        except Exception as e:
            print(f"Auto-matching error: {e}")

class PackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Package.objects.all()
        if user.role == 'vendor':
            return Package.objects.filter(vendor__user=user)
        return Package.objects.all()

class PackageCancelView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            package = Package.objects.get(pk=pk)
            if request.user.role != 'admin' and package.vendor.user != request.user:
                return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

            if package.status in ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']:
                return Response({'detail': f'Cannot cancel package in {package.status} status.'}, status=status.HTTP_400_BAD_REQUEST)

            package.status = 'CANCELLED'
            package.save()

            from matching.models import Match
            Match.objects.filter(package=package).update(status='CANCELLED')

            return Response({'detail': 'Package cancelled successfully', 'status': package.status})
        except Package.DoesNotExist:
            return Response({'detail': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
