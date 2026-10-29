from django.db import models
from django.conf import settings
from config.spatial import (
    PointField,
    LineStringField,
    create_point,
    create_linestring,
    haversine_distance_km
)


class CommuterRoute(models.Model):
    """
    RoutePool CommuterRoute Model.
    Represents an everyday planned transit journey declared by a commuter.
    Equipped with PostGIS Point (start, destination) and LineString (corridor polyline)
    fields for high-performance spatial detour computations.
    """
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

    commuter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='routes',
        help_text="The commuter who owns and operates this travel corridor"
    )
    route_name = models.CharField(
        max_length=150,
        help_text="Human-readable title e.g., 'Daily Office Transit: Khairatabad to Ameerpet'"
    )

    # Origin Location & PostGIS Point
    start_location = models.CharField(max_length=255, help_text="Origin landmark name or area")
    start_lat = models.FloatField(help_text="Start latitude (EPSG:4326)")
    start_lng = models.FloatField(help_text="Start longitude (EPSG:4326)")
    start_point = PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS start location Point(longitude, latitude) for spatial indexing"
    )

    # Destination Location & PostGIS Point
    destination = models.CharField(max_length=255, help_text="Destination landmark name or area")
    dest_lat = models.FloatField(help_text="Destination latitude (EPSG:4326)")
    dest_lng = models.FloatField(help_text="Destination longitude (EPSG:4326)")
    dest_point = PointField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS destination Point(longitude, latitude) for spatial indexing"
    )

    # Corridor Waypoints & PostGIS LineString
    intermediate_points = models.JSONField(
        default=list,
        blank=True,
        help_text="List of waypoint dictionaries [{'name': str, 'lat': float, 'lng': float}, ...]"
    )
    route_geometry = models.JSONField(
        default=list,
        blank=True,
        help_text="Detailed GPS/OSRM polyline coordinates as [[lat, lng], ...]"
    )
    route_line = LineStringField(
        geography=True,
        srid=4326,
        null=True,
        blank=True,
        help_text="PostGIS LineString geometry of the corridor for buffer queries and spatial distance matching"
    )

    # Schedule Windows
    departure_time = models.TimeField(help_text="Typical departure time from origin")
    arrival_time = models.TimeField(help_text="Expected arrival time at destination")
    available_days = models.JSONField(
        default=list,
        help_text="Active weekdays list e.g., ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']"
    )

    # Capacity & Detour Preferences
    max_package_weight = models.FloatField(default=3.0, help_text="Maximum carry capacity in kilograms")
    max_package_size = models.CharField(max_length=20, choices=SIZE_CHOICES, default='medium')
    max_detour = models.FloatField(default=1.5, help_text="Maximum acceptable additional detour in kilometers")
    travel_mode = models.CharField(max_length=30, choices=TRAVEL_MODE_CHOICES, default='two_wheeler')

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this route is currently active for receiving matching proposals"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Commuter Route'
        verbose_name_plural = 'Commuter Routes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['commuter', 'is_active']),
            models.Index(fields=['start_lat', 'start_lng']),
            models.Index(fields=['dest_lat', 'dest_lng']),
        ]

    def save(self, *args, **kwargs):
        """
        Maintains synchronization between numeric coordinates, geometry arrays,
        and PostGIS spatial fields (start_point, dest_point, route_line).
        """
        # Synchronize Start Point: Point(x=lng, y=lat)
        if self.start_lat is not None and self.start_lng is not None:
            pt = create_point(lat=self.start_lat, lng=self.start_lng, srid=4326)
            if pt is not None:
                self.start_point = pt

        # Synchronize Destination Point: Point(x=lng, y=lat)
        if self.dest_lat is not None and self.dest_lng is not None:
            pt = create_point(lat=self.dest_lat, lng=self.dest_lng, srid=4326)
            if pt is not None:
                self.dest_point = pt

        # Synchronize Corridor LineString: LineString([(lng, lat), ...])
        pts: list = []
        if self.route_geometry and isinstance(self.route_geometry, list) and len(self.route_geometry) >= 2:
            for coord in self.route_geometry:
                if isinstance(coord, (list, tuple)) and len(coord) >= 2:
                    # In route_geometry, format is [lat, lng]. PostGIS requires (lng, lat)
                    pts.append((float(coord[1]), float(coord[0])))
        elif self.start_lng is not None and self.dest_lng is not None:
            # Fallback direct corridor line between origin and destination
            pts = [(float(self.start_lng), float(self.start_lat)), (float(self.dest_lng), float(self.dest_lat))]

        if len(pts) >= 2:
            line = create_linestring(pts, srid=4326)
            if line is not None:
                self.route_line = line

        super().save(*args, **kwargs)

    def __str__(self):
        owner = self.commuter.name or self.commuter.email
        status = "Active" if self.is_active else "Paused"
        return f"{self.route_name} ({owner}) [{status}]"

    @property
    def direct_corridor_distance_km(self) -> float:
        """Computes direct great-circle corridor distance in km."""
        return haversine_distance_km(self.start_lat, self.start_lng, self.dest_lat, self.dest_lng)

    def is_available_on(self, day_abbr: str) -> bool:
        """Checks if the commuter operates this route on a given weekday (e.g. 'Mon')."""
        if not self.available_days:
            return True
        return day_abbr[:3].title() in [d[:3].title() for d in self.available_days]

    @property
    def active_pooled_deliveries_count(self) -> int:
        """Count of active in-progress package deliveries accepted on this route."""
        return self.matches.filter(
            status='ACCEPTED',
            package__status__in=['MATCHED', 'PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
        ).count()
