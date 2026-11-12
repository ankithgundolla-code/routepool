from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db import transaction
import logging
from .models import CommuterRoute
from .serializers import CommuterRouteSerializer

logger = logging.getLogger(__name__)

def trigger_matching_for_searching_packages():
    try:
        from packages.models import Package
        from matching.services import MatchingService
        searching_packages = Package.objects.filter(status='SEARCHING')
        for pkg in searching_packages:
            try:
                MatchingService.find_and_record_matches(pkg)
            except Exception as pkg_err:
                logger.warning("Error auto-matching package %s with updated routes: %s", pkg.id, pkg_err)
    except Exception as exc:
        logger.warning("Error running package matching on route update: %s", exc)

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
            raise PermissionDenied("Only registered commuters or administrators can register transit routes.")
        route = serializer.save(commuter=user)
        if route.is_active:
            transaction.on_commit(trigger_matching_for_searching_packages)

class CommuterRouteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommuterRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return CommuterRoute.objects.all()
        return CommuterRoute.objects.filter(commuter=user)

    def perform_update(self, serializer):
        route = serializer.save()
        if route.is_active:
            transaction.on_commit(trigger_matching_for_searching_packages)

class CommuterRouteToggleActiveView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            route = CommuterRoute.objects.get(pk=pk, commuter=request.user)
            route.is_active = not route.is_active
            route.save()
            if route.is_active:
                transaction.on_commit(trigger_matching_for_searching_packages)
            return Response({'id': route.id, 'is_active': route.is_active})
        except CommuterRoute.DoesNotExist:
            return Response({'detail': 'Route not found'}, status=status.HTTP_404_NOT_FOUND)
