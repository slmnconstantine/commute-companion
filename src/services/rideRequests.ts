import { supabase } from '@/lib/supabase';
import { Route, Profile } from '@/types/database';

export interface CommuterRequest extends Route {
  commuter: Profile;
}

export const getCommuterRequests = async (): Promise<CommuterRequest[]> => {
  const { data, error } = await supabase
    .from('routes')
    .select(`
      *,
      user:profiles!routes_user_id_fkey(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching commuter requests:', error);
    return [];
  }

  // Filter out any routes that don't belong to a commuter (just in case drivers have active routes)
  // and map the response
  const requests = data.map(row => ({
    ...row,
    commuter: Array.isArray(row.user) ? row.user[0] : row.user
  })).filter(req => req.commuter?.role === 'commuter');

  return requests;
};
