from django.urls import path
from .views import VendorProfileView

urlpatterns = [
    path('profile/', VendorProfileView.as_view(), name='vendor_profile'),
]
