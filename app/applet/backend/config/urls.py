from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/vendors/', include('vendors.urls')),
    path('api/commuters/', include('commuters.urls')),
    path('api/packages/', include('packages.urls')),
    path('api/matching/', include('matching.urls')),
    path('api/deliveries/', include('deliveries.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/analytics/', include('analytics.urls')),
]
