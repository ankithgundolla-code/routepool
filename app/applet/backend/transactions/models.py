from django.db import models
from deliveries.models import Delivery

class Transaction(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='transactions')
    vendor_amount = models.FloatField()
    commuter_reward = models.FloatField()
    platform_fee = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transaction #{self.id} for Delivery #{self.delivery.id} (Commuter: ₹{self.commuter_reward}, Platform: ₹{self.platform_fee})"
