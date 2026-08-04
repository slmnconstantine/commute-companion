import { supabase } from '@/lib/supabase';
import { Profile, Vehicle } from '@/types/database';
import { sendPushNotification } from './pushNotifications';
import { handleServiceError } from '@/utils/errorHelper';

export interface DriverApplication {
  id: string;
  full_name: string;
  username?: string;
  role: 'driver' | 'commuter';
  is_verified: boolean;
  verified_badge: boolean;
  avatar_url: string | null;
  government_id_url: string | null;
  created_at: string;
  push_token?: string | null;
  vehicle?: Vehicle | null;
}

export interface AdminMetrics {
  totalUsers: number;
  totalDrivers: number;
  totalCommuters: number;
  pendingVerifications: number;
  approvedDrivers: number;
  totalTrips: number;
  totalBookings: number;
  totalPlatformFees: number;
}

export interface AnalyticsData {
  roleBreakdown: {
    drivers: number;
    commuters: number;
    driverPercent: number;
    commuterPercent: number;
  };
  vehicleTypeBreakdown: {
    tricycles: number;
    sedans: number;
    suvs: number;
    vans: number;
    motorcycles: number;
  };
}

/** Fetch admin KPI summary metrics */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  try {
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('role, is_verified');

    if (profilesErr) throw profilesErr;

    const totalUsers = profiles?.length || 0;
    const totalDrivers = profiles?.filter(p => p.role === 'driver').length || 0;
    const totalCommuters = profiles?.filter(p => p.role === 'commuter').length || 0;
    const pendingVerifications = profiles?.filter(p => p.role === 'driver' && !p.is_verified).length || 0;
    const approvedDrivers = profiles?.filter(p => p.role === 'driver' && p.is_verified).length || 0;

    const { count: totalTrips } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    const { data: bookings } = await supabase
      .from('bookings')
      .select('platform_fee');

    const totalBookings = bookings?.length || 0;
    const totalPlatformFees = (bookings || []).reduce((sum, b) => sum + (b.platform_fee || 0), 0);

    return {
      totalUsers,
      totalDrivers,
      totalCommuters,
      pendingVerifications,
      approvedDrivers,
      totalTrips: totalTrips || 0,
      totalBookings,
      totalPlatformFees,
    };
  } catch (err) {
    handleServiceError('Failed to fetch admin metrics:', err);
    return {
      totalUsers: 0,
      totalDrivers: 0,
      totalCommuters: 0,
      pendingVerifications: 0,
      approvedDrivers: 0,
      totalTrips: 0,
      totalBookings: 0,
      totalPlatformFees: 0,
    };
  }
}

/** Fetch driver applications with vehicle details */
export async function getDriverApplications(statusFilter: 'all' | 'pending' | 'approved' = 'pending'): Promise<DriverApplication[]> {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');

    if (statusFilter === 'pending') {
      query = query.eq('is_verified', false);
    } else if (statusFilter === 'approved') {
      query = query.eq('is_verified', true);
    }

    const { data: drivers, error: driverErr } = await query.order('created_at', { ascending: false });

    if (driverErr) throw driverErr;
    if (!drivers || drivers.length === 0) return [];

    const driverIds = drivers.map(d => d.id);
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .in('driver_id', driverIds);

    const vehicleMap = new Map<string, Vehicle>();
    (vehicles || []).forEach(v => {
      if (!vehicleMap.has(v.driver_id)) {
        vehicleMap.set(v.driver_id, v);
      }
    });

    return drivers.map(d => ({
      ...d,
      vehicle: vehicleMap.get(d.id) || null,
    }));
  } catch (err) {
    handleServiceError('Failed to fetch driver applications:', err);
    return [];
  }
}

/** Validate (Approve or Reject) a driver application */
export async function validateDriverApplication(
  driverId: string,
  approve: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const updates = approve
      ? { is_verified: true, verified_badge: true, role: 'driver' }
      : { is_verified: false, verified_badge: false };

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', driverId)
      .select('push_token, full_name')
      .single();

    if (error) throw error;

    if (updatedProfile?.push_token) {
      const title = approve ? 'Application Approved! 🎉' : 'Application Status Update';
      const body = approve
        ? 'Congratulations! Your driver application has been verified. You can now post rides.'
        : 'Your driver application requires further details. Please review your profile info.';
      sendPushNotification(updatedProfile.push_token, title, body, { type: 'driver_validation', approve }, driverId).catch(console.error);
    }

    return { success: true, error: null };
  } catch (err: any) {
    handleServiceError('Failed to validate driver application:', err);
    return { success: false, error: err };
  }
}

/** Aggregate platform analytics data */
export async function getAdminAnalyticsData(): Promise<AnalyticsData> {
  try {
    const { data: profiles } = await supabase.from('profiles').select('role');
    const drivers = profiles?.filter(p => p.role === 'driver').length || 0;
    const commuters = profiles?.filter(p => p.role === 'commuter').length || 0;
    const total = drivers + commuters || 1;

    const { data: vehicles } = await supabase.from('vehicles').select('type');
    const tricycles = vehicles?.filter(v => v.type === 'tricycle').length || 0;
    const sedans = vehicles?.filter(v => v.type === 'sedan').length || 0;
    const suvs = vehicles?.filter(v => v.type === 'suv').length || 0;
    const vans = vehicles?.filter(v => v.type === 'van').length || 0;
    const motorcycles = vehicles?.filter(v => v.type === 'motorcycle').length || 0;

    return {
      roleBreakdown: {
        drivers,
        commuters,
        driverPercent: Math.round((drivers / total) * 100),
        commuterPercent: Math.round((commuters / total) * 100),
      },
      vehicleTypeBreakdown: {
        tricycles,
        sedans,
        suvs,
        vans,
        motorcycles,
      },
    };
  } catch (err) {
    handleServiceError('Failed to fetch admin analytics data:', err);
    return {
      roleBreakdown: { drivers: 0, commuters: 0, driverPercent: 0, commuterPercent: 0 },
      vehicleTypeBreakdown: { tricycles: 0, sedans: 0, suvs: 0, vans: 0, motorcycles: 0 },
    };
  }
}
