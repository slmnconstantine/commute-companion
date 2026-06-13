import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
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
import { getTripById } from '@/services/trips';

type AssistantState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'confirming' | 'executing' | 'speaking' | 'error';

export interface AssistantCommand {
  type: 'SEARCH_RIDES' | 'SUMMARIZE_ACTIVITY' | 'DRAFT_MESSAGE' | 'DRAFT_COMMUNITY_POST' | 'DELETE_POSTS' | 'PREPARE_BOOKING' | 'ACCEPT_BOOKING' | 'PREPARE_RIDE_POST' | 'NAVIGATE' | 'CLARIFY' | 'NOOP' | 'SET_ROUTE';
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
  startRecording: (contextData: any, preserveCommand?: boolean, isConfirming?: boolean) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancel: () => void;
  confirmAction: () => Promise<void>;
  clearConversation: () => void;
  processTextInput: (text: string, contextData?: any) => Promise<void>;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

interface IntentPattern {
  pattern: RegExp;
  command: AssistantCommand['type'];
  params: (match: RegExpMatchArray, context?: any) => Record<string, any>;
  spokenReply: (match: RegExpMatchArray, params: Record<string, any>) => string;
  requiresConfirmation: boolean;
}

const INTENTS: IntentPattern[] = [
  {
    pattern: /(?:go\s+to|navigate\s+to|show|open|take\s+me\s+to)\s+(home|hub|rides|activity|community|profile|set\s+route)/i,
    command: 'NAVIGATE',
    params: (match) => {
      let screen = match[1].toLowerCase().replace(/\s+/g, '');
      if (screen === 'setroute') screen = 'set-route';
      return { screen };
    },
    spokenReply: (match, params) => `Navigating to the ${params.screen} screen.`,
    requiresConfirmation: false
  },
  {
    pattern: /(?:show|find|search)\s+(?:for\s+)?rides/i,
    command: 'SEARCH_RIDES',
    params: () => ({}),
    spokenReply: () => "Sure, opening the ride search screen.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:summarize|show|my)\s+(?:upcoming\s+)?(?:trips|bookings|activity)/i,
    command: 'SUMMARIZE_ACTIVITY',
    params: () => ({}),
    spokenReply: () => "Here is a summary of your activity.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:accept|confirm)\s+(?:the\s+)?(?:ride|booking)(?:\s+for\s+([a-zA-Z\s]+))?/i,
    command: 'ACCEPT_BOOKING',
    params: (match) => ({ commuter_name: match[1]?.trim() || null }),
    spokenReply: (match, params) => params.commuter_name 
      ? `Accepting the booking request for ${params.commuter_name}.`
      : "Accepting the booking request.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:post|create|offer)\s+(?:a\s+)?ride/i,
    command: 'PREPARE_RIDE_POST',
    params: () => ({}),
    spokenReply: () => "Let's create a new ride post.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:set|change|update)\s+(?:my\s+)?route(?:\s+from\s+([a-zA-Z0-9\s,]+))?(?:\s+to\s+([a-zA-Z0-9\s,]+))?/i,
    command: 'SET_ROUTE',
    params: (match) => ({
      origin: match[1]?.trim() || null,
      destination: match[2]?.trim() || null
    }),
    spokenReply: (match, params) => {
      if (params.origin && params.destination) {
        return `Setting your route from ${params.origin} to ${params.destination}.`;
      } else if (params.destination) {
        return `Setting your destination to ${params.destination}.`;
      }
      return "Opening the route setting screen.";
    },
    requiresConfirmation: false
  }
];

function matchClientIntent(text: string, context: any): AssistantCommand | null {
  const cleanText = text.trim();
  for (const intent of INTENTS) {
    const match = cleanText.match(intent.pattern);
    if (match) {
      const params = intent.params(match, context);
      const spokenReply = intent.spokenReply(match, params);
      return {
        type: intent.command,
        params,
        spokenReply,
        requiresConfirmation: intent.requiresConfirmation,
        transcript: text
      };
    }
  }
  return null;
}

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

  // Keep state updated in refs to prevent stale closures in timeouts
  const stateRef = useRef(state);
  const commandRef = useRef(command);
  const currentContextRef = useRef(currentContext);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  useEffect(() => {
    currentContextRef.current = currentContext;
  }, [currentContext]);

