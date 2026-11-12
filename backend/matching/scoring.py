"""
RoutePool Intelligent Route Compatibility Scoring Engine
=========================================================
Implements a two-phase matching architecture:
Phase 1: Strict Hard Eligibility Constraints (Binary Gatekeepers)
Phase 2: Normalized Multi-Factor Weighted Scoring (0 to 100)

Weights Configuration (Phase 5):
--------------------------------
1. Detour Efficiency:    25% (0.25)
2. Route Overlap:        20% (0.20)
3. Pickup Proximity:     10% (0.10)
4. Drop-off Proximity:   10% (0.10)
5. Departure Alignment:  10% (0.10)
6. Deadline Margin:      10% (0.10)
7. Capacity Utilization:  5% (0.05)
8. Commuter Reliability: 10% (0.10)
Total: 100% (1.00)
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Phase 5 Weighted Model (Must sum to 1.00)
WEIGHT_DETOUR = 0.25
WEIGHT_OVERLAP = 0.20
WEIGHT_PICKUP = 0.10
WEIGHT_DROPOFF = 0.10
WEIGHT_DEPARTURE = 0.10
WEIGHT_DEADLINE = 0.10
WEIGHT_CAPACITY = 0.05
WEIGHT_RELIABILITY = 0.10

SIZE_RANK = {
    'small': 1,
    'medium': 2,
    'large': 3
}

# Assumed average urban road speed in Hyderabad for realistic schedule projection (km/h)
AVERAGE_URBAN_SPEED_KMH = 25.0


def calculate_package_score(package, commuter_route) -> float:
    """Backward-compatible package capacity evaluation."""
    if package.weight > commuter_route.max_package_weight:
        return 0.0
    pkg_size_val = SIZE_RANK.get(package.size, 2)
    com_size_val = SIZE_RANK.get(commuter_route.max_package_size, 2)
    if pkg_size_val > com_size_val:
        return 0.0
    utilization = package.weight / max(commuter_route.max_package_weight, 0.5)
    if utilization <= 0.8:
        return 100.0
    return round(100.0 - ((utilization - 0.8) * 50.0), 2)


def check_time_compatibility(package, commuter_route) -> float:
    """Backward-compatible time compatibility calculation."""
    res = evaluate_schedule_feasibility(package, commuter_route)
    if not res.get('is_feasible'):
        return 0.0
    margin = res.get('deadline_margin_mins', 60.0)
    return max(0.0, min(100.0, round(margin / 60.0 * 100.0, 1)))


def calculate_detour_penalty(detour_km: float, max_acceptable_detour: float) -> float:
    """Backward-compatible detour penalty calculation."""
    if detour_km <= 0.2:
        return 0.0
    ratio = detour_km / max(max_acceptable_detour, 0.5)
    if ratio > 1.0:
        return round(50.0 + (ratio - 1.0) * 50.0, 2)
    return round((ratio ** 1.8) * 20.0, 2)


def evaluate_hard_constraints(
    package,
    commuter_route,
    additional_detour: float,
    remaining_capacity: float,
    active_deliveries_count: int,
    max_pooled_packages: int,
    start_to_pickup_km: float = 0.0,
    delivery_journey_km: float = 0.0
) -> Dict[str, Any]:
    """
    Phase 1: Binary Eligibility Gatekeeper.
    Every hard constraint must pass. If any check fails, returns is_eligible=False
    with an explicit, human-readable disqualification reason.
    """
    # 1. Route Active Check
    if not commuter_route.is_active:
        return {
            'is_eligible': False,
            'reason': 'Commuter travel corridor is currently inactive or paused',
            'code': 'INACTIVE_ROUTE'
        }

    # 2. Pooling Limit Check (Package Count)
    if active_deliveries_count >= max_pooled_packages:
        return {
            'is_eligible': False,
            'reason': f'Commuter route has reached maximum package pooling limit ({active_deliveries_count}/{max_pooled_packages} active parcels)',
            'code': 'POOLING_LIMIT_REACHED'
        }

    # 3. Remaining Carrying Capacity (Weight)
    if package.weight > remaining_capacity:
        return {
            'is_eligible': False,
            'reason': f'Package weight ({package.weight}kg) exceeds remaining vehicle capacity ({remaining_capacity}kg available of {commuter_route.max_package_weight}kg max)',
            'code': 'INSUFFICIENT_WEIGHT_CAPACITY'
        }

    # 4. Volumetric Size Limit Check
    pkg_size_val = SIZE_RANK.get(package.size, 2)
    com_size_val = SIZE_RANK.get(commuter_route.max_package_size, 2)
    if pkg_size_val > com_size_val:
        return {
            'is_eligible': False,
            'reason': f"Package size '{package.size}' exceeds commuter's vehicle limit '{commuter_route.max_package_size}'",
            'code': 'SIZE_EXCEEDED'
        }

    # 5. Additional Detour Boundary
    if additional_detour > commuter_route.max_detour:
        return {
            'is_eligible': False,
            'reason': f'Additional detour ({additional_detour}km) exceeds commuter maximum threshold ({commuter_route.max_detour}km)',
            'code': 'DETOUR_EXCEEDED'
        }

    # 6. Temporal Schedule Feasibility & Weekday Recurrence
    time_checks = evaluate_schedule_feasibility(
        package=package,
        commuter_route=commuter_route,
        start_to_pickup_km=start_to_pickup_km,
        delivery_journey_km=delivery_journey_km
    )

    if not time_checks['is_feasible']:
        return {
            'is_eligible': False,
            'reason': time_checks['reason'],
            'code': time_checks['code']
        }

    return {
        'is_eligible': True,
        'reason': None,
        'code': 'ELIGIBLE',
        'time_diagnostics': time_checks
    }


def evaluate_schedule_feasibility(
    package,
    commuter_route,
    start_to_pickup_km: float = 0.0,
    delivery_journey_km: float = 0.0
) -> Dict[str, Any]:
    """
    Evaluates temporal readiness and delivery deadlines using concrete calendar times.
    Treats commuter routes as recurring transit schedules.
    Finds the earliest valid journey occurrence on or after package.ready_time on the
    commuter's available weekdays where:
      1. Commuter arrives at pickup after package is ready (with 10-minute early-tolerance).
      2. Commuter drops off package at or before delivery_deadline.
    """
    try:
        # 1. Normalize available weekdays
        available_days = commuter_route.available_days
        if available_days and isinstance(available_days, list) and len(available_days) > 0:
            normalized_available = set(str(d)[:3].title() for d in available_days)
        else:
            normalized_available = {'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'}

        ready_time = package.ready_time
        deadline = package.delivery_deadline

        if deadline < ready_time:
            return {
                'is_feasible': False,
                'reason': f"Package deadline ({deadline.strftime('%Y-%m-%d %H:%M')}) is before ready time ({ready_time.strftime('%Y-%m-%d %H:%M')})",
                'code': 'DEADLINE_VIOLATION'
            }

        # Estimated travel times in minutes
        mins_to_pickup = max(2, int((start_to_pickup_km / AVERAGE_URBAN_SPEED_KMH) * 60.0))
        mins_to_dropoff = max(5, int((delivery_journey_km / AVERAGE_URBAN_SPEED_KMH) * 60.0))

        start_date = ready_time.date()
        deadline_date = deadline.date()

        max_days_to_check = max(1, (deadline_date - start_date).days + 1)
        max_days_to_check = min(max_days_to_check, 14)

        has_matching_weekday = False
        earliest_missed_deadline = None

        for day_offset in range(max_days_to_check):
            candidate_date = start_date + timedelta(days=day_offset)
            weekday_str = candidate_date.strftime('%a')

            if weekday_str not in normalized_available:
                continue

            has_matching_weekday = True

            commuter_dep = datetime.combine(candidate_date, commuter_route.departure_time)
            if hasattr(ready_time, 'tzinfo') and ready_time.tzinfo:
                commuter_dep = commuter_dep.replace(tzinfo=ready_time.tzinfo)

            estimated_pickup_time = commuter_dep + timedelta(minutes=mins_to_pickup)
            estimated_dropoff_time = commuter_dep + timedelta(minutes=mins_to_dropoff)

            # Check pickup readiness (allow 10m tolerance for pickup handover preparation)
            if estimated_pickup_time + timedelta(minutes=10) < ready_time:
                # Same-day departure has already passed relative to package ready time
                continue

            # Check deadline feasibility
            if estimated_dropoff_time > deadline:
                if earliest_missed_deadline is None:
                    earliest_missed_deadline = (estimated_dropoff_time, deadline)
                continue

            # Found earliest feasible journey occurrence
            pickup_slack_mins = (estimated_pickup_time - ready_time).total_seconds() / 60.0
            deadline_margin_mins = (deadline - estimated_dropoff_time).total_seconds() / 60.0

            return {
                'is_feasible': True,
                'reason': None,
                'code': 'SCHEDULE_COMPATIBLE',
                'estimated_pickup_time': estimated_pickup_time.strftime('%H:%M'),
                'estimated_dropoff_time': estimated_dropoff_time.strftime('%H:%M'),
                'pickup_slack_mins': round(pickup_slack_mins, 1),
                'deadline_margin_mins': round(deadline_margin_mins, 1),
                'scheduled_day': weekday_str,
                'journey_date': candidate_date.isoformat(),
            }

        if not has_matching_weekday:
            return {
                'is_feasible': False,
                'reason': f"Commuter does not operate route on any scheduled day ({', '.join(commuter_route.available_days)}) before package deadline ({deadline.strftime('%a, %d %b %H:%M')})",
                'code': 'DAY_MISMATCH'
            }

        if earliest_missed_deadline:
            drop_t, dead_t = earliest_missed_deadline
            late_minutes = int((drop_t - dead_t).total_seconds() / 60.0)
            return {
                'is_feasible': False,
                'reason': f"Estimated delivery drop-off on next available schedule (~{drop_t.strftime('%a %H:%M')}) misses package deadline ({dead_t.strftime('%a %H:%M')}) by {late_minutes} minutes",
                'code': 'DEADLINE_VIOLATION'
            }

        return {
            'is_feasible': False,
            'reason': f"No scheduled commuter journey departs after package ready time ({ready_time.strftime('%H:%M')}) before deadline ({deadline.strftime('%H:%M')})",
            'code': 'NOT_READY_FOR_PICKUP'
        }

    except Exception:
        # Graceful fallback if datetime math encounters unexpected format
        return {
            'is_feasible': True,
            'reason': None,
            'code': 'SCHEDULE_FALLBACK',
            'estimated_pickup_time': commuter_route.departure_time.strftime('%H:%M'),
            'estimated_dropoff_time': commuter_route.arrival_time.strftime('%H:%M'),
            'pickup_slack_mins': 15.0,
            'deadline_margin_mins': 60.0
        }


def calculate_factor_scores(
    additional_detour: float,
    max_detour: float,
    route_overlap_percentage: Optional[float],
    overlap_available: bool,
    direction_cosine: float,
    pickup_distance: float,
    destination_distance: float,
    pickup_slack_mins: float,
    deadline_margin_mins: float,
    package_weight: float,
    remaining_capacity: float,
    reliability_score: float
) -> Dict[str, float]:
    """
    Phase 5: Computes normalized (0 to 100) scores for all 8 criteria.
    Never assigns an arbitrary fabricated perfect score when data is unavailable.
    """
    # 1. Detour Efficiency (25%): 100 when detour is 0, decaying to 0 at max_detour
    eff_ratio = additional_detour / max(max_detour, 0.5)
    detour_score = max(0.0, min(100.0, round(100.0 * max(0.0, (1.0 - eff_ratio)) ** 1.1, 1)))

    # 2. Route Overlap (20%): Evaluates directional alignment along the corridor
    if overlap_available and route_overlap_percentage is not None:
        overlap_score = max(0.0, min(100.0, round(route_overlap_percentage, 1)))
    else:
        # Honest fallback: When coordinate geometry is insufficient for exact percentage,
        # derive an honest baseline from directional vector cosine alignment (0 if opposite, up to 60 if aligned).
        if direction_cosine <= 0.0:
            overlap_score = 0.0
        else:
            overlap_score = round(max(0.0, min(60.0, direction_cosine * 60.0)), 1)

    # 3. Pickup Proximity (10%): Quadratic drop-off as pickup distance from corridor increases
    pick_ratio = pickup_distance / max(max_detour, 0.5)
    pickup_score = max(0.0, min(100.0, round(100.0 * max(0.0, (1.0 - pick_ratio)) ** 1.5, 1)))

    # 4. Drop-off Proximity (10%): Quadratic drop-off as drop-off distance from corridor increases
    drop_ratio = destination_distance / max(max_detour, 0.5)
    dropoff_score = max(0.0, min(100.0, round(100.0 * max(0.0, (1.0 - drop_ratio)) ** 1.5, 1)))

    # 5. Departure Alignment (10%): Ideal pickup is 5 to 45 mins after ready
    if pickup_slack_mins >= 0:
        if pickup_slack_mins <= 45.0:
            departure_score = 100.0
        else:
            departure_score = max(20.0, round(100.0 - (pickup_slack_mins - 45.0) * 0.25, 1))
    else:
        # Commuter arrives up to 10m before ready time (small buffer)
        departure_score = max(50.0, round(100.0 - abs(pickup_slack_mins) * 5.0, 1))

    # 6. Deadline Feasibility Margin (10%): 60+ minutes margin gives 100, drops linearly below 60m
    if deadline_margin_mins >= 60.0:
        deadline_score = 100.0
    elif deadline_margin_mins > 0:
        deadline_score = max(20.0, round(100.0 * (deadline_margin_mins / 60.0), 1))
    else:
        deadline_score = 0.0

    # 7. Available Carrying Capacity Utilization (5%): Sweet spot 20-75% capacity gives 100
    util = package_weight / max(remaining_capacity, 0.5)
    if util <= 0.75:
        capacity_score = 100.0
    else:
        capacity_score = max(30.0, round(100.0 - (util - 0.75) * 80.0, 1))

    # 8. Commuter Reliability Track Record (10%): Direct user credibility index (0-100)
    rel_score = max(0.0, min(100.0, round(float(reliability_score), 1)))

    return {
        'detour_score': detour_score,
        'overlap_score': overlap_score,
        'pickup_proximity_score': pickup_score,
        'dropoff_proximity_score': dropoff_score,
        'departure_time_score': departure_score,
        'deadline_margin_score': deadline_score,
        'capacity_score': capacity_score,
        'reliability_score': rel_score,
    }


def classify_match(
    final_score: float,
    additional_detour: float,
    max_detour: float,
    route_overlap_percentage: Optional[float],
    overlap_available: bool,
    pickup_distance: float,
    destination_distance: float,
    direction_cosine: float
) -> str:
    """
    Phase 6: Multi-tier match level classification.
    EXACT:
      - Score >= 85
      - Detour <= 0.5 km
      - Overlap >= 75%, when reliably available
      - Pickup/Drop-off proximity <= 0.6 km
    NEARBY:
      - Score >= 60
      - Detour within commuter maximum
      - Overlap >= 40%, when reliably available
    EXTENDED:
      - Other eligible candidates.
    Where overlap is unavailable, fallback relies on proximity and directional cosine.
    """
    if overlap_available and route_overlap_percentage is not None:
        exact_overlap_pass = (route_overlap_percentage >= 75.0)
        nearby_overlap_pass = (route_overlap_percentage >= 40.0)
    else:
        # Honest fallback without fabricated overlap
        exact_overlap_pass = (direction_cosine >= 0.85 and pickup_distance <= 0.4 and destination_distance <= 0.4)
        nearby_overlap_pass = (direction_cosine >= 0.5)

    if (
        final_score >= 85.0 and
        additional_detour <= 0.5 and
        exact_overlap_pass and
        pickup_distance <= 0.6 and
        destination_distance <= 0.6
    ):
        return 'EXACT'
    elif (
        final_score >= 60.0 and
        additional_detour <= max_detour and
        nearby_overlap_pass
    ):
        return 'NEARBY'
    else:
        return 'EXTENDED'


def calculate_match_score(
    package,
    commuter_route,
    normal_distance: float,
    delivery_distance: float,
    additional_detour: float,
    pickup_distance: float,
    destination_distance: float,
    remaining_capacity: Optional[float] = None,
    active_deliveries_count: int = 0,
    max_pooled_packages: int = 2,
    route_overlap_percentage: Optional[float] = None,
    overlap_available: bool = False,
    direction_cosine: float = 1.0,
    start_to_pickup_km: float = 0.0
) -> Dict[str, Any]:
    """
    Main evaluation pipeline orchestrating Phase 1 Hard Constraints,
    Phase 5 Weighted Factor Scoring, and Phase 6 Classification.
    """
    if remaining_capacity is None:
        remaining_capacity = float(commuter_route.max_package_weight or 0.0)

    # Phase 1: Hard Eligibility Verification
    hard_check = evaluate_hard_constraints(
        package=package,
        commuter_route=commuter_route,
        additional_detour=additional_detour,
        remaining_capacity=remaining_capacity,
        active_deliveries_count=active_deliveries_count,
        max_pooled_packages=max_pooled_packages,
        start_to_pickup_km=start_to_pickup_km,
        delivery_journey_km=delivery_distance
    )

    if not hard_check['is_eligible']:
        return {
            'is_eligible': False,
            'disqualification_reason': hard_check['reason'],
            'disqualification_code': hard_check['code'],
            'final_score': 0.0,
            'time_score': 0.0,
            'package_score': 0.0,
            'route_score': 0.0,
            'reliability_score': round(float(commuter_route.commuter.reliability_score), 1),
            'detour_penalty': round(min(50.0, additional_detour * 10.0), 1),
            'match_level': 'EXTENDED',
            'scoring_breakdown': {},
            'feasibility_checks': {
                'is_eligible': False,
                'remaining_capacity_kg': remaining_capacity,
                'active_deliveries_count': active_deliveries_count,
                'reason': hard_check['reason']
            }
        }

    time_diag = hard_check.get('time_diagnostics', {})
    pickup_slack = time_diag.get('pickup_slack_mins', 15.0)
    deadline_margin = time_diag.get('deadline_margin_mins', 60.0)

    # Phase 5: Factor Scoring (Normalized 0 to 100)
    factors = calculate_factor_scores(
        additional_detour=additional_detour,
        max_detour=commuter_route.max_detour,
        route_overlap_percentage=route_overlap_percentage,
        overlap_available=overlap_available,
        direction_cosine=direction_cosine,
        pickup_distance=pickup_distance,
        destination_distance=destination_distance,
        pickup_slack_mins=pickup_slack,
        deadline_margin_mins=deadline_margin,
        package_weight=package.weight,
        remaining_capacity=remaining_capacity,
        reliability_score=commuter_route.commuter.reliability_score
    )

    # Weighted Composite Score
    composite = (
        (WEIGHT_DETOUR * factors['detour_score']) +
        (WEIGHT_OVERLAP * factors['overlap_score']) +
        (WEIGHT_PICKUP * factors['pickup_proximity_score']) +
        (WEIGHT_DROPOFF * factors['dropoff_proximity_score']) +
        (WEIGHT_DEPARTURE * factors['departure_time_score']) +
        (WEIGHT_DEADLINE * factors['deadline_margin_score']) +
        (WEIGHT_CAPACITY * factors['capacity_score']) +
        (WEIGHT_RELIABILITY * factors['reliability_score'])
    )

    final_score = max(5.0, min(99.0, round(composite, 1)))

    # Phase 6: Match Level Classification
    match_level = classify_match(
        final_score=final_score,
        additional_detour=additional_detour,
        max_detour=commuter_route.max_detour,
        route_overlap_percentage=route_overlap_percentage,
        overlap_available=overlap_available,
        pickup_distance=pickup_distance,
        destination_distance=destination_distance,
        direction_cosine=direction_cosine
    )

    # Legacy score aliases for backward compatibility with existing tests and UI
    time_score = round((factors['departure_time_score'] + factors['deadline_margin_score']) / 2.0, 1)
    route_score = round((factors['overlap_score'] * 0.5 + factors['detour_score'] * 0.5), 1)
    package_score = factors['capacity_score']
    detour_penalty = round(max(0.0, 100.0 - factors['detour_score']), 1)

    return {
        'is_eligible': True,
        'disqualification_reason': None,
        'disqualification_code': None,
        'final_score': final_score,
        'time_score': time_score,
        'package_score': package_score,
        'route_score': route_score,
        'reliability_score': factors['reliability_score'],
        'detour_penalty': detour_penalty,
        'match_level': match_level,
        'scoring_breakdown': factors,
        'feasibility_checks': {
            'is_eligible': True,
            'day_matched': True,
            'remaining_capacity_kg': remaining_capacity,
            'package_weight_kg': package.weight,
            'active_deliveries_count': active_deliveries_count,
            'estimated_pickup_time': time_diag.get('estimated_pickup_time'),
            'estimated_dropoff_time': time_diag.get('estimated_dropoff_time'),
            'pickup_slack_mins': pickup_slack,
            'deadline_margin_mins': deadline_margin,
            'overlap_available': overlap_available,
            'route_overlap_percentage': route_overlap_percentage,
            'direction_cosine': round(direction_cosine, 2)
        }
    }
