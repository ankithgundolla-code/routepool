from django.db import models
from django.conf import settings
from deliveries.models import Delivery

class EcoImpact(models.Model):
    delivery = models.OneToOneField(Delivery, on_delete=models.CASCADE, related_name='eco_impact')
    estimated_distance_saved = models.FloatField(default=0.0)
    estimated_co2_saved = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"EcoImpact Delivery #{self.delivery.id}: {self.estimated_distance_saved}km saved, {self.estimated_co2_saved}kg CO2"

class Review(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    reviewed_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review #{self.id} by {self.reviewer.email} ({self.rating} stars)"