  const startRecording = useCallback(async (contextData: any, preserveCommand: boolean = false, isConfirming: boolean = false) => {
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
      setState(isConfirming ? 'confirming' : 'recording');
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

  const startConfirmationLoop = useCallback((cmd: AssistantCommand, contextData: any) => {
    setState('confirming');
    
    // Auto-record confirmation for a fixed 3.5 seconds
    setTimeout(async () => {
      try {
        if (stateRef.current !== 'confirming') return;
        await startRecording(contextData, true, true);
        
        // Auto-stop recording after 3.5 seconds
        setTimeout(() => {
          if (stateRef.current === 'confirming') {
            stopRecording();
          }
        }, 3500);
      } catch (err) {
        console.error('Error starting auto-confirmation recording:', err);
      }
    }, 600);
  }, [startRecording]);

  const stopRecording = useCallback(async () => {
    const currentState = stateRef.current;
    if (currentState !== 'recording' && currentState !== 'confirming') return;
    
    setState('transcribing');
    
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('No audio recorded');

      const audioBase64 = await FileSystem.readAsStringAsync(recorder.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call transcribe Edge Function
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: {
          action: 'transcribe',
          audioBase64,
        }
      });

      if (error) throw error;
      const textTranscript = data.transcript || '';
      console.log('Voice Assistant Transcribed text:', textTranscript);

      // If we were in the confirmation loop
      if (currentState === 'confirming' && commandRef.current) {
        const t = textTranscript.toLowerCase().trim();
        const isYes = /\b(yes|yeah|yep|sure|ok|proceed|confirm|do it)\b/i.test(t);
        const isNo = /\b(no|cancel|stop|nevermind|dont|don't)\b/i.test(t);
        const activeCommand = commandRef.current;

        if (isYes) {
          setSpokenReply('Okay, executing now.');
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Okay, executing now.' }
          ]);
          Speech.speak('Okay, executing now.', { onDone: () => { executeCommand(activeCommand); } });
        } else if (isNo) {
          setSpokenReply('Action cancelled.');
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Action cancelled.' }
          ]);
          Speech.speak('Action cancelled.', { onDone: () => { cancel(); } });
        } else {
          setSpokenReply("I didn't catch a clear yes or no. You can tap confirm or cancel.");
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: "I didn't catch a clear yes or no. You can tap confirm or cancel." }
          ]);
          setState('confirming');
          Speech.speak("I didn't catch a clear yes or no. You can tap confirm or cancel.");
        }
        return;
      }

      setTranscript(textTranscript);

      // 1. Try local regex match first
      const localMatch = matchClientIntent(textTranscript, currentContextRef.current);
      if (localMatch) {
        setSpokenReply(localMatch.spokenReply);
        setCommand(localMatch);
        setConversation(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'user', text: textTranscript },
          { id: (Date.now() + 1).toString(), role: 'assistant', text: localMatch.spokenReply }
        ]);

        if (localMatch.spokenReply) {
          setState('speaking');
          Speech.speak(localMatch.spokenReply, {
            onDone: () => {
              if (localMatch.requiresConfirmation) {
                startConfirmationLoop(localMatch, currentContextRef.current);
              } else {
                executeCommand(localMatch);
              }
            }
          });
        } else {
          if (localMatch.requiresConfirmation) {
            startConfirmationLoop(localMatch, currentContextRef.current);
          } else {
            executeCommand(localMatch);
          }
        }
        return;
      }

      // 2. Fallback to Groq Llama intent parser
      const { data: parseData, error: parseError } = await supabase.functions.invoke('voice-command', {
        body: {
          action: 'parse',
          transcript: textTranscript,
          context: {
            userId: profile?.id,
            role: profile?.role,
            ...currentContextRef.current,
          }
        }
      });

      if (parseError) throw parseError;
      
      const result = parseData as AssistantCommand;
      setSpokenReply(result.spokenReply);
      setCommand(result);
      setConversation(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', text: textTranscript },
        { id: (Date.now() + 1).toString(), role: 'assistant', text: result.spokenReply }
      ]);

      if (result.spokenReply) {
        setState('speaking');
        Speech.speak(result.spokenReply, {
          onDone: () => {
            if (result.requiresConfirmation) {
              startConfirmationLoop(result, currentContextRef.current);
            } else {
              executeCommand(result);
            }
          }
        });
      } else {
        if (result.requiresConfirmation) {
          startConfirmationLoop(result, currentContextRef.current);
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
  }, [recorder, profile, startConfirmationLoop]);

  const processTextInput = useCallback(async (text: string, contextData?: any) => {
    const activeContext = contextData || currentContextRef.current;
    try {
      Speech.stop();
      setCommand(null);
      setTranscript(text);
      setSpokenReply('');
      if (contextData) {
        setCurrentContext(contextData);
      }
      setState('thinking');

      // 1. Try local regex match first
      const localMatch = matchClientIntent(text, activeContext);
      if (localMatch) {
        setSpokenReply(localMatch.spokenReply);
        setCommand(localMatch);
        setConversation(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'user', text },
          { id: (Date.now() + 1).toString(), role: 'assistant', text: localMatch.spokenReply }
        ]);

        if (localMatch.spokenReply) {
          setState('speaking');
          Speech.speak(localMatch.spokenReply, {
            onDone: () => {
              if (localMatch.requiresConfirmation) {
                startConfirmationLoop(localMatch, activeContext);
              } else {
                executeCommand(localMatch);
              }
            }
          });
        } else {
          if (localMatch.requiresConfirmation) {
            startConfirmationLoop(localMatch, activeContext);
          } else {
            executeCommand(localMatch);
          }
        }
        return;
      }

      // 2. Fallback to Groq Llama NLU (only if online)
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: {
          action: 'parse',
          transcript: text,
          context: {
            userId: profile?.id,
            role: profile?.role,
            ...activeContext,
          }
        }
      });

      if (error) throw error;
      const result = data as AssistantCommand;

      setSpokenReply(result.spokenReply);
      setCommand(result);
      setConversation(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', text },
        { id: (Date.now() + 1).toString(), role: 'assistant', text: result.spokenReply }
      ]);

      if (result.spokenReply) {
        setState('speaking');
        Speech.speak(result.spokenReply, {
          onDone: () => {
            if (result.requiresConfirmation) {
              startConfirmationLoop(result, contextData);
            } else {
              executeCommand(result);
            }
          }
        });
      } else {
        if (result.requiresConfirmation) {
          startConfirmationLoop(result, contextData);
        } else {
          executeCommand(result);
        }
      }

    } catch (e: any) {
      console.error('Text Command Input Error:', e);
      setState('error');
      setSpokenReply('Sorry, I couldn\'t process that command.');
      Speech.speak('Sorry, I couldn\'t process that command.', {
        onDone: () => {
          setState('idle');
        }
      });
    }
  }, [profile, startConfirmationLoop]);

  const cancel = useCallback(() => {
    // If the recorder is recording, stop it silently
    try {
      recorder.stop();
    } catch {}
    Speech.stop();
    setState('idle');
    setCommand(null);
    setTranscript('');
    setSpokenReply('');
    setConversation([]);
  }, [recorder]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  const confirmAction = useCallback(async () => {
    if (stateRef.current !== 'confirming' || !commandRef.current) return;
    try {
      recorder.stop();
    } catch {}
    executeCommand(commandRef.current);
  }, [recorder]);

  const executeCommand = async (cmd: AssistantCommand) => {
    setState('executing');
    
    try {
      if (cmd.type === 'NAVIGATE') {
        const screen = cmd.params.screen?.toLowerCase();
        if (screen === 'set-route') {
          router.push('/(main)/ride/set-route');
        } else if (screen === 'home') {
          router.push('/(main)/(tabs)/');
        } else if (screen === 'hub' || screen === 'community') {
          router.push('/(main)/(tabs)/community');
        } else if (screen === 'rides') {
          router.push('/(main)/(tabs)/rides');
        } else if (['activity', 'profile'].includes(screen)) {
          router.push(`/(main)/(tabs)/${screen}` as any);
        }
      } else if (cmd.type === 'SET_ROUTE') {
        const origin = cmd.params.origin || '';
        const destination = cmd.params.destination || '';
        const queryParams = new URLSearchParams();
        if (origin) queryParams.append('origin_label', origin);
        if (destination) queryParams.append('destination_label', destination);
        
        router.push(`/(main)/ride/set-route?${queryParams.toString()}`);
      } else if (cmd.type === 'SEARCH_RIDES') {
        router.push('/(main)/(tabs)/rides');
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
        const tripId = cmd.params.trip_id || currentContextRef.current?.selectedTripId;
        if (tripId) {
          router.push(`/(main)/ride/book/${tripId}`);
        } else {
          router.push('/(main)/(tabs)/hub');
        }
      } else if (cmd.type === 'ACCEPT_BOOKING') {
        const tripId = currentContextRef.current?.selectedTripId;
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
            
            // Update available seats in database
            try {
              const trip = await getTripById(tripId);
              if (trip) {
                const seatsBooked = trip.fare_per_seat > 0 ? Math.round(targetBooking.fare_paid / trip.fare_per_seat) : 1;
                const newAvailableSeats = Math.max(0, trip.available_seats - seatsBooked);
                
                await supabase
                  .from('trips')
                  .update({ available_seats: newAvailableSeats })
                  .eq('id', trip.id);
              }
            } catch (seatErr) {
              console.error('Error updating available seats via voice accept:', seatErr);
            }
            
            // Create/fetch chat room and join members
            try {
              let room = await getChatRoom(tripId);
              if (!room) {
                room = await getOrCreateChatRoom(tripId);
              }
              if (room) {
                await joinChatRoom(room.id, targetBooking.commuter_id);
                if (profile?.id) {
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
        const chatRoomId = currentContextRef.current?.selectedChatRoomId;
        if (chatRoomId && profile?.id) {
          await sendMessage(chatRoomId, profile.id, cmd.params.message);
        }
      } else if (cmd.type === 'DRAFT_COMMUNITY_POST') {
        const route = currentContextRef.current?.activeRoute;
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
        const route = currentContextRef.current?.activeRoute;
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
      clearConversation,
      processTextInput
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
