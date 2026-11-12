from rest_framework import generics, permissions, status, views
from rest_framework.exceptions import PermissionDenied
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
        # Commuters and non-vendors must not access the vendor package listing endpoint
        raise PermissionDenied("Commuters cannot access vendor package listings. Use commuter opportunities instead.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['vendor', 'admin']:
            raise PermissionDenied("Only registered vendors or administrators can dispatch packages.")
        vendor, _ = Vendor.objects.get_or_create(
            user=user,
            defaults={
                'business_name': f"{user.name or user.email}'s Store",
                'location': 'Hyderabad Central'
            }
        )
        package = serializer.save(vendor=vendor, status='SEARCHING')
        # Run matching engine right away
        try:
            from matching.services import MatchingService
            MatchingService.find_and_record_matches(package)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Auto-matching error for package %s: %s", package.id, e)

class PackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Package.objects.all()
        if user.role == 'vendor':
            return Package.objects.filter(vendor__user=user)
        raise PermissionDenied("Permission denied: You can only view details for your own packages.")

class PackageCancelView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            package = Package.objects.get(pk=pk)
            if request.user.role != 'admin' and package.vendor.user != request.user:
                return Response({'detail': 'Permission denied: Only the package vendor or administrator can cancel this package.'}, status=status.HTTP_403_FORBIDDEN)

            if package.status in ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']:
                return Response({'detail': f'Cannot cancel package in {package.status} status.'}, status=status.HTTP_400_BAD_REQUEST)

            package.status = 'CANCELLED'
            package.save()

            # Mark associated matches cancelled
            from matching.models import Match
            Match.objects.filter(package=package).update(status='CANCELLED')

            return Response({'detail': 'Package cancelled successfully', 'status': package.status})
        except Package.DoesNotExist:
            return Response({'detail': 'Package not found'}, status=status.HTTP_404_NOT_FOUND)
