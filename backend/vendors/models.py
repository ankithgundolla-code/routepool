from django.db import models
from django.conf import settings
from config.spatial import PointField, Point, create_point


class Vendor(models.Model):
    """
    RoutePool Vendor Model.
    Represents a local retail store, pharmacy, electronics hub, or warehouse
    originating package dispatch requests into commuter corridors.
    Includes PostGIS Point geography for high-performance spatial indexing.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vendor_profile',
        help_text="Underlying user account associated with this vendor"
    )
    business_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Registered trading or store name"
    )
    location = models.CharField(
        max_length=255,
        help_text="Human-readable pickup landmark, street address, or depot identifier"
    )
    
    # Coordinate Floats for lightweight serialization and client mapping
    lat = models.FloatField(default=17.4116, help_text="Latitude coordinate (EPSG:4326)")
    lng = models.FloatField(default=78.4611, help_text="Longitude coordinate (EPSG:4326)")

    # PostGIS Spatial Field: Point(longitude, latitude) with SRID 4326
    location_point = PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS spatial Point (longitude, latitude) for spatial indexing and ST_DWithin queries"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business_name']),
            models.Index(fields=['lat', 'lng']),
        ]

    def save(self, *args, **kwargs):
        """
        Synchronizes coordinate floats with the PostGIS PointField before persisting.
        PostGIS standard convention: Point(x=longitude, y=latitude).
        """
        if self.lat is not None and self.lng is not None:
            # If coordinates are set, update PostGIS spatial point
            pt = create_point(lat=self.lat, lng=self.lng, srid=4326)
            if pt is not None:
                self.location_point = pt
        elif self.location_point is not None:
            # If location_point is supplied directly, sync lat and lng floats
            try:
                coords = getattr(self.location_point, 'coords', None)
                if coords:
                    self.lng = coords[0]
                    self.lat = coords[1]
            except Exception:
                pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.business_name} ({self.location}) [User: {self.user.email}]"

    @property
    def total_packages_count(self) -> int:
        return self.packages.count()

    @property
    def active_packages_count(self) -> int:
        return self.packages.filter(
            status__in=['CREATED', 'SEARCHING', 'MATCHED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
        ).count()
