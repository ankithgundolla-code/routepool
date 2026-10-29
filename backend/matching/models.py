from django.db import models
from packages.models import Package
from commuters.models import CommuterRoute

class Match(models.Model):
    STATUS_CHOICES = (
        ('PROPOSED', 'Proposed Candidate'),
        ('REQUESTED', 'Requested by Vendor'),
        ('ACCEPTED', 'Accepted by Commuter'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
    )

    LEVEL_CHOICES = (
        ('EXACT', 'Level 1: Exact Corridor Match'),
        ('NEARBY', 'Level 2: Nearby Route Match'),
        ('EXTENDED', 'Level 3: Extended / Secondary Match'),
    )

    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='matches')
    commuter_route = models.ForeignKey(CommuterRoute, on_delete=models.CASCADE, related_name='matches')

    # Distance metrics (km)
    pickup_distance = models.FloatField(default=0.0)      # Distance from route to pickup
    destination_distance = models.FloatField(default=0.0) # Distance from drop to route
    normal_distance = models.FloatField(default=0.0)      # Commuter normal route length
    delivery_distance = models.FloatField(default=0.0)    # Commuter route including pickup & drop
    estimated_detour = models.FloatField(default=0.0)     # Additional travel = delivery - normal

    # Component Scores (0 to 100)
    time_score = models.FloatField(default=0.0)
    package_score = models.FloatField(default=0.0)
    route_score = models.FloatField(default=0.0)
    reliability_score = models.FloatField(default=100.0)
    detour_penalty = models.FloatField(default=0.0)
    final_score = models.FloatField(default=0.0)

    match_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='NEARBY')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROPOSED')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-final_score', 'estimated_detour']
        unique_together = ('package', 'commuter_route')

    def __str__(self):
        return f"Match #{self.id}: Pkg-{self.package.id} & Route-{self.commuter_route.id} (Detour: {self.estimated_detour}km, Score: {self.final_score}%)"
