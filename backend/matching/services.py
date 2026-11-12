import math
from typing import Tuple, Dict, Any, List, Optional
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


def distance_to_segment_km(p_lat: float, p_lng: float, a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> Tuple[float, float]:
    """
    Calculates perpendicular distance from point P to line segment AB,
    and returns (distance_km, projection_fraction_t).
    """
    ab_dist = haversine_km(a_lat, a_lng, b_lat, b_lng)
    if ab_dist == 0:
        return haversine_km(p_lat, p_lng, a_lat, a_lng), 0.0

    cos_lat = math.cos(math.radians((a_lat + b_lat) / 2.0))
    dx = (b_lng - a_lng) * cos_lat
    dy = b_lat - a_lat
    px = (p_lng - a_lng) * cos_lat
    py = p_lat - a_lat

    denom = dx * dx + dy * dy
    if denom == 0:
        return haversine_km(p_lat, p_lng, a_lat, a_lng), 0.0

    t = max(0.0, min(1.0, (px * dx + py * dy) / denom))
    proj_lat = a_lat + t * (b_lat - a_lat)
    proj_lng = a_lng + t * (b_lng - a_lng)
    return haversine_km(p_lat, p_lng, proj_lat, proj_lng), t


def min_distance_to_route_km(target_lat: float, target_lng: float, route_points: List[Tuple[float, float]]) -> float:
    """Finds the shortest distance from a coordinate to any segment along a polyline."""
    if not route_points:
        return 999.0
    if len(route_points) == 1:
        return haversine_km(target_lat, target_lng, route_points[0][0], route_points[0][1])

    min_dist = 999.0
    for i in range(len(route_points) - 1):
        d, _t = distance_to_segment_km(
            target_lat, target_lng,
            route_points[i][0], route_points[i][1],
            route_points[i+1][0], route_points[i+1][1]
        )
        if d < min_dist:
            min_dist = d
    return round(min_dist, 2)


def project_point_along_route(p_lat: float, p_lng: float, route_points: List[Tuple[float, float]]) -> float:
    """
    Computes the cumulative distance (in km) from route origin to the closest
    perpendicular projection point of P along the multi-segment polyline.
    """
    if not route_points or len(route_points) < 2:
        return 0.0

    best_dist = 9999.0
    best_cumulative = 0.0

    cumulative_at_start = 0.0
    for i in range(len(route_points) - 1):
        a_lat, a_lng = route_points[i]
        b_lat, b_lng = route_points[i+1]
        seg_len = haversine_km(a_lat, a_lng, b_lat, b_lng)

        d, t = distance_to_segment_km(p_lat, p_lng, a_lat, a_lng, b_lat, b_lng)
        if d < best_dist:
            best_dist = d
            best_cumulative = cumulative_at_start + t * seg_len

        cumulative_at_start += seg_len

    return best_cumulative


def calculate_direction_and_overlap(
    route_points: List[Tuple[float, float]],
    p_pick: Tuple[float, float],
    p_dest: Tuple[float, float]
) -> Dict[str, Any]:
    """
    Phase 4: Evaluates corridor direction compatibility and calculates exact route overlap.
    If geometry is insufficient or points coincide, returns an honest unavailable indicator.
    """
    if len(route_points) < 2:
        return {
            'direction_cosine': 1.0,
            'overlap_available': False,
            'route_overlap_percentage': None,
            'is_opposite_direction': False
        }

    # 1. Travel direction cosine similarity
    mid_lat = (route_points[0][0] + route_points[-1][0]) / 2.0
    cos_lat = math.cos(math.radians(mid_lat))
    dx_c = (route_points[-1][1] - route_points[0][1]) * cos_lat
    dy_c = route_points[-1][0] - route_points[0][0]
    mag_c = math.sqrt(dx_c * dx_c + dy_c * dy_c)

    pkg_mid_lat = (p_pick[0] + p_dest[0]) / 2.0
    pkg_cos = math.cos(math.radians(pkg_mid_lat))
    dx_p = (p_dest[1] - p_pick[1]) * pkg_cos
    dy_p = p_dest[0] - p_pick[0]
    mag_p = math.sqrt(dx_p * dx_p + dy_p * dy_p)

    if mag_c < 1e-6 or mag_p < 1e-6:
        return {
            'direction_cosine': 1.0,
            'overlap_available': False,
            'route_overlap_percentage': None,
            'is_opposite_direction': False
        }

    dot = dx_c * dx_p + dy_c * dy_p
    cosine = max(-1.0, min(1.0, dot / (mag_c * mag_p)))
    is_opposite = (cosine < -0.2)

    # 2. Cumulative projection along polyline
    s_pickup = project_point_along_route(p_pick[0], p_pick[1], route_points)
    s_dropoff = project_point_along_route(p_dest[0], p_dest[1], route_points)

    direct_pkg_dist = haversine_km(p_pick[0], p_pick[1], p_dest[0], p_dest[1])
    if direct_pkg_dist < 0.05:
        return {
            'direction_cosine': round(cosine, 3),
            'overlap_available': False,
            'route_overlap_percentage': None,
            'is_opposite_direction': is_opposite
        }

    if s_dropoff > s_pickup and cosine > 0.0:
        shared_km = s_dropoff - s_pickup
        overlap_pct = min(100.0, max(0.0, round((shared_km / direct_pkg_dist) * 100.0, 1)))
        return {
            'direction_cosine': round(cosine, 3),
            'overlap_available': True,
            'route_overlap_percentage': overlap_pct,
            'is_opposite_direction': False
        }
    else:
        # Package moves against the commuter's forward traversal (perpendicular or opposite flow)
        return {
            'direction_cosine': round(cosine, 3),
            'overlap_available': True,
            'route_overlap_percentage': 0.0,
            'is_opposite_direction': is_opposite
        }


def get_remaining_route_capacity(commuter_route) -> float:
    """
    Phase 2: Dynamic Remaining Capacity Tracking.
    Calculates: remaining_capacity = max_package_weight - sum(weights of active in-progress packages).
    Excludes completed, cancelled, or failed deliveries.
    Guarantees non-negative result (>= 0.0).
    """
    from deliveries.models import Delivery
    active_deliveries = Delivery.objects.filter(
        match__commuter_route=commuter_route,
        status__in=['PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
    ).select_related('match__package')

    active_weight = sum(
        d.match.package.weight for d in active_deliveries
        if d.match and d.match.package and d.match.package.weight is not None
    )

    max_weight = float(commuter_route.max_package_weight or 0.0)
    remaining = max(0.0, round(max_weight - active_weight, 2))
    return remaining


def calculate_detour(commuter_route, package) -> Dict[str, Any]:
    """
    Phase 3: Waypoint-Aware Detour Calculation.
    Preserves all of the commuter's original journey waypoints without skipping or deleting any.
    Finds optimal insertion positions (i, j) for Pickup and Dropoff along the sequence:
      W_0 -> ... -> W_i -> Pickup -> W_{i+1} -> ... -> W_j -> Dropoff -> ... -> W_{N-1}
    Uses empirical 1.15 urban road-distance factor and marks distance as estimated.
    """
    # 1. Base waypoints for commuter normal route
    normal_points: List[Tuple[float, float]] = [(commuter_route.start_lat, commuter_route.start_lng)]
    if commuter_route.intermediate_points and isinstance(commuter_route.intermediate_points, list):
        for pt in commuter_route.intermediate_points:
            if isinstance(pt, dict) and 'lat' in pt and 'lng' in pt:
                normal_points.append((float(pt['lat']), float(pt['lng'])))
    normal_points.append((commuter_route.dest_lat, commuter_route.dest_lng))

    # Calculate normal distance across all preserved waypoints
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

    # 3. Waypoint-Preserving Optimal Insertion:
    # Evaluate all pairs 0 <= i <= j <= N-1 to find the route that minimizes travel distance
    n_pts = len(normal_points)
    best_delivery_dist = 99999.0
    best_insertion: Tuple[int, int] = (0, 0)
    best_start_to_pickup_km = 0.0

    for i in range(n_pts):
        for j in range(i, n_pts):
            # Construct candidate sequence with pickup inserted after normal_points[i]
            # and dropoff inserted after normal_points[j]
            seq: List[Tuple[float, float]] = []
            start_to_pick = 0.0
            found_pickup = False

            for k in range(n_pts):
                seq.append(normal_points[k])
                if k == i:
                    seq.append(p_pick)
                    found_pickup = True
                if k == j:
                    seq.append(p_dest)

            # Measure candidate sequence length
            candidate_dist = 0.0
            for idx in range(len(seq) - 1):
                seg_d = haversine_km(seq[idx][0], seq[idx][1], seq[idx+1][0], seq[idx+1][1])
                candidate_dist += seg_d
                if not found_pickup or seq[idx+1] == p_pick:
                    start_to_pick += seg_d

            if candidate_dist < best_delivery_dist:
                best_delivery_dist = candidate_dist
                best_insertion = (i, j)
                best_start_to_pickup_km = start_to_pick

    # Fallback safety if candidate was not found
    if best_delivery_dist >= 99990.0:
        best_delivery_dist = (
            haversine_km(commuter_route.start_lat, commuter_route.start_lng, p_pick[0], p_pick[1]) +
            haversine_km(p_pick[0], p_pick[1], p_dest[0], p_dest[1]) +
            haversine_km(p_dest[0], p_dest[1], commuter_route.dest_lat, commuter_route.dest_lng)
        )
        best_start_to_pickup_km = haversine_km(commuter_route.start_lat, commuter_route.start_lng, p_pick[0], p_pick[1])

    # Urban street grid estimation factor (~1.15)
    normal_road_dist = round(normal_dist * 1.15, 2)
    delivery_road_dist = round(best_delivery_dist * 1.15, 2)
    additional_detour = max(0.0, round(delivery_road_dist - normal_road_dist, 2))

    # Phase 4 direction and overlap evaluation
    dir_info = calculate_direction_and_overlap(normal_points, p_pick, p_dest)

    return {
        'normal_distance': normal_road_dist,
        'delivery_distance': delivery_road_dist,
        'additional_distance': additional_detour,
        'pickup_distance': pickup_proximity,
        'destination_distance': dest_proximity,
        'start_to_pickup_km': round(best_start_to_pickup_km * 1.15, 2),
        'insertion_indices': best_insertion,
        'is_road_distance_estimated': True,
        'road_distance_method': 'Haversine with 1.15 urban street-grid factor',
        'direction_cosine': dir_info['direction_cosine'],
        'overlap_available': dir_info['overlap_available'],
        'route_overlap_percentage': dir_info['route_overlap_percentage'],
        'is_opposite_direction': dir_info['is_opposite_direction']
    }


class MatchingService:
    @staticmethod
    def find_and_record_matches(package) -> List[Match]:
        """
        Runs the full minimum-detour matching engine for a package
        against all registered commuter routes adhering to Phases 1-6:
        - Rejects ineligible commuters with recorded diagnostic reason.
        - Evaluates dynamic remaining capacity.
        - Preserves all waypoints in detour calculation.
        - Computes route overlap and direction compatibility.
        - Normalizes all 8 factors with weighted scoring.
        - Classifies matches into EXACT, NEARBY, or EXTENDED.
        - Ranks candidates (classification -> score desc -> detour asc).
        """
        from commuters.models import CommuterRoute
        from deliveries.models import Delivery
        from notifications.models import Notification

        active_routes = CommuterRoute.objects.filter(is_active=True).select_related('commuter')
        created_matches = []
        max_pooled = getattr(settings, 'MAX_POOLED_PACKAGES_PER_ROUTE', 2)

        for route in active_routes:
            # Phase 2: Dynamic Remaining Weight Capacity & Active Delivery Count
            remaining_cap = get_remaining_route_capacity(route)
            active_deliveries_count = Delivery.objects.filter(
                match__commuter_route=route,
                status__in=['PICKUP_PENDING', 'PICKED_UP', 'IN_TRANSIT']
            ).count()

            # Phase 3: Waypoint-aware Detour & Overlap
            detour_info = calculate_detour(route, package)

            # Phase 1, 5, 6: Score and evaluate feasibility
            score_data = calculate_match_score(
                package=package,
                commuter_route=route,
                normal_distance=detour_info['normal_distance'],
                delivery_distance=detour_info['delivery_distance'],
                additional_detour=detour_info['additional_distance'],
                pickup_distance=detour_info['pickup_distance'],
                destination_distance=detour_info['destination_distance'],
                remaining_capacity=remaining_cap,
                active_deliveries_count=active_deliveries_count,
                max_pooled_packages=max_pooled,
                route_overlap_percentage=detour_info['route_overlap_percentage'],
                overlap_available=detour_info['overlap_available'],
                direction_cosine=detour_info['direction_cosine'],
                start_to_pickup_km=detour_info['start_to_pickup_km']
            )

            # Only eligible commuters receive a proposal/match record
            if score_data['is_eligible']:
                match_defaults = {
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
                }
                existing_match = Match.objects.filter(package=package, commuter_route=route).first()
                if existing_match:
                    for attr, val in match_defaults.items():
                        setattr(existing_match, attr, val)
                    if existing_match.status not in ['REQUESTED', 'ACCEPTED', 'REJECTED']:
                        existing_match.status = 'PROPOSED'
                    existing_match.save()
                    match_obj = existing_match
                else:
                    match_obj = Match.objects.create(
                        package=package,
                        commuter_route=route,
                        status='PROPOSED',
                        **match_defaults
                    )

                # Attach dynamic Phase 7 diagnostics to the Python object for serialization
                match_obj.route_overlap_percentage = detour_info['route_overlap_percentage']
                match_obj.scoring_breakdown = score_data['scoring_breakdown']
                match_obj.feasibility_checks = score_data['feasibility_checks']
                match_obj.disqualification_reason = None
                created_matches.append(match_obj)

        # Phase 6: Multi-tier candidate ranking
        # 1. Match Classification (EXACT -> NEARBY -> EXTENDED)
        # 2. Final Score (descending)
        # 3. Additional Detour (ascending)
        level_order = {'EXACT': 1, 'NEARBY': 2, 'EXTENDED': 3}
        sorted_matches = sorted(
            created_matches,
            key=lambda m: (
                level_order.get(m.match_level, 4),
                -m.final_score,
                m.estimated_detour
            )
        )

        # Assign 1-indexed ordinal rank to each sorted candidate
        for rank_idx, m_obj in enumerate(sorted_matches, start=1):
            m_obj.rank = rank_idx

        # Fallback tier 3: Wait and Notify if no commuter qualifies
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
