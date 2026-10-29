from rest_framework import views, permissions, status
from rest_framework.response import Response
from .models import Vendor
from .serializers import VendorSerializer

class VendorProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        vendor = getattr(request.user, 'vendor_profile', None)
        if not vendor:
            return Response({'detail': 'Vendor profile not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(VendorSerializer(vendor).data)

    def put(self, request):
        vendor, _ = Vendor.objects.get_or_create(user=request.user)
        serializer = VendorSerializer(vendor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
