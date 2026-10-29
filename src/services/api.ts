import {
  User,
  Vendor,
  CommuterRoute,
  Package,
  Match,
  Delivery,
  Transaction,
  EcoImpact,
  PlatformOverview,
  VendorAnalytics,
  CommuterAnalytics,
  AdminAnalytics,
  AppNotification
} from '../types';

// Initial Seed Data mirroring Hyderabad Corridors
let stateUser: User = {
  id: 1,
  email: 'demo_vendor@routepool.local',
  name: 'Sri Krishna Electronics',
  role: 'vendor',
  phone: '+91 98490 12345',
  reliability_score: 98.0,
};

let stateRoutes: CommuterRoute[] = [
  {
    id: 1,
    commuter: 2,
    commuter_name: 'Rajesh Sharma',
    commuter_email: 'demo_commuter@routepool.local',
    commuter_phone: '+91 98765 43210',
    reliability_score: 98.0,
    route_name: 'Daily Office Transit: Khairatabad to Ameerpet',
    start_location: 'Khairatabad Metro Station',
    start_lat: 17.4116,
    start_lng: 78.4611,
    destination: 'Ameerpet Commercial Complex',
    dest_lat: 17.4375,
    dest_lng: 78.4482,
    intermediate_points: [
      { name: 'Punjagutta Junction', lat: 17.4265, lng: 78.4526 },
      { name: 'SR Nagar Main Road', lat: 17.4428, lng: 78.4481 },
    ],
    route_geometry: [],
    departure_time: '08:30',
    arrival_time: '09:15',
    available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    max_package_weight: 4.0,
    max_package_size: 'medium',
    max_detour: 1.5,
    travel_mode: 'two_wheeler',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    commuter: 3,
    commuter_name: 'Priya Verma',
    commuter_email: 'priya.verma@routepool.local',
    commuter_phone: '+91 99887 76655',
    reliability_score: 96.0,
    route_name: 'Morning Corridor: Lakdikapul to Begumpet',
    start_location: 'Lakdikapul Old Bridge',
    start_lat: 17.4042,
    start_lng: 78.4659,
    destination: 'Begumpet Tech Park',
    dest_lat: 17.4448,
    dest_lng: 78.4664,
    intermediate_points: [
      { name: 'Khairatabad RTA', lat: 17.4116, lng: 78.4611 },
      { name: 'Somajiguda Circle', lat: 17.4260, lng: 78.4590 }
    ],
    route_geometry: [],
    departure_time: '08:45',
    arrival_time: '09:30',
    available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    max_package_weight: 5.0,
    max_package_size: 'medium',
    max_detour: 2.0,
    travel_mode: 'two_wheeler',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

let statePackages: Package[] = [
  {
    id: 1,
    vendor: 1,
    vendor_business_name: 'Sri Krishna Electronics & Gadgets',
    vendor_email: 'demo_vendor@routepool.local',
    package_name: 'Microcontroller ICs & SMD Sensors Batch',
    description: 'Small box with sensitive ESD sensors and microcontroller boards',
    pickup_location: 'Khairatabad Circle Vendor Hub',
    pickup_lat: 17.4116,
    pickup_lng: 78.4611,
    destination: 'Ameerpet Computer Electronics Market',
    dest_lat: 17.4375,
    dest_lng: 78.4482,
    weight: 0.8,
    size: 'small',
    ready_time: new Date(Date.now() + 30 * 60000).toISOString(),
    delivery_deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
    offered_reward: 45.0,
    status: 'SEARCHING',
    direct_distance_km: 3.2,
    estimated_standard_courier_price: 75.0,
    estimated_savings: 30.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    vendor: 1,
    vendor_business_name: 'Sri Krishna Electronics & Gadgets',
    vendor_email: 'demo_vendor@routepool.local',
    package_name: 'Optical Fiber Patch Cords & Adapters',
    description: 'Network accessories parcel packed in bubble wrap',
    pickup_location: 'Punjagutta Junction Road',
    pickup_lat: 17.4265,
    pickup_lng: 78.4526,
    destination: 'Begumpet Software Tower',
    dest_lat: 17.4448,
    dest_lng: 78.4664,
    weight: 1.5,
    size: 'medium',
    ready_time: new Date(Date.now() + 15 * 60000).toISOString(),
    delivery_deadline: new Date(Date.now() + 5 * 3600000).toISOString(),
    offered_reward: 50.0,
    status: 'SEARCHING',
    direct_distance_km: 2.8,
    estimated_standard_courier_price: 80.0,
    estimated_savings: 30.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

let stateMatches: Match[] = [
  {
    id: 1,
    package: 1,
    commuter_route: 1,
    package_detail: statePackages[0],
    route_detail: stateRoutes[0],
    vendor_business_name: 'Sri Krishna Electronics & Gadgets',
    commuter_name: 'Rajesh Sharma',
    commuter_reliability: 98.0,
    pickup_distance: 0.2,
    destination_distance: 0.1,
    normal_distance: 3.8,
    delivery_distance: 4.2,
    estimated_detour: 0.4,
    time_score: 95.0,
    package_score: 100.0,
    route_score: 96.0,
    reliability_score: 98.0,
    detour_penalty: 1.5,
    final_score: 97.2,
    match_level: 'EXACT',
    status: 'PROPOSED',
    offered_reward: 45.0,
    commuter_earnings: 33.75,
    platform_fee: 11.25,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    package: 2,
    commuter_route: 2,
    package_detail: statePackages[1],
    route_detail: stateRoutes[1],
    vendor_business_name: 'Sri Krishna Electronics & Gadgets',
    commuter_name: 'Priya Verma',
    commuter_reliability: 96.0,
    pickup_distance: 0.5,
    destination_distance: 0.3,
    normal_distance: 4.6,
    delivery_distance: 5.3,
    estimated_detour: 0.7,
    time_score: 90.0,
    package_score: 95.0,
    route_score: 88.0,
    reliability_score: 96.0,
    detour_penalty: 3.0,
    final_score: 92.4,
    match_level: 'NEARBY',
    status: 'PROPOSED',
    offered_reward: 50.0,
    commuter_earnings: 37.5,
    platform_fee: 12.5,
    created_at: new Date().toISOString(),
  }
];

let stateDeliveries: Delivery[] = [
  {
    id: 101,
    match: 1,
    match_detail: stateMatches[0],
    package_name: 'Precision Calibration Multimeter',
    vendor_business: 'Sri Krishna Electronics & Gadgets',
    commuter_name: 'Rajesh Sharma',
    commuter_phone: '+91 98765 43210',
    vendor_phone: '+91 98490 12345',
    pickup_location: 'Khairatabad Circle Hub',
    destination: 'Ameerpet Computer Electronics Market',
    offered_reward: 55.0,
    direct_distance_km: 3.5,
    pickup_otp: '782941',
    delivery_otp: '419382',
    pickup_verified: true,
    delivery_verified: true,
    picked_up_at: new Date(Date.now() - 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 1800000).toISOString(),
    status: 'DELIVERED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

let stateTransactions: Transaction[] = [
  {
    id: 1,
    delivery: 101,
    package_name: 'Precision Calibration Multimeter',
    vendor_business: 'Sri Krishna Electronics & Gadgets',
    commuter_name: 'Rajesh Sharma',
    vendor_amount: 55.0,
    commuter_reward: 41.25,
    platform_fee: 13.75,
    created_at: new Date().toISOString(),
  }
];

let stateNotifications: AppNotification[] = [
  {
    id: 1,
    title: 'Active Matches Found',
    message: "Found 2 compatible commuter matches for your 'Microcontroller ICs' delivery package with under 0.8km detour.",
    is_read: false,
    created_at: new Date().toISOString(),
  }
];

// Helper to compute haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

function formatApiError(data: any, fallbackMessage: string): string {
  if (!data) return fallbackMessage;
  if (typeof data === 'string') {
    if (data.includes('<html') || data.includes('<!DOCTYPE') || data.includes('<body')) {
      return fallbackMessage;
    }
    const cleanStr = data.trim();
    return cleanStr || fallbackMessage;
  }
  if (typeof data === 'object') {
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail.trim();
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
    const entries = Object.entries(data);
    const messages: string[] = [];
    for (const [key, val] of entries) {
      if (key === 'detail' || key === 'message') continue;
      const fieldTitle = key === 'non_field_errors'
        ? ''
        : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      let text = '';
      if (Array.isArray(val)) {
        text = val.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join(' ');
      } else if (typeof val === 'string') {
        text = val;
      } else if (typeof val === 'object' && val !== null) {
        text = Object.values(val).flat().join(' ');
      }
      if (text.trim()) {
        messages.push(fieldTitle ? `${fieldTitle}: ${text.trim()}` : text.trim());
      }
    }
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }
  return fallbackMessage;
}

class ApiService {
  public isConnectedToDjango: boolean = false;

  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('routepool_access_token');
    } catch {
      return null;
    }
  }

  private setAuthToken(token: string) {
    try {
      localStorage.setItem('routepool_access_token', token);
    } catch {}
  }

  private async tryFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        this.isConnectedToDjango = true;
        return await res.json();
      } else if (res.status === 401 && endpoint !== '/auth/demo-login/' && endpoint !== '/auth/token/') {
        // Token expired; try refreshing or clear
        console.warn('Session expired for endpoint:', endpoint);
      }
    } catch {
      // fallback to in-memory reactive state
    }
    return null;
  }

  async demoLogin(role: 'vendor' | 'commuter' | 'admin'): Promise<{ access: string; refresh: string; user: User }> {
    const remote = await this.tryFetch<{ access: string; refresh: string; user: User }>('/auth/demo-login/', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    if (remote) {
      stateUser = remote.user;
      this.setAuthToken(remote.access);
      this.isConnectedToDjango = true;
      return remote;
    }

    if (role === 'vendor') {
      stateUser = {
        id: 1,
        email: 'demo_vendor@routepool.local',
        name: 'Sri Krishna Electronics',
        role: 'vendor',
        phone: '+91 98490 12345',
        reliability_score: 98.0,
      };
    } else if (role === 'commuter') {
      stateUser = {
        id: 2,
        email: 'demo_commuter@routepool.local',
        name: 'Rajesh Sharma',
        role: 'commuter',
        phone: '+91 98765 43210',
        reliability_score: 98.0,
      };
    } else {
      stateUser = {
        id: 3,
        email: 'demo_admin@routepool.local',
        name: 'RoutePool Administrator',
        role: 'admin',
        phone: '+91 90000 00000',
        reliability_score: 100.0,
      };
    }
    return {
      access: 'mock-jwt-access-token',
      refresh: 'mock-jwt-refresh-token',
      user: stateUser
    };
  }

  hasSavedSession(): boolean {
    return Boolean(this.getAuthToken());
  }

  async login(credentials: { email: string; password: string }): Promise<{ access: string; refresh: string; user: User }> {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    let data: any = null;
    try {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new Error(formatApiError(data, 'Invalid email or password.'));
    }
    stateUser = data.user;
    this.setAuthToken(data.access);
    this.isConnectedToDjango = true;
    return data;
  }

  async register(registrationData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirm?: string;
    role: 'vendor' | 'commuter';
    business_name?: string;
    business_address?: string;
    location?: string;
  }): Promise<{ access: string; refresh: string; user: User }> {
    const res = await fetch('/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });
    let data: any = null;
    try {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } catch {
      data = null;
    }
    if (!res.ok) {
      const errorMsg = formatApiError(data, 'Registration failed. Please verify submitted details.');
      throw new Error(errorMsg);
    }
    stateUser = data.user;
    this.setAuthToken(data.access);
    this.isConnectedToDjango = true;
    return data;
  }

  async getProfile(): Promise<User | null> {
    const token = this.getAuthToken();
    if (!token) {
      return null;
    }
    const remote = await this.tryFetch<User>('/auth/profile/');
    if (remote) {
      stateUser = remote;
      return remote;
    }
    if (token === 'mock-jwt-access-token') {
      return stateUser;
    }
    // Token is invalid/expired
    this.logout();
    return null;
  }

  logout() {
    localStorage.removeItem('routepool_access_token');
  }

  // Commuter Routes
  async getCommuterRoutes(): Promise<CommuterRoute[]> {
    const remote = await this.tryFetch<CommuterRoute[]>('/commuters/routes/');
    return remote || stateRoutes;
  }

  async createCommuterRoute(routeData: Partial<CommuterRoute>): Promise<CommuterRoute> {
    const remote = await this.tryFetch<CommuterRoute>('/commuters/routes/', {
      method: 'POST',
      body: JSON.stringify(routeData)
    });
    if (remote) return remote;

    const newR: CommuterRoute = {
      id: stateRoutes.length + 1,
      commuter: stateUser.id,
      commuter_name: stateUser.name,
      commuter_email: stateUser.email,
      commuter_phone: stateUser.phone,
      reliability_score: stateUser.reliability_score,
      route_name: routeData.route_name || 'My Commute Route',
      start_location: routeData.start_location || 'Khairatabad',
      start_lat: routeData.start_lat || 17.4116,
      start_lng: routeData.start_lng || 78.4611,
      destination: routeData.destination || 'Ameerpet',
      dest_lat: routeData.dest_lat || 17.4375,
      dest_lng: routeData.dest_lng || 78.4482,
      intermediate_points: routeData.intermediate_points || [],
      route_geometry: [],
      departure_time: routeData.departure_time || '08:30',
      arrival_time: routeData.arrival_time || '09:15',
      available_days: routeData.available_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      max_package_weight: routeData.max_package_weight || 4.0,
      max_package_size: routeData.max_package_size || 'medium',
      max_detour: routeData.max_detour || 1.5,
      travel_mode: routeData.travel_mode || 'two_wheeler',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    stateRoutes.unshift(newR);
    return newR;
  }

  async toggleCommuterRoute(id: number): Promise<{ id: number; is_active: boolean }> {
    const remote = await this.tryFetch<{ id: number; is_active: boolean }>(`/commuters/routes/${id}/toggle/`, {
      method: 'POST'
    });
    if (remote) return remote;

    const r = stateRoutes.find(item => item.id === id);
    if (r) {
      r.is_active = !r.is_active;
      return { id: r.id, is_active: r.is_active };
    }
    return { id, is_active: false };
  }

  async deleteCommuterRoute(id: number): Promise<void> {
    await this.tryFetch(`/commuters/routes/${id}/`, { method: 'DELETE' });
    stateRoutes = stateRoutes.filter(r => r.id !== id);
  }

  // Packages
  async getPackages(): Promise<Package[]> {
    const remote = await this.tryFetch<Package[]>('/packages/');
    return remote || statePackages;
  }

  async createPackage(pkgData: Partial<Package>): Promise<Package> {
    const remote = await this.tryFetch<Package>('/packages/', {
      method: 'POST',
      body: JSON.stringify(pkgData)
    });
    if (remote) {
      statePackages.unshift(remote);
      return remote;
    }

    const dist = haversineKm(
      pkgData.pickup_lat || 17.4116, pkgData.pickup_lng || 78.4611,
      pkgData.dest_lat || 17.4375, pkgData.dest_lng || 78.4482
    );
    const reward = pkgData.offered_reward || 45;
    const stdPrice = Math.round(45 + (dist * 6.5) + ((pkgData.weight || 1) * 5));

    const newPkg: Package = {
      id: statePackages.length + 1,
      vendor: stateUser.id,
      vendor_business_name: stateUser.name,
      vendor_email: stateUser.email,
      package_name: pkgData.package_name || 'Delivery Parcel',
      description: pkgData.description || '',
      pickup_location: pkgData.pickup_location || 'Khairatabad',
      pickup_lat: pkgData.pickup_lat || 17.4116,
      pickup_lng: pkgData.pickup_lng || 78.4611,
      destination: pkgData.destination || 'Ameerpet',
      dest_lat: pkgData.dest_lat || 17.4375,
      dest_lng: pkgData.dest_lng || 78.4482,
      weight: pkgData.weight || 1.0,
      size: pkgData.size || 'small',
      ready_time: pkgData.ready_time || new Date().toISOString(),
      delivery_deadline: pkgData.delivery_deadline || new Date().toISOString(),
      offered_reward: reward,
      status: 'SEARCHING',
      direct_distance_km: dist,
      estimated_standard_courier_price: Math.max(stdPrice, reward + 20),
      estimated_savings: Math.max(0, stdPrice - reward),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    statePackages.unshift(newPkg);

    // Auto-create minimum detour candidate
    if (stateRoutes.length > 0) {
      const bestRoute = stateRoutes[0];
      const newMatch: Match = {
        id: stateMatches.length + 1,
        package: newPkg.id,
        commuter_route: bestRoute.id,
        package_detail: newPkg,
        route_detail: bestRoute,
        vendor_business_name: newPkg.vendor_business_name,
        commuter_name: bestRoute.commuter_name,
        commuter_reliability: bestRoute.reliability_score,
        pickup_distance: 0.3,
        destination_distance: 0.2,
        normal_distance: 4.2,
        delivery_distance: 4.7,
        estimated_detour: 0.5,
        time_score: 95.0,
        package_score: 100.0,
        route_score: 94.0,
        reliability_score: bestRoute.reliability_score,
        detour_penalty: 2.0,
        final_score: 96.5,
        match_level: 'EXACT',
        status: 'PROPOSED',
        offered_reward: newPkg.offered_reward,
        commuter_earnings: Math.round(newPkg.offered_reward * 0.75),
        platform_fee: Math.round(newPkg.offered_reward * 0.25),
        created_at: new Date().toISOString(),
      };
      stateMatches.unshift(newMatch);
    }
    return newPkg;
  }

  async cancelPackage(id: number): Promise<{ detail: string; status: string }> {
    await this.tryFetch(`/packages/${id}/cancel/`, { method: 'POST' });
    const p = statePackages.find(item => item.id === id);
    if (p) p.status = 'CANCELLED';
    return { detail: 'Package cancelled successfully', status: 'CANCELLED' };
  }

  // Matching Engine
  async getPackageMatches(packageId: number): Promise<{
    package_id: number;
    package_name: string;
    package_status: string;
    total_matches: number;
    matches: Match[];
  }> {
    const remote = await this.tryFetch<any>(`/matching/package/${packageId}/matches/`);
    if (remote) return remote;

    const pkg = statePackages.find(p => p.id === packageId);
    const m = stateMatches.filter(item => item.package === packageId);
    return {
      package_id: packageId,
      package_name: pkg?.package_name || '',
      package_status: pkg?.status || 'SEARCHING',
      total_matches: m.length,
      matches: m,
    };
  }

  async runPackageMatching(packageId: number): Promise<{ detail: string; matches: Match[] }> {
    const m = stateMatches.filter(item => item.package === packageId);
    return {
      detail: `Computed ${m.length} potential commuter matches`,
      matches: m
    };
  }

  async getCommuterOpportunities(): Promise<{
    routes_count: number;
    opportunities_count: number;
    opportunities: Match[];
  }> {
    const remote = await this.tryFetch<any>('/matching/commuter/opportunities/');
    if (remote) return remote;

    return {
      routes_count: stateRoutes.length,
      opportunities_count: stateMatches.length,
      opportunities: stateMatches,
    };
  }

  async requestMatch(matchId: number): Promise<{ detail: string; match: Match }> {
    await this.tryFetch(`/matching/match/${matchId}/request/`, { method: 'POST' });
    const m = stateMatches.find(item => item.id === matchId);
    if (m) m.status = 'REQUESTED';
    return { detail: 'Delivery request sent to commuter', match: m! };
  }

  async acceptMatch(matchId: number): Promise<{
    detail: string;
    match_id: number;
    delivery_id: number;
    status: string;
  }> {
    const remote = await this.tryFetch<any>(`/matching/match/${matchId}/accept/`, { method: 'POST' });
    if (remote) return remote;

    const m = stateMatches.find(item => item.id === matchId);
    if (m) {
      m.status = 'ACCEPTED';
      const pkg = statePackages.find(p => p.id === m.package);
      if (pkg) pkg.status = 'MATCHED';

      const pOtp = `${Math.floor(100000 + Math.random() * 900000)}`;
      const dOtp = `${Math.floor(100000 + Math.random() * 900000)}`;

      const del: Delivery = {
        id: stateDeliveries.length + 101,
        match: m.id,
        match_detail: m,
        package_name: m.package_detail?.package_name || 'Delivery Package',
        vendor_business: m.vendor_business_name,
        commuter_name: m.commuter_name,
        commuter_phone: '+91 98765 43210',
        vendor_phone: '+91 98490 12345',
        pickup_location: m.package_detail?.pickup_location || 'Khairatabad',
        destination: m.package_detail?.destination || 'Ameerpet',
        offered_reward: m.offered_reward,
        direct_distance_km: m.package_detail?.direct_distance_km || 3.2,
        pickup_otp: pOtp,
        delivery_otp: dOtp,
        pickup_verified: false,
        delivery_verified: false,
        status: 'PICKUP_PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      stateDeliveries.unshift(del);

      return {
        detail: 'Match accepted! Delivery initiated.',
        match_id: m.id,
        delivery_id: del.id,
        status: 'PICKUP_PENDING',
      };
    }
    throw new Error('Match not found');
  }

  // Deliveries & OTP
  async getDeliveries(): Promise<Delivery[]> {
    const remote = await this.tryFetch<Delivery[]>('/deliveries/');
    return remote || stateDeliveries;
  }

  async verifyPickupOTP(deliveryId: number, otp: string): Promise<{
    detail: string;
    status: string;
    picked_up_at: string;
  }> {
    const remote = await this.tryFetch<any>(`/deliveries/${deliveryId}/verify-pickup/`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
    if (remote) return remote;

    const del = stateDeliveries.find(d => d.id === deliveryId);
    if (!del) throw new Error('Delivery record not found');
    if (del.pickup_otp !== otp.trim()) {
      throw new Error('Invalid Pickup OTP. Please verify with the vendor.');
    }

    del.pickup_verified = true;
    del.status = 'IN_TRANSIT';
    del.picked_up_at = new Date().toISOString();

    const pkg = statePackages.find(p => p.package_name === del.package_name);
    if (pkg) pkg.status = 'IN_TRANSIT';

    return {
      detail: 'Pickup OTP verified successfully. Package is now in transit!',
      status: del.status,
      picked_up_at: del.picked_up_at,
    };
  }

  async verifyDeliveryOTP(deliveryId: number, otp: string): Promise<{
    detail: string;
    status: string;
    delivered_at: string;
    payout: number;
    eco_impact: { distance_saved_km: number; co2_saved_kg: number };
  }> {
    const remote = await this.tryFetch<any>(`/deliveries/${deliveryId}/verify-delivery/`, {
      method: 'POST',
      body: JSON.stringify({ otp })
    });
    if (remote) return remote;

    const del = stateDeliveries.find(d => d.id === deliveryId);
    if (!del) throw new Error('Delivery record not found');
    if (del.delivery_otp !== otp.trim()) {
      throw new Error('Invalid Delivery OTP. Please verify with recipient.');
    }

    del.delivery_verified = true;
    del.status = 'DELIVERED';
    del.delivered_at = new Date().toISOString();

    const pkg = statePackages.find(p => p.package_name === del.package_name);
    if (pkg) pkg.status = 'DELIVERED';

    const payout = Math.round(del.offered_reward * 0.75);
    stateTransactions.unshift({
      id: stateTransactions.length + 1,
      delivery: del.id,
      package_name: del.package_name,
      vendor_business: del.vendor_business,
      commuter_name: del.commuter_name,
      vendor_amount: del.offered_reward,
      commuter_reward: payout,
      platform_fee: Math.round(del.offered_reward * 0.25),
      created_at: new Date().toISOString(),
    });

    stateUser.reliability_score = Math.min(100, stateUser.reliability_score + 2.0);

    return {
      detail: 'Delivery successfully verified and completed!',
      status: 'DELIVERED',
      delivered_at: del.delivered_at,
      payout,
      eco_impact: {
        distance_saved_km: del.direct_distance_km,
        co2_saved_kg: Number((del.direct_distance_km * 0.144).toFixed(2)),
      }
    };
  }

  async cancelDelivery(deliveryId: number): Promise<{ detail: string; new_reliability_score?: number }> {
    const remote = await this.tryFetch<any>(`/deliveries/${deliveryId}/cancel/`, { method: 'POST' });
    if (remote) return remote;

    const del = stateDeliveries.find(d => d.id === deliveryId);
    if (!del) throw new Error('Delivery not found');

    del.status = 'CANCELLED';
    stateUser.reliability_score = Math.max(20, stateUser.reliability_score - 5.0);

    const pkg = statePackages.find(p => p.package_name === del.package_name);
    if (pkg) pkg.status = 'SEARCHING';

    return {
      detail: 'Commuter cancellation processed. Reliability score adjusted. Package returned to active searching pool.',
      new_reliability_score: stateUser.reliability_score,
    };
  }

  // Transactions & Notifications
  async getTransactions(): Promise<Transaction[]> {
    const remote = await this.tryFetch<Transaction[]>('/transactions/');
    return remote || stateTransactions;
  }

  async getNotifications(): Promise<AppNotification[]> {
    const remote = await this.tryFetch<AppNotification[]>('/notifications/');
    return remote || stateNotifications;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notif = stateNotifications.find(n => n.id === id);
    if (notif) notif.is_read = true;
  }

  async markAllNotificationsRead(): Promise<void> {
    stateNotifications.forEach(n => n.is_read = true);
  }

  // Analytics
  async getPlatformOverview(): Promise<PlatformOverview> {
    const remote = await this.tryFetch<PlatformOverview>('/analytics/overview/');
    return remote || {
      deliveries_completed: stateDeliveries.filter(d => d.status === 'DELIVERED').length + 24,
      estimated_distance_avoided_km: 164.2,
      estimated_co2_reduced_kg: 23.6,
      active_routes_count: stateRoutes.length + 4,
      active_commuters_count: 8,
      active_vendors_count: 5,
      co2_emission_factor: '0.144 kg CO2 / km avoided',
      calculation_note: 'Based on standard two-wheeler courier displacement factor',
    };
  }

  async getVendorAnalytics(): Promise<VendorAnalytics> {
    const remote = await this.tryFetch<VendorAnalytics>('/analytics/vendor/');
    return remote || {
      total_packages: statePackages.length,
      searching_count: statePackages.filter(p => p.status === 'SEARCHING').length,
      matched_count: statePackages.filter(p => p.status === 'MATCHED').length,
      in_transit_count: statePackages.filter(p => p.status === 'IN_TRANSIT').length,
      delivered_count: statePackages.filter(p => p.status === 'DELIVERED').length,
      estimated_savings_inr: 78.0,
      distance_saved_km: 16.4,
      co2_saved_kg: 2.36,
    };
  }

  async getCommuterAnalytics(): Promise<CommuterAnalytics> {
    const remote = await this.tryFetch<CommuterAnalytics>('/analytics/commuter/');
    return remote || {
      active_routes_count: stateRoutes.filter(r => r.is_active).length,
      opportunities_count: stateMatches.length,
      accepted_deliveries_count: stateDeliveries.filter(d => d.status !== 'CANCELLED').length,
      completed_deliveries_count: stateDeliveries.filter(d => d.status === 'DELIVERED').length,
      total_rewards_earned_inr: 41.25,
      reliability_score: stateUser.reliability_score,
      estimated_extra_distance_km: 0.7,
    };
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const remote = await this.tryFetch<AdminAnalytics>('/analytics/admin/');
    return remote || {
      total_users: 6,
      vendors_count: 2,
      commuters_count: 3,
      active_routes_count: stateRoutes.length,
      packages_count: statePackages.length,
      matches_count: stateMatches.length,
      deliveries_count: stateDeliveries.length,
      completed_deliveries_count: stateDeliveries.filter(d => d.status === 'DELIVERED').length,
      gross_transaction_volume: 150.0,
      platform_fee_revenue: 37.5,
      commuter_disbursements: 112.5,
      total_distance_saved_km: 164.2,
      total_co2_saved_kg: 23.6,
    };
  }
}

export const api = new ApiService();
