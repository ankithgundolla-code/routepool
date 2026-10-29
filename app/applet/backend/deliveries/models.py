from django.db import models
from matching.models import Match

class Delivery(models.Model):
    STATUS_CHOICES = (
        ('PICKUP_PENDING', 'Pickup Pending'),
        ('PICKED_UP', 'Picked Up'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
        ('FAILED', 'Failed Delivery'),
    )

    match = models.OneToOneField(Match, on_delete=models.CASCADE, related_name='delivery')
    pickup_otp = models.CharField(max_length=10)
    delivery_otp = models.CharField(max_length=10)
    pickup_verified = models.BooleanField(default=False)
    delivery_verified = models.BooleanField(default=False)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='PICKUP_PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Delivery #{self.id} for Package #{self.match.package.id} [{self.status}]"
