from django.db import models
from vendors.models import Vendor

class Package(models.Model):
    STATUS_CHOICES = (
        ('CREATED', 'Created'),
        ('SEARCHING', 'Searching Commuter Matches'),
        ('MATCHED', 'Match Accepted / Pending Confirmation'),
        ('PICKUP_PENDING', 'Pickup Pending'),
        ('PICKED_UP', 'Picked Up'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
        ('FAILED', 'Failed Delivery'),
    )

    SIZE_CHOICES = (
        ('small', 'Small (< 20cm, up to 1kg)'),
        ('medium', 'Medium (< 40cm, up to 4kg)'),
        ('large', 'Large (< 60cm, up to 10kg)'),
    )

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='packages')
    package_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    pickup_location = models.CharField(max_length=255)
    pickup_lat = models.FloatField()
    pickup_lng = models.FloatField()

    destination = models.CharField(max_length=255)
    dest_lat = models.FloatField()
    dest_lng = models.FloatField()

    weight = models.FloatField(default=1.0)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default='small')

    ready_time = models.DateTimeField()
    delivery_deadline = models.DateTimeField()

    offered_reward = models.FloatField(default=40.0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SEARCHING')

    direct_distance_km = models.FloatField(default=0.0)
    estimated_standard_courier_price = models.FloatField(default=70.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.package_name} ({self.pickup_location} -> {self.destination}) [{self.status}]"
