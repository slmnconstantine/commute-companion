import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { TripWithDriver, BookingWithTrip } from '@/types/database';

export async function exportTripsAsCSV(trips: BookingWithTrip[] | TripWithDriver[], role: 'driver' | 'commuter'): Promise<void> {
  let csvContent = '';

  if (role === 'driver') {
    csvContent = 'Date,Origin,Destination,Status,Fare Per Seat,Available Seats\n';
    (trips as TripWithDriver[]).forEach(trip => {
      const date = new Date(trip.departure_time).toLocaleDateString('en-PH');
      const origin = `"${trip.origin_label.replace(/"/g, '""')}"`;
      const dest = `"${trip.destination_label.replace(/"/g, '""')}"`;
      csvContent += `${date},${origin},${dest},${trip.status},${trip.fare_per_seat},${trip.available_seats}\n`;
    });
  } else {
    csvContent = 'Date,Origin,Destination,Status,Fare Paid,Seats Booked\n';
    (trips as BookingWithTrip[]).filter(b => b.trip).forEach(booking => {
      const date = new Date(booking.trip.departure_time).toLocaleDateString('en-PH');
      const origin = `"${booking.trip.origin_label.replace(/"/g, '""')}"`;
      const dest = `"${booking.trip.destination_label.replace(/"/g, '""')}"`;
      csvContent += `${date},${origin},${dest},${booking.status},${booking.fare_paid},${booking.seats_booked}\n`;
    });
  }

  const fileName = `RideHistory_${new Date().getTime()}.csv`;
  const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
    const canShare = await Sharing.isAvailableAsync();
    
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Ride History',
        UTI: 'public.comma-separated-values-text'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (e) {
    console.error('Failed to export CSV:', e);
    throw e;
  }
}
