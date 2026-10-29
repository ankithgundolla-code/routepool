from django.urls import path
from .views import CommuterRouteListCreateView, CommuterRouteDetailView, CommuterRouteToggleActiveView

urlpatterns = [
    path('routes/', CommuterRouteListCreateView.as_view(), name='commuter_routes_list_create'),
    path('routes/<int:pk>/', CommuterRouteDetailView.as_view(), name='commuter_route_detail'),
    path('routes/<int:pk>/toggle/', CommuterRouteToggleActiveView.as_view(), name='commuter_route_toggle'),
]
