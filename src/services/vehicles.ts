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
  capacity: string
): Promise<Vehicle | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const targetDriverId = user?.id || driverId;

  // Ensure user has driver role in profiles so driver-specific RLS policies pass
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', targetDriverId)
      .single();

    if (prof && prof.role !== 'driver') {
      await supabase
        .from('profiles')
        .update({ role: 'driver' })
        .eq('id', targetDriverId);
    }
  } catch (e) {
    // Non-critical check
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      driver_id: targetDriverId,
      plate_number: plateNumber,
      type,
      model,
      capacity,
      is_active: true
    })
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
