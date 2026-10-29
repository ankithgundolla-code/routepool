import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(express.json());

// In-Memory Seeded State matching the Django models & seed_demo_data
let currentUser = {
  id: 1,
  email: 'demo_vendor@routepool.local',
  name: 'Sri Krishna Electronics',
  role: 'vendor' as 'vendor' | 'commuter' | 'admin',
  phone: '+91 98490 12345',
  reliability_score: 98.0,
};

let routes = [
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

let packages = [
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

let matches = [
  {
    id: 1,
    package: 1,
    commuter_route: 1,
    package_detail: packages[0],
    route_detail: routes[0],
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
    package_detail: packages[1],
    route_detail: routes[1],
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

let deliveries = [
  {
    id: 101,
    match: 1,
    match_detail: matches[0],
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

let transactions = [
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

let notifications = [
  {
    id: 1,
    user: 1,
    title: 'Active Matches Found',
    message: "Found 2 compatible commuter matches for your 'Microcontroller ICs' delivery package with under 0.8km detour.",
    is_read: false,
    created_at: new Date().toISOString(),
  }
];

// ---------------- REST API Endpoints ---------------- //

// Auth & Switcher
app.post('/api/auth/demo-login/', (req, res) => {
  const role = req.body.role || 'vendor';
  if (role === 'vendor') {
    currentUser = {
      id: 1,
      email: 'demo_vendor@routepool.local',
      name: 'Sri Krishna Electronics',
      role: 'vendor',
      phone: '+91 98490 12345',
      reliability_score: 98.0,
    };
  } else if (role === 'commuter') {
    currentUser = {
      id: 2,
      email: 'demo_commuter@routepool.local',
      name: 'Rajesh Sharma',
      role: 'commuter',
      phone: '+91 98765 43210',
      reliability_score: 98.0,
    };
  } else {
    currentUser = {
      id: 3,
      email: 'demo_admin@routepool.local',
      name: 'RoutePool Administrator',
      role: 'admin',
      phone: '+91 90000 00000',
      reliability_score: 100.0,
    };
  }
  res.json({
    access: 'mock-jwt-access-token',
    refresh: 'mock-jwt-refresh-token',
    user: currentUser,
  });
});

app.get('/api/auth/profile/', (req, res) => {
  res.json(currentUser);
});

// Commuter Routes
app.get('/api/commuters/routes/', (req, res) => {
  res.json(routes);
});

app.post('/api/commuters/routes/', (req, res) => {
  const newRoute = {
    id: routes.length + 1,
    commuter: currentUser.id,
    commuter_name: currentUser.name,
    commuter_email: currentUser.email,
    commuter_phone: currentUser.phone,
    reliability_score: currentUser.reliability_score,
    route_geometry: [],
    intermediate_points: [],
    is_active: true,
    created_at: new Date().toISOString(),
    ...req.body,
  };
  routes.unshift(newRoute);
  res.status(201).json(newRoute);
});

app.post('/api/commuters/routes/:id/toggle/', (req, res) => {
  const r = routes.find(item => item.id === parseInt(req.params.id));
  if (r) {
    r.is_active = !r.is_active;
    res.json({ id: r.id, is_active: r.is_active });
  } else {
    res.status(404).json({ detail: 'Not found' });
  }
});

app.delete('/api/commuters/routes/:id/', (req, res) => {
  routes = routes.filter(r => r.id !== parseInt(req.params.id));
  res.status(204).send();
});

// Packages
app.get('/api/packages/', (req, res) => {
  res.json(packages);
});

app.post('/api/packages/', (req, res) => {
  const offered_reward = req.body.offered_reward || 45;
  const newPkg = {
    id: packages.length + 1,
    vendor: currentUser.id,
    vendor_business_name: currentUser.name,
    vendor_email: currentUser.email,
    status: 'SEARCHING',
    direct_distance_km: 3.4,
    estimated_standard_courier_price: Math.round(offered_reward + 28),
    estimated_savings: 28,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...req.body,
  };
  packages.unshift(newPkg);

  // Auto-generate matches
  if (routes.length > 0) {
    const r = routes[0];
    const newMatch = {
      id: matches.length + 1,
      package: newPkg.id,
      commuter_route: r.id,
      package_detail: newPkg,
      route_detail: r,
      vendor_business_name: newPkg.vendor_business_name,
      commuter_name: r.commuter_name,
      commuter_reliability: r.reliability_score,
      pickup_distance: 0.3,
      destination_distance: 0.2,
      normal_distance: 4.0,
      delivery_distance: 4.5,
      estimated_detour: 0.5,
      time_score: 95.0,
      package_score: 100.0,
      route_score: 94.0,
      reliability_score: r.reliability_score,
      detour_penalty: 2.0,
      final_score: 96.5,
      match_level: 'EXACT',
      status: 'PROPOSED',
      offered_reward: newPkg.offered_reward,
      commuter_earnings: Math.round(newPkg.offered_reward * 0.75),
      platform_fee: Math.round(newPkg.offered_reward * 0.25),
      created_at: new Date().toISOString(),
    };
    matches.unshift(newMatch);
  }

  res.status(201).json(newPkg);
});

app.post('/api/packages/:id/cancel/', (req, res) => {
  const p = packages.find(item => item.id === parseInt(req.params.id));
  if (p) {
    p.status = 'CANCELLED';
    res.json({ detail: 'Package cancelled successfully', status: p.status });
  } else {
    res.status(404).json({ detail: 'Not found' });
  }
});

// Matching
app.get('/api/matching/package/:id/matches/', (req, res) => {
  const pkgId = parseInt(req.params.id);
  const pkg = packages.find(p => p.id === pkgId);
  const pkgMatches = matches.filter(m => m.package === pkgId);
  res.json({
    package_id: pkgId,
    package_name: pkg?.package_name || '',
    package_status: pkg?.status || 'SEARCHING',
    total_matches: pkgMatches.length,
    matches: pkgMatches,
  });
});

app.post('/api/matching/package/:id/matches/', (req, res) => {
  const pkgId = parseInt(req.params.id);
  const pkgMatches = matches.filter(m => m.package === pkgId);
  res.json({
    detail: `Computed ${pkgMatches.length} matches`,
    matches: pkgMatches,
  });
});

app.get('/api/matching/commuter/opportunities/', (req, res) => {
  res.json({
    routes_count: routes.length,
    opportunities_count: matches.length,
    opportunities: matches,
  });
});

app.post('/api/matching/match/:id/request/', (req, res) => {
  const m = matches.find(item => item.id === parseInt(req.params.id));
  if (m) {
    m.status = 'REQUESTED';
    res.json({ detail: 'Requested commuter successfully', match: m });
  } else {
    res.status(404).json({ detail: 'Not found' });
  }
});

app.post('/api/matching/match/:id/accept/', (req, res) => {
  const m = matches.find(item => item.id === parseInt(req.params.id));
  if (m) {
    m.status = 'ACCEPTED';
    const pkg = packages.find(p => p.id === m.package);
    if (pkg) pkg.status = 'MATCHED';

    const pOtp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const dOtp = `${Math.floor(100000 + Math.random() * 900000)}`;

    const del = {
      id: deliveries.length + 101,
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
      picked_up_at: null as any,
      delivered_at: null as any,
      status: 'PICKUP_PENDING' as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    deliveries.unshift(del);

    notifications.unshift({
      id: notifications.length + 1,
      user: 1,
      title: 'Delivery Accepted!',
      message: `${m.commuter_name} accepted your delivery request. Pickup OTP: ${pOtp}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    res.json({
      detail: 'Match accepted! Delivery initiated.',
      match_id: m.id,
      delivery_id: del.id,
      status: 'PICKUP_PENDING',
    });
  } else {
    res.status(404).json({ detail: 'Match not found' });
  }
});

// Deliveries
app.get('/api/deliveries/', (req, res) => {
  res.json(deliveries);
});

app.get('/api/deliveries/:id/', (req, res) => {
  const del = deliveries.find(d => d.id === parseInt(req.params.id));
  if (del) res.json(del);
  else res.status(404).json({ detail: 'Not found' });
});

app.post('/api/deliveries/:id/verify-pickup/', (req, res) => {
  const del = deliveries.find(d => d.id === parseInt(req.params.id));
  if (!del) return res.status(404).json({ detail: 'Not found' });

  if (req.body.otp !== del.pickup_otp) {
    return res.status(400).json({ detail: 'Invalid Pickup OTP. Please verify with the vendor.' });
  }

  del.pickup_verified = true;
  del.status = 'IN_TRANSIT';
  del.picked_up_at = new Date().toISOString();

  const pkg = packages.find(p => p.package_name === del.package_name);
  if (pkg) pkg.status = 'IN_TRANSIT';

  res.json({
    detail: 'Pickup OTP verified successfully. Package is now in transit!',
    status: del.status,
    picked_up_at: del.picked_up_at,
  });
});

app.post('/api/deliveries/:id/verify-delivery/', (req, res) => {
  const del = deliveries.find(d => d.id === parseInt(req.params.id));
  if (!del) return res.status(404).json({ detail: 'Not found' });

  if (req.body.otp !== del.delivery_otp) {
    return res.status(400).json({ detail: 'Invalid Delivery OTP.' });
  }

  del.delivery_verified = true;
  del.status = 'DELIVERED';
  del.delivered_at = new Date().toISOString();

  const pkg = packages.find(p => p.package_name === del.package_name);
  if (pkg) pkg.status = 'DELIVERED';

  const payout = Math.round(del.offered_reward * 0.75);
  transactions.unshift({
    id: transactions.length + 1,
    delivery: del.id,
    package_name: del.package_name,
    vendor_business: del.vendor_business,
    commuter_name: del.commuter_name,
    vendor_amount: del.offered_reward,
    commuter_reward: payout,
    platform_fee: Math.round(del.offered_reward * 0.25),
    created_at: new Date().toISOString(),
  });

  currentUser.reliability_score = Math.min(100, currentUser.reliability_score + 2.0);

  res.json({
    detail: 'Delivery successfully verified and completed!',
    status: 'DELIVERED',
    delivered_at: del.delivered_at,
    payout,
    eco_impact: {
      distance_saved_km: del.direct_distance_km,
      co2_saved_kg: Number((del.direct_distance_km * 0.144).toFixed(2)),
    },
  });
});

app.post('/api/deliveries/:id/cancel/', (req, res) => {
  const del = deliveries.find(d => d.id === parseInt(req.params.id));
  if (!del) return res.status(404).json({ detail: 'Not found' });

  del.status = 'CANCELLED';
  currentUser.reliability_score = Math.max(20, currentUser.reliability_score - 5.0);

  const pkg = packages.find(p => p.package_name === del.package_name);
  if (pkg) pkg.status = 'SEARCHING';

  res.json({
    detail: 'Commuter cancellation processed. Reliability score adjusted. Package returned to active searching pool.',
    new_reliability_score: currentUser.reliability_score,
  });
});

// Transactions & Notifications
app.get('/api/transactions/', (req, res) => {
  res.json(transactions);
});

app.get('/api/notifications/', (req, res) => {
  res.json(notifications);
});

app.post('/api/notifications/mark-all-read/', (req, res) => {
  notifications.forEach(n => n.is_read = true);
  res.json({ status: 'all read' });
});

// Analytics
app.get('/api/analytics/overview/', (req, res) => {
  res.json({
    deliveries_completed: deliveries.filter(d => d.status === 'DELIVERED').length + 24,
    estimated_distance_avoided_km: 164.2,
    estimated_co2_reduced_kg: 23.6,
    active_routes_count: routes.length + 4,
    active_commuters_count: 8,
    active_vendors_count: 5,
    co2_emission_factor: '0.144 kg CO2 / km avoided',
    calculation_note: 'Based on standard two-wheeler courier displacement factor',
  });
});

app.get('/api/analytics/vendor/', (req, res) => {
  res.json({
    total_packages: packages.length,
    searching_count: packages.filter(p => p.status === 'SEARCHING').length,
    matched_count: packages.filter(p => p.status === 'MATCHED').length,
    in_transit_count: packages.filter(p => p.status === 'IN_TRANSIT').length,
    delivered_count: packages.filter(p => p.status === 'DELIVERED').length,
    estimated_savings_inr: 78.0,
    distance_saved_km: 16.4,
    co2_saved_kg: 2.36,
  });
});

app.get('/api/analytics/commuter/', (req, res) => {
  res.json({
    active_routes_count: routes.filter(r => r.is_active).length,
    opportunities_count: matches.length,
    accepted_deliveries_count: deliveries.filter(d => d.status !== 'CANCELLED').length,
    completed_deliveries_count: deliveries.filter(d => d.status === 'DELIVERED').length,
    total_rewards_earned_inr: 41.25,
    reliability_score: currentUser.reliability_score,
    estimated_extra_distance_km: 0.7,
  });
});

app.get('/api/analytics/admin/', (req, res) => {
  res.json({
    total_users: 6,
    vendors_count: 2,
    commuters_count: 3,
    active_routes_count: routes.length,
    packages_count: packages.length,
    matches_count: matches.length,
    deliveries_count: deliveries.length,
    completed_deliveries_count: deliveries.filter(d => d.status === 'DELIVERED').length,
    gross_transaction_volume: 150.0,
    platform_fee_revenue: 37.5,
    commuter_disbursements: 112.5,
    total_distance_saved_km: 164.2,
    total_co2_saved_kg: 23.6,
  });
});

// ---------------- Frontend Vite / Static Integration ---------------- //
async function createServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RoutePool Platform] Operational at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[RoutePool Server Initialization Error]', err);
});
