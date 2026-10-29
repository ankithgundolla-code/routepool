# PROJECT AUDIT: RoutePool Hyperlocal Eco-Friendly Logistics

**Audit Date:** October 2026  
**Auditor:** Senior Full-Stack Engineer  
**Status:** In Progress (Transitioning to Phase 2-8 Implementations)

---

## 1. Executive Summary & Repository Analysis

The RoutePool project is a dual-tier crowd-shipping logistics application:
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + Leaflet / OpenStreetMap.
- **Backend:** Django 5.1 REST Framework + SQLite3 (with PostGIS compatibility abstraction).
- **Architecture:** Root directory contains the actual active project with `server.ts` running an Express dev reverse proxy/static server, Vite middleware, and child-process or standalone Django proxying (`/api` and `/admin`).
- **Duplicate Directory Audit:** An inner directory `app/applet/backend/` exists which mirrored older Django app definitions prior to migrations and spatial fallback stabilization. The active backend used by the root `manage.py`, root `server.ts`, and project root is `backend/`. The `app/applet/` folder contains a prototype mock-only `server.ts` with static mock data. As instructed: we **verified** which files are actually used; we will keep existing code safe and ensure all real workflows route to Django DRF and the configured database.

---

## 2. What Already Works

1. **Frontend Architecture & UI Design:**
   - Premium dark-mode Tailwind theme with emerald/cyan/purple accents and Lucide icons.
   - Comprehensive interactive dashboards:
     - `VendorDashboard`: Package creation, Hyderabad presets, match browsing, direct route map visualization.
     - `CommuterDashboard`: Route registration, active status toggling, opportunity acceptance, corridor map.
     - `OtpVerificationStation`: Dual-OTP verification station for pickup and delivery handovers.
     - `AdminDashboard`: Platform-wide ledger, distance/emissions statistics, and transaction summaries.
     - `LandingPage`: Eco-impact marketing statistics and call-to-actions.
   - Leaflet + OpenStreetMap integration (`RouteMap.tsx`) rendering origin/destination markers, intermediate waypoints, and polyline corridors.

2. **Core Matching Logic Mathematical Foundation:**
   - `haversine_km` and `distance_to_segment_km` algorithms in `matching/services.py`.
   - Weighted multi-attribute scoring model in `matching/scoring.py` taking into account:
     - Route corridor efficiency (40%)
     - Time schedule compatibility (25%)
     - Physical vehicle capacity & size limit (20%)
     - Commuter reliability track record (15%)
     - Exponential detour penalties approaching commuter threshold.

3. **Database Schema & Migrations:**
   - 15 Django models across `accounts`, `vendors`, `commuters`, `packages`, `matching`, `deliveries`, `transactions`, `notifications`, and `analytics`.
   - Seed data already loaded into SQLite (`db.sqlite3`) with 6 users, 3 commuter routes, 3 packages, 5 matches, and 1 delivery.

---

## 3. What Was Incomplete, Broken, or Required Correction

1. **Python Environment & Django Version Conflict:**
   - System had Python 3.14 with an outdated `Django 2.1.7` that failed with `ModuleNotFoundError: No module named 'distutils'`.
   - **Fixed:** Successfully installed `Django 5.1.15`, `djangorestframework`, `djangorestframework-simplejwt`, and `django-cors-headers`.
2. **GeoDjango GDAL Crash on Windows:**
   - `settings.py` attempted `import django.contrib.gis` and appended to `INSTALLED_APPS` without checking whether native GDAL/GEOS libraries existed, causing crashes on standard Windows machines without OSGeo4W.
   - **Fixed:** Replaced naive import with `HAS_GDAL and HAS_GEOS` check in `settings.py`.
3. **Spatial Fallback JSON Serialization:**
   - In SQLite environments, `PointField` and `LineStringField` attempted to save `Point` instances without serializing them to JSON dicts, failing with `TypeError: Object of type Point is not JSON serializable`.
   - **Fixed:** Added `get_prep_value` and `from_db_value` in `backend/config/spatial.py`.
