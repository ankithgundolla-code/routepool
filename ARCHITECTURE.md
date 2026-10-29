# RoutePool System Architecture

## Architecture Diagram

```
+-------------------------------------------------------------------------+
|                         React SPA (TypeScript + Vite)                   |
| - Tailwind CSS Design Constitution (Deep Dark & Emerald Sustainability) |
| - Leaflet OpenStreetMap Visualizer & Interactive Handover OTP Station    |
| - Role Portals: Vendor Dashboard | Commuter Hub | Admin Operations       |
+-------------------------------------------------------------------------+
                                    │
                                    │ HTTP / JSON API (JWT Bearer Token)
                                    ▼
+-------------------------------------------------------------------------+
|                  Django REST API Gateway (Django 5.1)                   |
| - SimpleJWT Authentication & RBAC (Vendor, Commuter, Admin)             |
| - CORS & Input Data Sanitization Serializers                            |
+-------------------------------------------------------------------------+
                                    │
                                    │ Dispatches business logic
                                    ▼
+-------------------------------------------------------------------------+
|               RoutePool Service Layer (Django Services)                 |
|                                                                         |
|  [MatchingService]               [ScoringEngine]                        |
|  - calculate_detour()            - Multi-factor compatibility weights   |
|  - 3-level tiering               - Capacity & time validation           |
|  - Package pooling (max 2 pkgs)  - Detour penalty curve                 |
|                                                                         |
|  [DeliveryLifecycle]             [EcoImpactCalculator]                  |
|  - Dual-OTP Verification         - 0.144 kg CO2 / avoided km factor     |
|  - State machine transitions     - Avoided dedicated trip displacement  |
|  - Re-matching upon cancel       - Financial clearinghouse (75/25 split)|
+-------------------------------------------------------------------------+
                                    │
                                    │ Django ORM QuerySets & Indexes
                                    ▼
+-------------------------------------------------------------------------+
|                    Database Layer (PostgreSQL / SQLite)                 |
|  - accounts_user (Custom User with reliability_score)                   |
|  - vendors_vendor (Store coordinates & metadata)                        |
|  - commuters_commuterroute (Corridor waypoints & capacity limits)       |
|  - packages_package (Weight, volume, ready & deadline windows)          |
|  - matching_match (Calculated detours, component scores, level)         |
|  - deliveries_delivery (Pickup/Delivery OTPs & lifecycle timestamps)    |
|  - transactions_transaction (Financial settlement audit log)            |
|  - analytics_ecoimpact (Avoided distance & CO2 reduction ledger)        |
+-------------------------------------------------------------------------+
```

## State Machine: Delivery Lifecycle

```
[ CREATED ]
     │
     ▼
[ SEARCHING ] ──────── (Auto-Run Minimum Detour Engine)
     │
     ▼
[ MATCHED ] ────────── (Commuter Accepts Proposal)
     │
     ▼
[ PICKUP_PENDING ] ─── (Commuter Arrives at Vendor)
     │
     │ ◄── Enter Vendor's Pickup OTP
     ▼
[ PICKED_UP ]
     │
     ▼
[ IN_TRANSIT ] ─────── (Commuter Continues Existing Daily Journey)
     │
     │ ◄── Enter Recipient's Delivery OTP
     ▼
[ DELIVERED ]
     │
     ├─► Create Transaction (Vendor: ₹40, Commuter: ₹30, Platform: ₹10)
     ├─► Create EcoImpact Record (Avoided Km & CO2 Displaced)
     └─► Increment Commuter Reliability Score (+2.0)
```

## Minimum-Detour Principles

Standard on-demand couriers dispatch a dedicated vehicle from point $A$ to point $B$, generating $100\%$ net-new vehicle kilometers and emissions.

RoutePool models the journey of a commuter $C$ traveling between origin $O_C$ and destination $D_C$. The additional societal travel to carry package $P$ from pickup $A_P$ to drop-off $B_P$ is solely:

$$\Delta D = \text{Distance}(O_C \to A_P \to B_P \to D_C) - \text{Distance}(O_C \to D_C)$$

When $\Delta D \approx 0$, the marginal carbon footprint is negligible, representing up to an $85\%$ reduction in emissions compared to a dedicated motorcycle courier.
