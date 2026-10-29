from django.urls import path
from .views import DeliveryListView, DeliveryDetailView, VerifyPickupOTPView, VerifyDeliveryOTPView, CancelDeliveryView

urlpatterns = [
    path('', DeliveryListView.as_view(), name='delivery_list'),
    path('<int:pk>/', DeliveryDetailView.as_view(), name='delivery_detail'),
    path('<int:pk>/verify-pickup/', VerifyPickupOTPView.as_view(), name='verify_pickup_otp'),
    path('<int:pk>/verify-delivery/', VerifyDeliveryOTPView.as_view(), name='verify_delivery_otp'),
    path('<int:pk>/cancel/', CancelDeliveryView.as_view(), name='cancel_delivery'),
]
