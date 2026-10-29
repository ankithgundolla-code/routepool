export type UserRole = 'vendor' | 'commuter' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  reliability_score: number;
}

export interface Vendor {
  id: number;
  user: number;
  business_name: string;
  location: string;
  lat: number;
  lng: number;
  email?: string;
  name?: string;
  created_at?: string;
}

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
}

export interface CommuterRoute {
  id: number;
  commuter: number;
  commuter_name: string;
  commuter_email: string;
  commuter_phone?: string;
  reliability_score: number;
  route_name: string;
  start_location: string;
  start_lat: number;
  start_lng: number;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  intermediate_points: Waypoint[];
  route_geometry: [number, number][];
  departure_time: string;
  arrival_time: string;
  available_days: string[];
  max_package_weight: number;
  max_package_size: 'small' | 'medium' | 'large';
  max_detour: number;
  travel_mode: 'two_wheeler' | 'car' | 'metro_walking' | 'bicycle';
  is_active: boolean;
  created_at: string;
}

export interface Package {
  id: number;
  vendor: number;
  vendor_business_name: string;
  vendor_email: string;
  package_name: string;
  description: string;
  pickup_location: string;
  pickup_lat: number;
  pickup_lng: number;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  weight: number;
  size: 'small' | 'medium' | 'large';
  ready_time: string;
  delivery_deadline: string;
  offered_reward: number;
  status: 'CREATED' | 'SEARCHING' | 'MATCHED' | 'PICKUP_PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  direct_distance_km: number;
  estimated_standard_courier_price: number;
  estimated_savings: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: number;
  package: number;
  commuter_route: number;
  package_detail?: Package;
  route_detail?: CommuterRoute;
  vendor_business_name: string;
  commuter_name: string;
  commuter_reliability: number;
  pickup_distance: number;
  destination_distance: number;
  normal_distance: number;
  delivery_distance: number;
  estimated_detour: number;
  time_score: number;
  package_score: number;
  route_score: number;
  reliability_score: number;
  detour_penalty: number;
  final_score: number;
  match_level: 'EXACT' | 'NEARBY' | 'EXTENDED';
  status: 'PROPOSED' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  offered_reward: number;
  commuter_earnings: number;
  platform_fee: number;
  created_at: string;
}

export interface Delivery {
  id: number;
  match: number;
  match_detail?: Match;
  package_name: string;
  vendor_business: string;
  commuter_name: string;
  commuter_phone?: string;
  vendor_phone?: string;
  pickup_location: string;
  destination: string;
  offered_reward: number;
  direct_distance_km: number;
  pickup_otp: string;
  delivery_otp: string;
  pickup_verified: boolean;
  delivery_verified: boolean;
  picked_up_at?: string;
  delivered_at?: string;
  status: 'PICKUP_PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  delivery: number;
  package_name: string;
  vendor_business: string;
  commuter_name: string;
  vendor_amount: number;
  commuter_reward: number;
  platform_fee: number;
  created_at: string;
}

export interface EcoImpact {
  id: number;
  delivery: number;
  package_name: string;
  vendor_name: string;
  commuter_name: string;
  estimated_distance_saved: number;
  estimated_co2_saved: number;
  created_at: string;
}

export interface PlatformOverview {
  deliveries_completed: number;
  estimated_distance_avoided_km: number;
  estimated_co2_reduced_kg: number;
  active_routes_count: number;
  active_commuters_count: number;
  active_vendors_count: number;
  co2_emission_factor: string;
  calculation_note: string;
}

export interface VendorAnalytics {
  total_packages: number;
  searching_count: number;
  matched_count: number;
  in_transit_count: number;
  delivered_count: number;
  estimated_savings_inr: number;
  distance_saved_km: number;
  co2_saved_kg: number;
}

export interface CommuterAnalytics {
  active_routes_count: number;
  opportunities_count: number;
  accepted_deliveries_count: number;
  completed_deliveries_count: number;
  total_rewards_earned_inr: number;
  reliability_score: number;
  estimated_extra_distance_km: number;
}

export interface AdminAnalytics {
  total_users: number;
  vendors_count: number;
  commuters_count: number;
  active_routes_count: number;
  packages_count: number;
  matches_count: number;
  deliveries_count: number;
  completed_deliveries_count: number;
  gross_transaction_volume: number;
  platform_fee_revenue: number;
  commuter_disbursements: number;
  total_distance_saved_km: number;
  total_co2_saved_kg: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