4. **Missing Django Database Migrations:**
   - Fields such as `accounts_user.updated_at`, `commuterroute.dest_point`, `vendor.location_point`, and index definitions were missing migration files, causing test suite crashes (`table accounts_user has no column named updated_at`).
   - **Fixed:** Generated migrations `0002_*` across `accounts`, `vendors`, `commuters`, `packages` and applied them cleanly to `db.sqlite3`.
5. **Frontend Node Dependency Resolution Conflict:**
   - `npm install` failed with peer-dependency conflict between `esbuild@0.25` and `vite@8.3.4` (`peerOptional esbuild@^0.27 || ^0.28`).
   - **Fixed:** Successfully resolved via `npm install --legacy-peer-deps`. `npm run build` and `npm run lint` now pass cleanly with zero errors.
6. **Frontend Real Django API vs Demo Data Fallback:**
   - `src/services/api.ts` used `tryFetch` which swallowed remote errors and quietly returned fallback mock arrays, giving vendors and commuters false state if the Django server was starting or responding with errors.
   - Needs: JWT authorization headers attached to all authenticated requests; transparent connection banner showing real backend connection state; real token-based login and registration.
7. **Delivery State Machine & Security:**
   - OTP codes were plain text and vulnerable in responses. Verification transitions need strict server-side state enforcement (Created → Searching → Matched → Pickup Pending → Picked Up / In Transit → Delivered).
   - Commuter route capacity pooling constraints (maximum 2 packages per commuter journey) must be enforced at acceptance time, not just in discovery.
8. **75% / 25% Rewards and Financial Clearing:**
   - Must guarantee idempotent rewards (preventing double disbursement on repeated calls).
   - Clear labeling of simulated wallet credits and estimated CO2 emission reductions (0.144 kg CO2 / km avoided).

---

## 4. Files Intended for Modification

- `backend/config/settings.py` (CORS refinement, GDAL guard, security checks)
- `backend/config/spatial.py` (JSON fallback serialization hooks)
- `backend/matching/services.py` & `backend/matching/scoring.py` (Distance consistency, fallback tiers: Exact, Nearby, Wait-and-notify)
- `backend/deliveries/views.py` & `backend/deliveries/models.py` (Delivery state transitions, OTP security and verification guards, idempotent rewards)
- `backend/commuters/views.py` & `backend/vendors/views.py` (Role permissions and backend validation)
- `backend/accounts/views.py` & `backend/accounts/serializers.py` (Role-based access, JWT auth)
- `server.ts` (Python spawn path resolution for Windows and reliable proxying)
- `src/services/api.ts` (JWT token handling, real API integration, error feedback)
- `src/components/Navbar.tsx`, `VendorDashboard.tsx`, `CommuterDashboard.tsx`, `OtpVerificationStation.tsx` (Live backend status, real data integration)
- `README.md` (Step-by-step Windows setup guide with exact commands and troubleshooting)

---

## 5. Implementation Roadmap (Phases 2-8)

1. **Phase 2: Project Setup & Database Foundations (COMPLETED / IN PROGRESS)**
   - Verify migrations, spatial fallback, package installation, test execution.
2. **Phase 3: Authentication, Roles, Permissions & JWT Integration**
   - Enforce vendor vs commuter permissions; ensure secure token management.
3. **Phase 4: Complete Vendor & Commuter Workflows**
   - End-to-end package creation, route registration, capacity validation, status updates.
4. **Phase 5: Matching Engine, Detour Calculations & OTP State Transitions**
   - Exact vs Nearby matching tiers; detour calculations with road factor estimation; secure OTP verification; package pooling limit (max 2).
5. **Phase 6: Rewards, Cancellations, Reliability Scoring & Environmental Impact**
   - Idempotent 75/25 reward settlements; reliability score increments/penalties; realistic emissions estimates.
6. **Phase 7: Frontend Integration, Maps & Polish**
   - Direct Django communication, Leaflet maps, dynamic notifications, and connection indicators.
7. **Phase 8: Comprehensive Tests, Production Build & Windows Documentation**
   - Run backend test suite; verify frontend build; document Windows setup in README.
