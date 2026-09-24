import { supabase } from '@/lib/supabase';
import { Route, Profile } from '@/types/database';
import { handleServiceError } from '@/utils/errorHelper';

export interface CommuterRequest extends Route {
  commuter: Profile;
}

function isJsonLabel(label: string | null) {
  if (!label) return false;
  try {
    const parsed = JSON.parse(label);
    return !!(parsed && typeof parsed === 'object');
  } catch (e) {
    return false;
  }
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
    handleServiceError('Error fetching commuter requests:', error);
    return [];
  }

  // Filter out any routes that don't belong to a commuter and ensure they have a JSON request label
  const requests = data
    .map(row => ({
      ...row,
      commuter: Array.isArray(row.user) ? row.user[0] : row.user
    }))
    .filter(req => req.commuter?.role === 'commuter' && isJsonLabel(req.label));

  return requests;
};
