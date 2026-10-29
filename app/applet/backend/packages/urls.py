from django.urls import path
from .views import PackageListCreateView, PackageDetailView, PackageCancelView

urlpatterns = [
    path('', PackageListCreateView.as_view(), name='package_list_create'),
    path('<int:pk>/', PackageDetailView.as_view(), name='package_detail'),
    path('<int:pk>/cancel/', PackageCancelView.as_view(), name='package_cancel'),
]
