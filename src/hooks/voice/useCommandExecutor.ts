import { useRouter } from 'expo-router';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/lib/supabase';
import { AssistantCommand } from '@/types/voice';
import { sendMessage } from '@/services/messages';
import { getOrCreateChatRoom, joinChatRoom, getChatRoom } from '@/services/chatRooms';
import { createPost, deleteAllUserPosts } from '@/services/hub';
import { getTripBookings, updateBookingStatus } from '@/services/bookings';
import { getTripById } from '@/services/trips';

export function useCommandExecutor() {
  const router = useRouter();

  const handleNavigate = (cmd: AssistantCommand) => {
    const screen = cmd.params.screen?.toLowerCase();
    switch (screen) {
      case 'set-route': return router.push('/(main)/ride/set-route');
      case 'home': return router.push('/(main)/(tabs)/');
      case 'hub':
      case 'community': return router.push('/(main)/(tabs)/community');
      case 'rides': return router.push('/(main)/(tabs)/rides');
      case 'activity':
      case 'profile': return router.push(`/(main)/(tabs)/${screen}` as any);
    }
  };

  const handleSetRoute = (cmd: AssistantCommand) => {
    const origin = cmd.params.origin || '';
    const destination = cmd.params.destination || '';
    const queryParams = new URLSearchParams();
    if (origin) queryParams.append('origin_label', origin);
    if (destination) queryParams.append('destination_label', destination);
    router.push(`/(main)/ride/set-route?${queryParams.toString()}`);
  };

  const handlePrepareRidePost = (cmd: AssistantCommand) => {
    const queryParams = new URLSearchParams();
    if (cmd.params.time) queryParams.append('time', cmd.params.time);
    if (cmd.params.date) queryParams.append('date', cmd.params.date);
    if (cmd.params.origin) queryParams.append('origin', cmd.params.origin);
    if (cmd.params.destination) queryParams.append('destination', cmd.params.destination);
    router.push(`/(main)/ride/create?${queryParams.toString()}`);
  };

  const handlePrepareBooking = (cmd: AssistantCommand, currentContext: any) => {
    const tripId = cmd.params.trip_id || currentContext?.selectedTripId;
    if (tripId) {
      router.push(`/(main)/ride/book/${tripId}`);
    } else {
      router.push('/(main)/(tabs)/hub');
    }
  };

  const handleAcceptBooking = async (cmd: AssistantCommand, currentContext: any, profile: any) => {
    const tripId = currentContext?.selectedTripId;
    if (!tripId) return;

    const bookings = await getTripBookings(tripId);
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    
    if (pendingBookings.length === 0) return;

    let targetBooking = pendingBookings[0];
    if (cmd.params.commuter_name) {
      const nameLower = cmd.params.commuter_name.toLowerCase();
      const match = pendingBookings.find(b => 
        b.commuter?.full_name?.toLowerCase().includes(nameLower)
      );
      if (match) targetBooking = match;
    }
    
    await updateBookingStatus(targetBooking.id, 'accepted');
    
    try {
      const trip = await getTripById(tripId);
      if (trip) {
        const seatsBooked = trip.fare_per_seat > 0 ? Math.round(targetBooking.fare_paid / trip.fare_per_seat) : 1;
        const newAvailableSeats = Math.max(0, trip.available_seats - seatsBooked);
        await supabase.from('trips').update({ available_seats: newAvailableSeats }).eq('id', trip.id);
      }
    } catch (seatErr) {
      console.error('Error updating available seats via voice accept:', seatErr);
    }
    
    try {
      let room = await getChatRoom(tripId);
      if (!room) room = await getOrCreateChatRoom(tripId);
      if (room) {
        await joinChatRoom(room.id, targetBooking.commuter_id);
        if (profile?.id) {
          await joinChatRoom(room.id, profile.id);
          await sendMessage(room.id, profile.id, `${targetBooking.commuter?.full_name || 'Passenger'} has joined the trip!`, true);
        }
      }
    } catch (chatErr) {
      console.error('Error setting up chatroom for accepted booking via voice:', chatErr);
    }

    DeviceEventEmitter.emit('refresh_data');
  };

  const handleDraftMessage = async (cmd: AssistantCommand, currentContext: any, profile: any) => {
    const chatRoomId = currentContext?.selectedChatRoomId;
    if (chatRoomId && profile?.id) {
      await sendMessage(chatRoomId, profile.id, cmd.params.message);
      DeviceEventEmitter.emit('refresh_data');
    }
  };

  const handleDraftCommunityPost = async (cmd: AssistantCommand, currentContext: any, profile: any) => {
    const route = currentContext?.activeRoute;
    if (route && profile?.id) {
      await createPost(
        profile.id,
        route.route_hash,
        'other',
        cmd.params.message,
        route.origin_lat,
        route.origin_lng,
        route.origin_label.split(',')[0]
      );
      DeviceEventEmitter.emit('refresh_data');
      router.push('/(main)/(tabs)/community');
    }
  };

  const handleDeletePosts = async (currentContext: any, profile: any) => {
    const route = currentContext?.activeRoute;
    if (profile?.id) {
      await deleteAllUserPosts(profile.id, route?.route_hash);
      DeviceEventEmitter.emit('refresh_data');
      router.push('/(main)/(tabs)/community');
    }
  };

  const executeCommand = async (cmd: AssistantCommand, currentContext: any, profile: any) => {
    switch (cmd.type) {
      case 'NAVIGATE':
        handleNavigate(cmd);
        break;
      case 'SET_ROUTE':
        handleSetRoute(cmd);
        break;
      case 'SEARCH_RIDES':
        router.push('/(main)/(tabs)/rides');
        break;
      case 'SUMMARIZE_ACTIVITY':
        router.push('/(main)/(tabs)/activity');
        break;
      case 'PREPARE_RIDE_POST':
        handlePrepareRidePost(cmd);
        break;
      case 'PREPARE_BOOKING':
        handlePrepareBooking(cmd, currentContext);
        break;
      case 'ACCEPT_BOOKING':
        await handleAcceptBooking(cmd, currentContext, profile);
        break;
      case 'DRAFT_MESSAGE':
        await handleDraftMessage(cmd, currentContext, profile);
        break;
      case 'DRAFT_COMMUNITY_POST':
        await handleDraftCommunityPost(cmd, currentContext, profile);
        break;
      case 'DELETE_POSTS':
        await handleDeletePosts(currentContext, profile);
        break;
      case 'CLARIFY':
      case 'NOOP':
      default:
        // No execution needed
        break;
    }
  };

  return { executeCommand };
}
