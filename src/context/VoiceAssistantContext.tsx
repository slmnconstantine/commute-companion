import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { sendMessage } from '@/services/messages';
import { getOrCreateChatRoom, joinChatRoom, getChatRoom } from '@/services/chatRooms';
import { createPost, deleteAllUserPosts } from '@/services/hub';
import { getTripBookings, updateBookingStatus } from '@/services/bookings';

type AssistantState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'confirming' | 'executing' | 'speaking' | 'error';

export interface AssistantCommand {
  type: 'SEARCH_RIDES' | 'SUMMARIZE_ACTIVITY' | 'DRAFT_MESSAGE' | 'DRAFT_COMMUNITY_POST' | 'DELETE_POSTS' | 'PREPARE_BOOKING' | 'ACCEPT_BOOKING' | 'PREPARE_RIDE_POST' | 'NAVIGATE' | 'CLARIFY' | 'NOOP';
  params: Record<string, any>;
  spokenReply: string;
  requiresConfirmation: boolean;
  transcript: string;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface VoiceAssistantContextValue {
  state: AssistantState;
  transcript: string;
  spokenReply: string;
  conversation: VoiceMessage[];
  command: AssistantCommand | null;
  startRecording: (contextData: any, preserveCommand?: boolean) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancel: () => void;
  confirmAction: () => Promise<void>;
  clearConversation: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [spokenReply, setSpokenReply] = useState('');
  const [conversation, setConversation] = useState<VoiceMessage[]>([]);
  const [command, setCommand] = useState<AssistantCommand | null>(null);
  const [currentContext, setCurrentContext] = useState<any>(null);

  const { profile } = useAuth();
  const router = useRouter();
  
  // Audio recorder hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async (contextData: any, preserveCommand: boolean = false) => {
    try {
      Speech.stop();
      if (!preserveCommand) {
        setCommand(null);
        setConversation([]);
      }
      setTranscript('');
      setSpokenReply('');
      setCurrentContext(contextData);

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch (e: any) {
      console.error('Failed to start recording', e);
      setState('error');
      setSpokenReply(e.message || 'Could not start microphone');
      setTimeout(() => {
        setState('idle');
        setConversation([]);
      }, 3000);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (state !== 'recording') return;
    const isConfirmingLoop = !!command && state === 'recording';
    setState('transcribing');
    
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('No audio recorded');

      const audioBase64 = await FileSystem.readAsStringAsync(recorder.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: {
          audioBase64,
          context: {
            userId: profile?.id,
            role: profile?.role,
            ...currentContext,
          }
        }
      });

      if (error) {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json().catch(() => null);
          console.error('Edge Function Detailed Error:', errBody);
        } else if (error.context && typeof error.context.text === 'function') {
          const errText = await error.context.text().catch(() => null);
          console.error('Edge Function Detailed Error Text:', errText);
        }
        throw error;
      }
      
      const result = data as AssistantCommand;
      
      if (isConfirmingLoop && command) {
        // Evaluate yes/no based on transcript
        const t = result.transcript.toLowerCase();
        const isYes = t.includes('yes') || t.includes('yeah') || t.includes('yep') || t.includes('sure') || t.includes('ok') || t.includes('proceed');
        const isNo = t.includes('no') || t.includes('cancel') || t.includes('stop') || t.includes('nevermind');
        
        if (isYes) {
          setSpokenReply('Okay, executing now.');
          setConversation(prev => [...prev, { id: Date.now().toString(), role: 'user', text: t }, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Okay, executing now.' }]);
          Speech.speak('Okay, executing now.', { onDone: () => { executeCommand(command); } });
        } else if (isNo) {
          setSpokenReply('Action cancelled.');
          setConversation(prev => [...prev, { id: Date.now().toString(), role: 'user', text: t }, { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Action cancelled.' }]);
          Speech.speak('Action cancelled.', { onDone: () => { cancel(); } });
        } else {
          setSpokenReply("I didn't catch a clear yes or no. Cancelling action.");
          setConversation(prev => [...prev, { id: Date.now().toString(), role: 'user', text: t }, { id: (Date.now() + 1).toString(), role: 'assistant', text: "I didn't catch a clear yes or no. Cancelling action." }]);
          Speech.speak("I didn't catch a clear yes or no. Cancelling action.", { onDone: () => { cancel(); } });
        }
        return;
      }

      setTranscript(result.transcript);
      setSpokenReply(result.spokenReply);
      setCommand(result);
      setConversation(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', text: result.transcript },
        { id: (Date.now() + 1).toString(), role: 'assistant', text: result.spokenReply }
      ]);

      if (result.spokenReply) {
        setState('speaking');
        Speech.speak(result.spokenReply, {
          onDone: () => {
            if (result.requiresConfirmation) {
              setState('confirming');
              // Auto-start recording for the strict yes/no loop
              setTimeout(() => {
                startRecording(currentContext, true);
              }, 500);
            } else {
              executeCommand(result);
            }
          }
        });
      } else {
        if (result.requiresConfirmation) {
          setState('confirming');
          startRecording(currentContext, true);
        } else {
          executeCommand(result);
        }
      }

    } catch (e: any) {
      console.error('Voice Assistant Error:', e);
      setState('error');
      setSpokenReply('Sorry, there was an error processing your command.');
      setConversation(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Sorry, there was an error processing your command.' }]);
      Speech.speak('Sorry, there was an error processing your command.', {
        onDone: () => {
          setState('idle');
          setConversation([]);
        }
      });
    }
  }, [state, recorder, profile, currentContext]);

  const cancel = useCallback(() => {
    if (state === 'recording') {
      recorder.stop();
    }
    Speech.stop();
    setState('idle');
    setCommand(null);
    setTranscript('');
    setSpokenReply('');
    setConversation([]);
  }, [state, recorder]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  const confirmAction = useCallback(async () => {
    if (state !== 'confirming' || !command) return;
    executeCommand(command);
  }, [state, command]);

  const executeCommand = async (cmd: AssistantCommand) => {
    setState('executing');
    
    try {
      if (cmd.type === 'NAVIGATE') {
        const screen = cmd.params.screen?.toLowerCase();
        if (['home', 'hub', 'activity', 'community', 'profile'].includes(screen)) {
          router.push(`/(main)/(tabs)/${screen}` as any);
        }
      } else if (cmd.type === 'SEARCH_RIDES') {
        router.push('/(main)/(tabs)/hub');
      } else if (cmd.type === 'SUMMARIZE_ACTIVITY') {
        router.push('/(main)/(tabs)/activity');
      } else if (cmd.type === 'PREPARE_RIDE_POST') {
        const queryParams = new URLSearchParams();
        if (cmd.params.time) queryParams.append('time', cmd.params.time);
        if (cmd.params.date) queryParams.append('date', cmd.params.date);
        if (cmd.params.origin) queryParams.append('origin', cmd.params.origin);
        if (cmd.params.destination) queryParams.append('destination', cmd.params.destination);
        
        router.push(`/(main)/ride/create?${queryParams.toString()}`);
      } else if (cmd.type === 'PREPARE_BOOKING') {
        const tripId = cmd.params.trip_id || currentContext?.selectedTripId;
        if (tripId) {
          router.push(`/(main)/ride/book/${tripId}`);
        } else {
          router.push('/(main)/(tabs)/hub');
        }
      } else if (cmd.type === 'ACCEPT_BOOKING') {
        const tripId = currentContext?.selectedTripId;
        if (tripId) {
          const bookings = await getTripBookings(tripId);
          const pendingBookings = bookings.filter(b => b.status === 'pending');
          
          if (pendingBookings.length > 0) {
            let targetBooking = pendingBookings[0];
            
            // If the AI extracted a commuter name, try to find a match
            if (cmd.params.commuter_name) {
              const nameLower = cmd.params.commuter_name.toLowerCase();
              const match = pendingBookings.find(b => 
                b.commuter?.full_name?.toLowerCase().includes(nameLower)
              );
              if (match) targetBooking = match;
            }
            
            await updateBookingStatus(targetBooking.id, 'accepted');
            
            // Create/fetch chat room and join members
            try {
              let room = await getChatRoom(tripId);
              let isNewRoom = false;
              if (!room) {
                room = await getOrCreateChatRoom(tripId);
                isNewRoom = true;
              }
              if (room) {
                await joinChatRoom(room.id, targetBooking.commuter_id);
                if (isNewRoom && profile?.id) {
                  await joinChatRoom(room.id, profile.id);
                }
                if (profile?.id) {
                  await sendMessage(room.id, profile.id, `${targetBooking.commuter?.full_name || 'Passenger'} has joined the trip!`, true);
                }
              }
            } catch (chatErr) {
              console.error('Error setting up chatroom for accepted booking via voice:', chatErr);
            }
          }
        }
      } else if (cmd.type === 'DRAFT_MESSAGE') {
        const chatRoomId = currentContext?.selectedChatRoomId;
        if (chatRoomId && profile?.id) {
          await sendMessage(chatRoomId, profile.id, cmd.params.message);
        }
      } else if (cmd.type === 'DRAFT_COMMUNITY_POST') {
        const route = currentContext?.activeRoute;
        if (route && profile?.id) {
          await createPost(
            profile.id,
            route.route_hash,
            'other', // statusTag
            cmd.params.message, // message
            route.origin_lat,
            route.origin_lng,
            route.origin_label.split(',')[0]
          );
          router.push('/(main)/(tabs)/community');
        }
      } else if (cmd.type === 'DELETE_POSTS') {
        const route = currentContext?.activeRoute;
        if (route && profile?.id) {
          await deleteAllUserPosts(profile.id, route.route_hash);
          router.push('/(main)/(tabs)/community');
        }
      }

      setTimeout(() => {
        setState('idle');
        setCommand(null);
        setConversation([]);
      }, 1000);
    } catch (e) {
      console.error('Execution Error:', e);
      setState('error');
      setTimeout(() => {
        setState('idle');
        setConversation([]);
      }, 2000);
    }
  };

  return (
    <VoiceAssistantContext.Provider value={{
      state,
      transcript,
      spokenReply,
      conversation,
      command,
      startRecording,
      stopRecording,
      cancel,
      confirmAction,
      clearConversation
    }}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
}
