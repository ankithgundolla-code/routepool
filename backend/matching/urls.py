from django.urls import path
from .views import PackageMatchesView, CommuterOpportunitiesView, RequestMatchView, AcceptMatchView

urlpatterns = [
    path('package/<int:package_id>/matches/', PackageMatchesView.as_view(), name='package_matches'),
    path('commuter/opportunities/', CommuterOpportunitiesView.as_view(), name='commuter_opportunities'),
    path('match/<int:pk>/request/', RequestMatchView.as_view(), name='request_match'),
    path('match/<int:pk>/accept/', AcceptMatchView.as_view(), name='accept_match'),
]
