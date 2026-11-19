import { supabase } from '@/lib/supabase';
import { Vehicle } from '@/types/database';
import { handleServiceError } from '@/utils/errorHelper';

export const getVehicles = async (driverId: string): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) {
    handleServiceError('Error fetching vehicles:', error);
    return [];
  }
  return data as Vehicle[];
};

export const addVehicle = async (
  driverId: string, 
  plateNumber: string, 
  type: string, 
  model: string, 
  capacity: string,
  photoUrl?: string,
  orCrUrl?: string
): Promise<Vehicle | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const targetDriverId = user?.id || driverId;

  // Satisfy database check constraint: vehicles_type_check (type IN ('private', 'public'))
  const normalizedType =
    type === 'public' || type === 'tricycle' || type === 'jeepney'
      ? 'public'
      : 'private';

  const insertPayload: Record<string, any> = {
    driver_id: targetDriverId,
    plate_number: plateNumber,
    type: normalizedType,
    model,
    capacity,
    is_active: true
  };

  if (photoUrl) insertPayload.photo_url = photoUrl;
  if (orCrUrl) insertPayload.or_cr_url = orCrUrl;

  const { data, error } = await supabase
    .from('vehicles')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    handleServiceError('Error adding vehicle:', error);
    throw error;
  }
  return data as Vehicle;
};

export const deleteVehicle = async (vehicleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId);

  if (error) {
    handleServiceError('Error deleting vehicle:', error);
    return false;
  }
  return true;
};
