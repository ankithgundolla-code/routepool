from typing import Dict, Any

WEIGHT_ROUTE = 0.40
WEIGHT_TIME = 0.25
WEIGHT_PACKAGE = 0.20
WEIGHT_RELIABILITY = 0.15

SIZE_RANK = {
    'small': 1,
    'medium': 2,
    'large': 3
}

def calculate_package_score(package, commuter_route) -> float:
    if package.weight > commuter_route.max_package_weight:
        return 0.0

    pkg_size_val = SIZE_RANK.get(package.size, 2)
    com_size_val = SIZE_RANK.get(commuter_route.max_package_size, 2)
    if pkg_size_val > com_size_val:
        return 0.0

    utilization = package.weight / max(commuter_route.max_package_weight, 0.5)
    if utilization <= 0.8:
        return 100.0
    else:
        return round(100.0 - ((utilization - 0.8) * 50.0), 2)

def check_time_compatibility(package, commuter_route) -> float:
    try:
        c_dep_mins = commuter_route.departure_time.hour * 60 + commuter_route.departure_time.minute
        c_arr_mins = commuter_route.arrival_time.hour * 60 + commuter_route.arrival_time.minute

        if c_arr_mins < c_dep_mins:
            c_arr_mins += 24 * 60

        p_ready_mins = package.ready_time.hour * 60 + package.ready_time.minute
        p_dead_mins = package.delivery_deadline.hour * 60 + package.delivery_deadline.minute

        if p_dead_mins < p_ready_mins:
            p_dead_mins += 24 * 60

        dep_slack = c_dep_mins - p_ready_mins
        arr_slack = p_dead_mins - c_arr_mins

        if dep_slack < -30 or arr_slack < -30:
            return 0.0

        score = 100.0
        if dep_slack < 0:
            score -= abs(dep_slack) * 1.5
        if arr_slack < 0:
            score -= abs(arr_slack) * 1.5

        return max(0.0, min(100.0, round(score, 1)))
    except Exception:
        return 85.0

def calculate_detour_penalty(detour_km: float, max_acceptable_detour: float) -> float:
    if detour_km <= 0.2:
        return 0.0
    
    ratio = detour_km / max(max_acceptable_detour, 0.5)
    if ratio > 1.0:
        return 50.0 + (ratio - 1.0) * 50.0
    
    return round((ratio ** 1.8) * 20.0, 2)

def calculate_match_score(
    package,
    commuter_route,
    normal_distance: float,
    delivery_distance: float,
    additional_detour: float,
    pickup_distance: float,
    destination_distance: float
) -> Dict[str, Any]:
    package_score = calculate_package_score(package, commuter_route)
    if package_score <= 0.0:
        return {
            'is_eligible': False,
            'reason': 'Package weight or size exceeds commuter capacity',
            'final_score': 0.0,
            'time_score': 0.0,
            'package_score': 0.0,
            'route_score': 0.0,
            'reliability_score': commuter_route.commuter.reliability_score,
            'detour_penalty': 0.0,
            'match_level': 'EXACT'
        }

    if additional_detour > commuter_route.max_detour * 1.25:
        return {
            'is_eligible': False,
            'reason': f'Detour ({additional_detour}km) exceeds max detour limit ({commuter_route.max_detour}km)',
            'final_score': 0.0,
            'time_score': 0.0,
            'package_score': package_score,
            'route_score': 0.0,
            'reliability_score': commuter_route.commuter.reliability_score,
            'detour_penalty': 50.0,
            'match_level': 'NEARBY'
        }

    route_efficiency = max(0.0, 1.0 - (additional_detour / max(commuter_route.max_detour, 0.5)))
    route_score = round(route_efficiency * 100.0, 2)
    time_score = check_time_compatibility(package, commuter_route)
    reliability_score = min(100.0, max(0.0, float(commuter_route.commuter.reliability_score)))
    detour_penalty = calculate_detour_penalty(additional_detour, commuter_route.max_detour)

    composite = (
        (WEIGHT_ROUTE * route_score) +
        (WEIGHT_TIME * time_score) +
        (WEIGHT_PACKAGE * package_score) +
        (WEIGHT_RELIABILITY * reliability_score)
    ) - detour_penalty

    final_score = max(5.0, min(99.0, round(composite, 1)))

    if additional_detour <= 0.6 and pickup_distance <= 0.8 and destination_distance <= 0.8:
        match_level = 'EXACT'
    elif additional_detour <= commuter_route.max_detour:
        match_level = 'NEARBY'
    else:
        match_level = 'EXTENDED'

    return {
        'is_eligible': True,
        'final_score': final_score,
        'route_score': route_score,
        'time_score': time_score,
        'package_score': package_score,
        'reliability_score': reliability_score,
        'detour_penalty': detour_penalty,
        'match_level': match_level
    }
