import math
import requests
from typing import Tuple, Dict, Any, List
from django.conf import settings
from .models import Match
from .scoring import calculate_match_score

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two geographic coordinates in kilometers."""
    R = 6371.0 # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 3)

def distance_to_segment_km(p_lat: float, p_lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    """Calculates perpendicular distance from point P to line segment AB."""
    ab_dist = haversine_km(a_lat, a_lng, b_lat, b_lng)
    if ab_dist == 0:
        return haversine_km(p_lat, p_lng, a_lat, a_lng)

    # Project point onto segment using approximate local planar Cartesian
    cos_lat = math.cos(math.radians((a_lat + b_lat) / 2.0))
    dx = (b_lng - a_lng) * cos_lat
    dy = b_lat - a_lat
    px = (p_lng - a_lng) * cos_lat
    py = p_lat - a_lat

    t = max(0.0, min(1.0, (px * dx + py * dy) / (dx * dx + dy * dy)))
    proj_lat = a_lat + t * (b_lat - a_lat)
    proj_lng = a_lng + t * (b_lng - a_lng)
    return haversine_km(p_lat, p_lng, proj_lat, proj_lng)

def min_distance_to_route_km(target_lat: float, target_lng: float, route_points: List[Tuple[float, float]]) -> float:
    """Finds the shortest distance from a coordinate to any segment along a polyline."""
    if not route_points:
        return 999.0
    if len(route_points) == 1:
        return haversine_km(target_lat, target_lng, route_points[0][0], route_points[0][1])

    min_dist = 999.0
    for i in range(len(route_points) - 1):
        d = distance_to_segment_km(
            target_lat, target_lng,
            route_points[i][0], route_points[i][1],
            route_points[i+1][0], route_points[i+1][1]
        )
        if d < min_dist:
            min_dist = d
    return round(min_dist, 2)

def calculate_detour(commuter_route, package) -> Dict[str, float]:
    """
    Core Technical Algorithm:
    Calculates the commuter's normal travel distance vs the total journey with the package detour.
    
    Normal Journey:
      Commuter Start -> [Intermediate Waypoints] -> Commuter Destination
    
    Delivery Journey:
      Commuter Start -> Package Pickup -> Package Dropoff -> Commuter Destination
    
    Additional Travel (Detour):
      Delivery Distance - Normal Distance
    """
    # 1. Base waypoints for commuter normal route
    normal_points = [(commuter_route.start_lat, commuter_route.start_lng)]
    for pt in commuter_route.intermediate_points:
        if isinstance(pt, dict) and 'lat' in pt and 'lng' in pt:
            normal_points.append((float(pt['lat']), float(pt['lng'])))
    normal_points.append((commuter_route.dest_lat, commuter_route.dest_lng))

    # Calculate normal distance
    normal_dist = 0.0
    for i in range(len(normal_points) - 1):
        normal_dist += haversine_km(
            normal_points[i][0], normal_points[i][1],
            normal_points[i+1][0], normal_points[i+1][1]
        )

    # 2. Package pickup and destination coordinates
    p_pick = (package.pickup_lat, package.pickup_lng)
    p_dest = (package.dest_lat, package.dest_lng)

    # Proximity from route corridor to pickup & destination
    pickup_proximity = min_distance_to_route_km(p_pick[0], p_pick[1], normal_points)
    dest_proximity = min_distance_to_route_km(p_dest[0], p_dest[1], normal_points)

    # 3. Delivery Journey:
    # Commuter Start -> Pickup -> Package Dropoff -> Commuter Destination
    delivery_dist = (
        haversine_km(commuter_route.start_lat, commuter_route.start_lng, p_pick[0], p_pick[1]) +
        haversine_km(p_pick[0], p_pick[1], p_dest[0], p_dest[1]) +
        haversine_km(p_dest[0], p_dest[1], commuter_route.dest_lat, commuter_route.dest_lng)
    )

    # In an urban street grid, detour is slightly higher than direct great-circle (empirical factor ~1.15)
    # Apply detour factor
    normal_road_dist = round(normal_dist * 1.15, 2)
    delivery_road_dist = round(delivery_dist * 1.15, 2)
    additional_detour = max(0.0, round(delivery_road_dist - normal_road_dist, 2))

    return {
        'normal_distance': normal_road_dist,
        'delivery_distance': delivery_road_dist,
        'additional_distance': additional_detour,
        'pickup_distance': pickup_proximity,
        'destination_distance': dest_proximity
    }

class MatchingService:
    @staticmethod
    def find_and_record_matches(package) -> List[Match]:
        """
        Runs the full minimum-detour matching engine for a package
        against all active commuter routes adhering to the 3 fallback tiers:
        1. Exact Match: Close corridor alignment (detour <= 0.6km, pickup/drop <= 0.8km).
        2. Nearby Match: Compatible corridor within commuter's declared max_detour.
        3. Wait & Notify: If no commuter qualifies, package remains in SEARCHING and
           a notification is logged for the vendor.
        """
        from commuters.models import CommuterRoute
        from deliveries.models import Delivery
        from notifications.models import Notification

        active_routes = CommuterRoute.objects.filter(is_active=True).select_related('commuter')
        created_matches = []

        for route in active_routes:
            # Check package pooling limit (max 2 active deliveries per commuter route)
            active_deliveries_count = Delivery.objects.filter(
                match__commuter_route=route,
                status__in=['PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
            ).count()

            if active_deliveries_count >= settings.MAX_POOLED_PACKAGES_PER_ROUTE:
                continue

            # Calculate detours
            detour_info = calculate_detour(route, package)

            # Score compatibility
            score_data = calculate_match_score(
                package=package,
                commuter_route=route,
                normal_distance=detour_info['normal_distance'],
                delivery_distance=detour_info['delivery_distance'],
                additional_detour=detour_info['additional_distance'],
                pickup_distance=detour_info['pickup_distance'],
                destination_distance=detour_info['destination_distance']
            )

            if score_data['is_eligible']:
                match_obj, created = Match.objects.update_or_create(
                    package=package,
                    commuter_route=route,
                    defaults={
                        'pickup_distance': detour_info['pickup_distance'],
                        'destination_distance': detour_info['destination_distance'],
                        'normal_distance': detour_info['normal_distance'],
                        'delivery_distance': detour_info['delivery_distance'],
                        'estimated_detour': detour_info['additional_distance'],
                        'time_score': score_data['time_score'],
                        'package_score': score_data['package_score'],
                        'route_score': score_data['route_score'],
                        'reliability_score': score_data['reliability_score'],
                        'detour_penalty': score_data['detour_penalty'],
                        'final_score': score_data['final_score'],
                        'match_level': score_data['match_level'],
                        'status': 'PROPOSED'
                    }
                )
                created_matches.append(match_obj)

        sorted_matches = sorted(
            created_matches,
            key=lambda m: (1 if m.match_level == 'EXACT' else 2, -m.final_score, m.estimated_detour)
        )

        # Fallback tier 3: Wait and Notify if no match found
        if not sorted_matches and package.status == 'SEARCHING':
            Notification.objects.get_or_create(
                user=package.vendor.user,
                title="Searching Commuter Corridors",
                message=f"No direct commuter matches currently available for '{package.package_name}'. Your package remains active in the pool and RoutePool will match it automatically as commuters register routes."
            )
        elif sorted_matches:
            top = sorted_matches[0]
            Notification.objects.get_or_create(
                user=package.vendor.user,
                title=f"{top.get_match_level_display()} Found",
                message=f"Found {len(sorted_matches)} commuter match(es) for '{package.package_name}'. Top match with {top.commuter_route.commuter.name} (+{top.estimated_detour}km detour, score {top.final_score}%)."
            )

        return sorted_matches
