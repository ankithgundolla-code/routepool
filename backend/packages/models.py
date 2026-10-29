from django.db import models
from vendors.models import Vendor
from config.spatial import (
    PointField,
    create_point,
    haversine_distance_km
)


class Package(models.Model):
    """
    RoutePool Package Model.
    Represents a parcel dispatched by a local vendor for crowd-shipping handover.
    Includes PostGIS Point geography for origin pickup and destination drop-off
    to enable spatial nearest-corridor matching and detour computations.
    """
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

    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        related_name='packages',
        help_text="Originating merchant or store"
    )
    package_name = models.CharField(
        max_length=200,
        help_text="Title or contents overview (e.g. 'Microcontroller ICs & SMD Sensors')"
    )
    description = models.TextField(blank=True, help_text="Handling instructions or package details")

    # Pickup Location & PostGIS Point
    pickup_location = models.CharField(max_length=255, help_text="Pickup landmark or address")
    pickup_lat = models.FloatField(help_text="Pickup latitude coordinate")
    pickup_lng = models.FloatField(help_text="Pickup longitude coordinate")
    pickup_point = PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS pickup Point(longitude, latitude) for spatial indexing"
    )

    # Destination Drop-off Location & PostGIS Point
    destination = models.CharField(max_length=255, help_text="Delivery destination landmark or address")
    dest_lat = models.FloatField(help_text="Destination latitude coordinate")
    dest_lng = models.FloatField(help_text="Destination longitude coordinate")
    dest_point = PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS destination Point(longitude, latitude) for spatial indexing"
    )

    # Parcel Characteristics
    weight = models.FloatField(default=1.0, help_text="Weight in kilograms (e.g., 0.8)")
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default='small')

    # Time Constraints
    ready_time = models.DateTimeField(help_text="Earliest time parcel is ready for commuter pickup")
    delivery_deadline = models.DateTimeField(help_text="Latest acceptable time for drop-off completion")

    # Economics & Clearinghouse
    offered_reward = models.FloatField(
        default=40.0,
        help_text="Monetary reward offered for crowd-shipping delivery (INR)"
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SEARCHING', db_index=True)

    # Comparative Metrics for Environmental & Economic Value
    direct_distance_km = models.FloatField(
        default=0.0,
        help_text="Great-circle distance directly between pickup and drop-off"
    )
    estimated_standard_courier_price = models.FloatField(
        default=70.0,
        help_text="Benchmark market price for a dedicated motorcycle courier"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Package'
        verbose_name_plural = 'Packages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['vendor']),
            models.Index(fields=['pickup_lat', 'pickup_lng']),
            models.Index(fields=['dest_lat', 'dest_lng']),
        ]

    def save(self, *args, **kwargs):
        """
        Maintains synchronization between numeric coordinates, distance computations,
        and PostGIS spatial fields (pickup_point, dest_point).
        """
        # Synchronize Pickup PostGIS Point: Point(x=lng, y=lat)
        if self.pickup_lat is not None and self.pickup_lng is not None:
            pt = create_point(lat=self.pickup_lat, lng=self.pickup_lng, srid=4326)
            if pt is not None:
                self.pickup_point = pt

        # Synchronize Destination PostGIS Point: Point(x=lng, y=lat)
        if self.dest_lat is not None and self.dest_lng is not None:
            pt = create_point(lat=self.dest_lat, lng=self.dest_lng, srid=4326)
            if pt is not None:
                self.dest_point = pt

        # Compute direct distance if not specified
        if (self.direct_distance_km is None or self.direct_distance_km <= 0.0) and \
           self.pickup_lat is not None and self.pickup_lng is not None and \
           self.dest_lat is not None and self.dest_lng is not None:
            self.direct_distance_km = haversine_distance_km(
                self.pickup_lat, self.pickup_lng, self.dest_lat, self.dest_lng
            )

        # Compute benchmark standard courier price if not set
        if self.estimated_standard_courier_price is None or self.estimated_standard_courier_price <= 0.0:
            dist = self.direct_distance_km or 0.0
            std_price = round(45.0 + (dist * 6.5) + (float(self.weight or 1.0) * 5.0), 2)
            self.estimated_standard_courier_price = max(std_price, float(self.offered_reward or 40.0) + 15.0)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.package_name} ({self.pickup_location} -> {self.destination}) [{self.status}]"

    @property
    def estimated_savings(self) -> float:
        """Estimated monetary savings for vendor vs. hiring a dedicated single-parcel courier."""
        return max(0.0, round(self.estimated_standard_courier_price - self.offered_reward, 2))

    @property
    def is_active_delivery(self) -> bool:
        """Indicates whether this parcel is in physical active transport."""
        return self.status in ['MATCHED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']

    @property
    def is_search_pending(self) -> bool:
        """Indicates whether this parcel is available for detour matching proposals."""
        return self.status in ['CREATED', 'SEARCHING']
