import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { haptics } from '@/utils/haptics';

const WAKE_WORD_STORAGE_KEY = '@coco_wake_word_enabled';
const WAKE_WORD_CHECK_REGEX = /\b(?:(?:hey|hi|hello|ok|okay|yo|hoy)\s+)?coco\b/i;

interface UseWakeWordOptions {
  assistantState: string;
  onWakeWord: (transcript?: string) => void;
}

export function useWakeWord({ assistantState, onWakeWord }: UseWakeWordOptions) {
  const [isWakeWordEnabled, setIsWakeWordEnabledState] = useState(true);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onWakeWordRef = useRef(onWakeWord);
  onWakeWordRef.current = onWakeWord;

  // Load preference on mount
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(WAKE_WORD_STORAGE_KEY)
      .then((value) => {
        if (mounted && value !== null) {
          setIsWakeWordEnabledState(value === 'true');
        }
      })
      .catch(console.warn);
    return () => {
      mounted = false;
    };
  }, []);

  const setIsWakeWordEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (enabled && Platform.OS !== 'web' && ExpoSpeechRecognitionModule) {
        try {
          const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (!res.granted) {
            throw new Error('Microphone and speech recognition permissions are required for hands-free wake word');
          }
        } catch (permErr: any) {
          console.warn('Speech recognition permission error:', permErr);
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
        if (Platform.OS !== 'web' && ExpoSpeechRecognitionModule) {
          try {
            ExpoSpeechRecognitionModule.abort();
          } catch {}
        }
      }
    });
    return () => sub.remove();
  }, []);

  // 1. Web Platform Implementation (Web Speech API)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isWakeWordEnabled || assistantState !== 'idle') {
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

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
          if (WAKE_WORD_CHECK_REGEX.test(transcript.trim())) {
            haptics.success();
            onWakeWordRef.current(transcript);
            try {
              recognition.stop();
            } catch {}
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
          try {
            recognition.start();
          } catch {}
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
        try {
          recognition.stop();
        } catch {}
      }
    };
  }, [isWakeWordEnabled, assistantState]);

  // 2. Native Mobile Platform (Android & iOS via ExpoSpeechRecognitionModule & useSpeechRecognitionEvent)
  const startNativeListening = useCallback(async () => {
    if (Platform.OS === 'web' || !ExpoSpeechRecognitionModule) return;
    if (!isWakeWordEnabled || assistantState !== 'idle' || appStateRef.current !== 'active') {
      return;
    }

    try {
      const perms = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!perms.granted) {
        const req = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!req.granted) {
          setIsWakeWordListening(false);
          return;
        }
      }

      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        androidIntentOptions: {
          EXTRA_PREFER_OFFLINE: true,
        },
      });
    } catch (err: any) {
      console.warn('Native speech recognition start error:', err?.message || err);
      setIsWakeWordListening(false);
    }
  }, [isWakeWordEnabled, assistantState]);

  // Register Native Events
  useSpeechRecognitionEvent('start', () => {
    if (Platform.OS !== 'web' && isWakeWordEnabled && assistantState === 'idle') {
      setIsWakeWordListening(true);
    }
  });

  useSpeechRecognitionEvent('result', (ev) => {
    if (Platform.OS === 'web') return;
    const transcript = ev.results[0]?.transcript || '';
    if (WAKE_WORD_CHECK_REGEX.test(transcript.trim())) {
      haptics.success();
      try {
        ExpoSpeechRecognitionModule?.stop();
      } catch {}
      onWakeWordRef.current(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (Platform.OS === 'web') return;
    setIsWakeWordListening(false);
    if (isWakeWordEnabled && assistantState === 'idle' && appStateRef.current === 'active') {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isWakeWordEnabled && assistantState === 'idle') {
          startNativeListening();
        }
      }, 300);
    }
  });

  useSpeechRecognitionEvent('error', (err) => {
    if (Platform.OS === 'web') return;
    if (err.error !== 'no-speech' && err.error !== 'aborted') {
      console.warn('Native speech recognition warning:', err.error, err.message);
    }
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (isWakeWordEnabled && assistantState === 'idle' && appStateRef.current === 'active') {
      startNativeListening();
    } else {
      setIsWakeWordListening(false);
      try {
        ExpoSpeechRecognitionModule?.abort();
      } catch {}
    }

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        ExpoSpeechRecognitionModule?.abort();
      } catch {}
    };
  }, [isWakeWordEnabled, assistantState, startNativeListening]);

  return {
    isWakeWordEnabled,
    isWakeWordListening,
    setIsWakeWordEnabled,
  };
}
