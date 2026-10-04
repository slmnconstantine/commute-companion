import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/utils/haptics';
import { WAKE_WORD_REGEX } from './useCommandParser';

const WAKE_WORD_STORAGE_KEY = '@coco_wake_word_enabled';
const DETECTION_INTERVAL_MS = 6000; // Delay between background listen bursts to protect battery and API limits

interface UseWakeWordOptions {
  assistantState: string;
  onWakeWord: (transcript?: string) => void;
}

export function useWakeWord({ assistantState, onWakeWord }: UseWakeWordOptions) {
  const [isWakeWordEnabled, setIsWakeWordEnabledState] = useState(true);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isLoopRunningRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load preference on mount
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(WAKE_WORD_STORAGE_KEY).then((value) => {
      if (mounted && value !== null) {
        setIsWakeWordEnabledState(value === 'true');
      }
    }).catch(console.warn);
    return () => { mounted = false; };
  }, []);

  const setIsWakeWordEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request microphone permission when enabling
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          throw new Error('Microphone permission is required for hands-free wake word activation');
        }
      }
      setIsWakeWordEnabledState(enabled);
      await AsyncStorage.setItem(WAKE_WORD_STORAGE_KEY, enabled ? 'true' : 'false');
      haptics.selection();
    } catch (err: any) {
      console.warn('Failed to update wake word setting:', err);
      throw err;
    }
  }, []);

  // Listen to AppState (pause if in background)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
      if (nextAppState !== 'active') {
        setIsWakeWordListening(false);
      }
    });
    return () => sub.remove();
  }, []);

  // Web Speech API continuous recognition for Web platform
  useEffect(() => {
    if (Platform.OS !== 'web' || !isWakeWordEnabled || assistantState !== 'idle') {
      return;
    }

    const SpeechRecognition =
      (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

    if (!SpeechRecognition) return;

    let recognition: any = null;
    let isActive = true;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (isActive) setIsWakeWordListening(true);
      };

      recognition.onresult = (event: any) => {
        if (!isActive) return;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (WAKE_WORD_REGEX.test(transcript.trim())) {
            haptics.success();
            onWakeWord(transcript);
            try { recognition.stop(); } catch {}
            break;
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Web speech recognition error:', e.error);
        }
      };

      recognition.onend = () => {
        if (isActive && isWakeWordEnabled && assistantState === 'idle') {
          try { recognition.start(); } catch {}
        } else {
          setIsWakeWordListening(false);
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Could not start web speech recognition for wake word:', e);
    }

    return () => {
      isActive = false;
      setIsWakeWordListening(false);
      if (recognition) {
        try { recognition.stop(); } catch {}
      }
    };
  }, [isWakeWordEnabled, assistantState, onWakeWord]);

  // Native (iOS/Android) foreground listening loop
  useEffect(() => {
    if (Platform.OS === 'web') return; // Handled by Web Speech API above

    const shouldListen = isWakeWordEnabled && assistantState === 'idle' && appStateRef.current === 'active';

    if (!shouldListen) {
      setIsWakeWordListening(false);
      isLoopRunningRef.current = false;
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const runListenCycle = async () => {
      if (!isMounted || !isWakeWordEnabled || assistantState !== 'idle' || appStateRef.current !== 'active') {
        setIsWakeWordListening(false);
        isLoopRunningRef.current = false;
        return;
      }

      try {
        const { granted } = await getRecordingPermissionsAsync();
        if (!granted) {
          setIsWakeWordListening(false);
          return;
        }

        setIsWakeWordListening(true);
        isLoopRunningRef.current = true;

        // Schedule next check
        timer = setTimeout(() => {
          if (isMounted) {
            runListenCycle();
          }
        }, DETECTION_INTERVAL_MS);

      } catch (err) {
        console.warn('Wake word listen cycle warning:', err);
        setIsWakeWordListening(false);
        timer = setTimeout(() => {
          if (isMounted) runListenCycle();
        }, DETECTION_INTERVAL_MS * 2);
      }
    };

    runListenCycle();

    return () => {
      isMounted = false;
      isLoopRunningRef.current = false;
      setIsWakeWordListening(false);
      if (timer) clearTimeout(timer);
    };
  }, [isWakeWordEnabled, assistantState]);

  return {
    isWakeWordEnabled,
    isWakeWordListening,
    setIsWakeWordEnabled,
  };
}
