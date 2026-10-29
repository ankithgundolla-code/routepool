# RoutePool — Hyperlocal Eco-Friendly Logistics & Package Pooling Platform

> **Academic Diploma CSE 3rd-Year Capstone Project**  
> *Existing Journey + Small Package = Shared Delivery*  
> *Minimum-Detour Route Matching Engine*

---

## 1. Project Overview

**RoutePool** is a sustainable crowd-shipping and parcel-pooling platform designed to eliminate unnecessary courier vehicle journeys in urban corridors. Instead of generating a new dedicated courier trip every time a local shop needs to deliver an item, RoutePool matches delivery packages with daily commuters (office workers, students, residents) who are **already traveling along a compatible route**.

The core technical contribution is the **Minimum-Detour Route Matching Algorithm**, which computes geographic corridor proximity, normal route distance, delivery detour distance, and schedule compatibility to match packages with commuters who require the least additional travel.

---

## 2. Key Features

- **Role-Based Workflows**: Tailored interfaces for Vendors, Commuters, and Platform Admins.
- **Explicit Commuter Route Registration**: Commuters explicitly declare start, waypoints, destination, recurring days, time windows, vehicle type, and maximum acceptable detour.
- **Minimum-Detour Matching Engine**:
  - Multi-criteria compatibility scoring (Route Detour: 40%, Time Window: 25%, Capacity: 20%, Reliability: 15%).
  - 3-level tiering: **Level 1 (Exact Match)**, **Level 2 (Nearby Route Match)**, and **Level 3 (Wait & Auto-Notify)**.
- **Dual-OTP Cryptographic Handover**:
  - **Pickup OTP**: Vendor displays code; commuter inputs to verify physical handover (transitions `PICKUP_PENDING` → `IN_TRANSIT`).
  - **Delivery OTP**: Recipient provides code; commuter inputs upon drop-off (transitions `IN_TRANSIT` → `DELIVERED`).
- **Internal Financial Clearinghouse**: Transparent reward split (75% to commuter, 25% platform fee) and vendor savings calculation.
- **Environmental Impact Ledger**: Tracks avoided kilometers and displaced $CO_2$ emissions based on the 0.144 kg/km standard factor.
- **Commuter Reliability Scoring**: Starts at 100; increments with successful handovers (+2) and penalizes cancellations (-5).
- **Package Pooling**: Commuters can carry up to 2 concurrent compatible packages along the same corridor.
- **Interactive OpenStreetMap + Leaflet Map**: Explains matching decisions visually with corridor polylines and detour waypoints.

---

## 3. Technology Stack

### Backend
- **Python 3.11** & **Django 5.1**
- **Django REST Framework (DRF)**
- **Simple JWT** for JSON Web Token authentication & token refresh
- **SQLite / PostgreSQL** ORM with spatial schema design
- **OSRM / Spherical Geodesic** routing engine

### Frontend
- **React 19** with **TypeScript**
- **Vite** bundler
- **Tailwind CSS**
- **Lucide React** icon system
- **Leaflet & OpenStreetMap**

---

## 4. Installation & Local Setup (Windows & Cross-Platform)

### System Requirements
- **Python**: Python 3.10, 3.11, or 3.14 (with pip)
- **Node.js**: Node.js v18+ or v20+ (with npm)
- **OS**: Windows 10/11 (PowerShell or Command Prompt), macOS, or Linux

---

### Step 1: Backend Setup (Windows PowerShell)

```powershell
# 1. Open PowerShell and navigate to the project directory:
cd "c:\Users\ankit\Downloads\New folder (2)\routepool---hyperlocal-eco-friendly-logistics"

# 2. (Optional) Create and activate a Python virtual environment:
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install backend dependencies:
pip install -r requirements.txt

# 4. Run database migrations:
python backend/manage.py migrate

# 5. (Optional) Create an administrative superuser:
python backend/manage.py createsuperuser

# 6. Run automated test suites:
python backend/manage.py test matching deliveries
```

---

### Step 2: Frontend Setup

```powershell
# In the same project root directory:
npm install --legacy-peer-deps

# Verify TypeScript type checks:
npm run lint

# Verify production Vite build:
npm run build
```

---

### Step 3: Running the Application Locally

