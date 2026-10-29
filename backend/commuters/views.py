from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import CommuterRoute
from .serializers import CommuterRouteSerializer

class CommuterRouteListCreateView(generics.ListCreateAPIView):
    serializer_class = CommuterRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return CommuterRoute.objects.all()
        return CommuterRoute.objects.filter(commuter=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['commuter', 'admin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only registered commuters or administrators can register transit routes.")
        serializer.save(commuter=user)

class CommuterRouteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommuterRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return CommuterRoute.objects.all()
        return CommuterRoute.objects.filter(commuter=user)

class CommuterRouteToggleActiveView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            route = CommuterRoute.objects.get(pk=pk, commuter=request.user)
            route.is_active = not route.is_active
            route.save()
            return Response({'id': route.id, 'is_active': route.is_active})
        except CommuterRoute.DoesNotExist:
            return Response({'detail': 'Route not found'}, status=status.HTTP_404_NOT_FOUND)
