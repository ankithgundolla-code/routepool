from django.urls import path
from .views import PlatformOverviewView, VendorAnalyticsView, CommuterAnalyticsView, AdminAnalyticsView, ReviewListCreateView

urlpatterns = [
    path('overview/', PlatformOverviewView.as_view(), name='platform_overview'),
    path('vendor/', VendorAnalyticsView.as_view(), name='vendor_analytics'),
    path('commuter/', CommuterAnalyticsView.as_view(), name='commuter_analytics'),
    path('admin/', AdminAnalyticsView.as_view(), name='admin_analytics'),
    path('reviews/', ReviewListCreateView.as_view(), name='reviews_list_create'),
]
