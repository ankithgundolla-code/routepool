from django.db import models
from django.conf import settings

class CommuterRoute(models.Model):
    SIZE_CHOICES = (
        ('small', 'Small (< 20cm, up to 1kg)'),
        ('medium', 'Medium (< 40cm, up to 4kg)'),
        ('large', 'Large (< 60cm, up to 10kg)'),
    )

    TRAVEL_MODE_CHOICES = (
        ('two_wheeler', 'Motorcycle / Scooter'),
        ('car', 'Personal Car / Carpool'),
        ('metro_walking', 'Metro Transit + Walking'),
        ('bicycle', 'Bicycle / EV Cycle'),
    )

    commuter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='routes')
    route_name = models.CharField(max_length=150)
    
    start_location = models.CharField(max_length=255)
    start_lat = models.FloatField()
    start_lng = models.FloatField()

    destination = models.CharField(max_length=255)
    dest_lat = models.FloatField()
    dest_lng = models.FloatField()

    intermediate_points = models.JSONField(default=list, blank=True)
    route_geometry = models.JSONField(default=list, blank=True)

    departure_time = models.TimeField()
    arrival_time = models.TimeField()
    available_days = models.JSONField(default=list)

    max_package_weight = models.FloatField(default=3.0)
    max_package_size = models.CharField(max_length=20, choices=SIZE_CHOICES, default='medium')
    max_detour = models.FloatField(default=1.5)
    travel_mode = models.CharField(max_length=30, choices=TRAVEL_MODE_CHOICES, default='two_wheeler')

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.route_name} ({self.commuter.name or self.commuter.email})"