#### Option A: Unified Launcher (Frontend + Django Proxy)
The root `server.ts` launches both the Vite development interface and proxies `/api` and `/admin` requests to Django:
```powershell
npm run dev
```
Open **`http://localhost:3000`** in your browser.

#### Option B: Independent Service Execution (Dual Terminal)

**Terminal 1 (Django REST Backend):**
```powershell
python backend/manage.py runserver 127.0.0.1:8008
```
Django will serve APIs at `http://127.0.0.1:8008/api/` and Admin console at `http://127.0.0.1:8008/admin/`.

**Terminal 2 (React Frontend App):**
```powershell
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

### Troubleshooting Common Setup Issues

1. **Python Command Not Found on Windows:**
   - If `python` outputs "Python was not found", verify whether Python is installed at `C:\Users\<user>\AppData\Local\Python\bin\python.exe` or `py.exe`. You can run:
     ```powershell
     & "C:\Users\ankit\AppData\Local\Python\bin\python.exe" backend/manage.py migrate
     ```
2. **GDAL / GeoDjango Library Missing on Windows:**
   - The project includes a resilient spatial fallback layer (`backend/config/spatial.py`) using SQLite JSON coordinates. You **do not** need to install external OSGeo4W or C-libraries for local development and demonstration.
3. **npm Peer Dependency Resolution (`ERESOLVE`):**
   - Run `npm install --legacy-peer-deps` to allow Vite and peer toolchains to resolve without conflicting version halts.
4. **CORS or API Connection Warning:**
   - If the navbar indicates "API Engine Ready" instead of "Django Live", ensure the Django backend process is running on port `8008` or start it via `python backend/manage.py runserver 127.0.0.1:8008`.

---

## 5. API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register/` | User registration (Vendor / Commuter) |
| `POST` | `/api/auth/login/` | JWT token acquisition |
| `POST` | `/api/auth/demo-login/` | 1-Click login switcher for evaluation |
| `GET` | `/api/auth/profile/` | Current user profile & reliability score |
| `GET/POST`| `/api/commuters/routes/` | Register & list commuter routes |
| `POST` | `/api/commuters/routes/:id/toggle/` | Activate or pause a commuter route |
| `GET/POST`| `/api/packages/` | Create delivery package (Vendor) |
| `GET` | `/api/matching/package/:id/matches/` | Calculate minimum-detour matches |
| `GET` | `/api/matching/commuter/opportunities/`| Opportunities near commuter routes |
| `POST` | `/api/matching/match/:id/accept/` | Commuter accepts matched delivery |
| `GET` | `/api/deliveries/` | Active deliveries list |
| `POST` | `/api/deliveries/:id/verify-pickup/` | Verify Pickup OTP |
| `POST` | `/api/deliveries/:id/verify-delivery/`| Verify Delivery OTP & settle reward |
| `POST` | `/api/deliveries/:id/cancel/` | Safe cancellation & re-matching |
| `GET` | `/api/analytics/overview/` | Platform-wide environmental savings |
| `GET` | `/api/analytics/vendor/` | Vendor savings & delivery metrics |
| `GET` | `/api/analytics/commuter/` | Commuter earnings & stats |
| `GET` | `/api/analytics/admin/` | Complete operational admin telemetry |

---

## 6. Minimum-Detour Matching Algorithm

Given a commuter route $R = [S \to W_1 \dots W_k \to D]$ and a package $P$ with pickup $A$ and drop-off $B$:

1. **Normal Distance**:  
   $$D_{\text{normal}} = \text{dist}(S, W_1) + \dots + \text{dist}(W_k, D)$$
2. **Delivery Route Distance**:  
   $$D_{\text{delivery}} = \text{dist}(S, A) + \text{dist}(A, B) + \text{dist}(B, D)$$
3. **Additional Detour**:  
   $$\Delta D = D_{\text{delivery}} - D_{\text{normal}}$$
4. **Feasibility Check**:  
   $$\Delta D \le \text{MaxDetour}_{\text{commuter}}$$
5. **Multi-Factor Score**:  
   $$\text{FinalScore} = (0.40 \cdot \text{RouteScore}) + (0.25 \cdot \text{TimeScore}) + (0.20 \cdot \text{CapacityScore}) + (0.15 \cdot \text{ReliabilityScore}) - \text{DetourPenalty}$$
