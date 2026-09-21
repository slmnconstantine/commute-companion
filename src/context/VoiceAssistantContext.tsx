import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { useAuth } from './AuthContext';
import { useRoute } from './RouteContext';
import { AssistantState, AssistantCommand, VoiceMessage } from '@/types/voice';
import { useVoiceRecorder } from '@/hooks/voice/useVoiceRecorder';
import { useCommandParser } from '@/hooks/voice/useCommandParser';
import { useCommandExecutor } from '@/hooks/voice/useCommandExecutor';

interface VoiceAssistantContextValue {
  state: AssistantState;
  transcript: string;
  spokenReply: string;
  conversation: VoiceMessage[];
  command: AssistantCommand | null;
  startRecording: (contextData?: any, preserveCommand?: boolean, isConfirming?: boolean) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancel: () => void;
  cancelAction: () => void;
  confirmAction: () => Promise<void>;
  clearConversation: () => void;
  processTextInput: (text: string, contextData?: any) => Promise<void>;
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
  const { activeRoute } = useRoute();
  
  // Custom Hooks
  const { startAudioRecording, stopAudioAndTranscribe, cancelRecording } = useVoiceRecorder();
  const { parseCommand } = useCommandParser();
  const { executeCommand } = useCommandExecutor();

  // Refs for async stability
  const stateRef = useRef(state);
  const commandRef = useRef(command);
  const currentContextRef = useRef(currentContext);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { commandRef.current = command; }, [command]);
  useEffect(() => { currentContextRef.current = currentContext; }, [currentContext]);

  const startRecording = useCallback(async (contextData?: any, preserveCommand: boolean = false, isConfirming: boolean = false) => {
    try {
      try { Speech.stop(); } catch {}
      if (!preserveCommand) {
        setCommand(null);
        setConversation([]);
      }
      setTranscript('');
      setSpokenReply('');
      
      const mergedContext = {
        ...(currentContextRef.current || {}),
        activeRoute: currentContextRef.current?.activeRoute || activeRoute,
        ...(contextData || {})
      };
      setCurrentContext(mergedContext);

      await startAudioRecording();
      setState(isConfirming ? 'confirming' : 'recording');
    } catch (e: any) {
      console.error('Failed to start recording', e);
      setState('error');
      setSpokenReply(e.message || 'Could not start microphone');
      setTimeout(() => {
        setState('idle');
        if (!preserveCommand) setConversation([]);
      }, 3000);
    }
  }, [startAudioRecording, activeRoute]);

  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const handleExecution = useCallback(async (cmd: AssistantCommand) => {
    setState('executing');
    try {
      const execContext = {
        ...(currentContextRef.current || {}),
        activeRoute: currentContextRef.current?.activeRoute || activeRoute,
      };
      await executeCommand(cmd, execContext, profile);
      setTimeout(() => {
        setState('idle');
        setCommand(null);
      }, 1000);
    } catch (e) {
      console.error('Execution Error:', e);
      setState('error');
      setTimeout(() => {
        setState('idle');
      }, 2000);
    }
  }, [executeCommand, profile, activeRoute]);

  const cancelAction = useCallback(() => {
    cancelRecording();
    try { Speech.stop(); } catch {}
    setCommand(null);
    setState('idle');
    setSpokenReply('Action cancelled.');
    setConversation(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'assistant', text: 'Action cancelled.' }
    ]);
  }, [cancelRecording]);

  const confirmAction = useCallback(async () => {
    const activeCmd = commandRef.current;
    if (!activeCmd) return;
    cancelRecording();
    try { Speech.stop(); } catch {}
    setSpokenReply('Executing now…');
    await handleExecution(activeCmd);
  }, [cancelRecording, handleExecution]);

  const startConfirmationLoop = useCallback(async (cmd: AssistantCommand, contextData: any) => {
    setState('confirming');
    
    try {
      // Small delay to let initial TTS start before listening
      await new Promise(resolve => setTimeout(resolve, 800));
      if (stateRef.current !== 'confirming') return;
      
      await startRecording(contextData, true, true);
      
      // Listen for voice response
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      if (stateRef.current === 'confirming') {
        if (stopRecordingRef.current) {
          await stopRecordingRef.current();
        }
      }
    } catch (err) {
      console.warn('Confirmation audio listening error (fallback to UI buttons):', err);
      // Keep state as confirming so user can tap Confirm/Cancel button
      if (commandRef.current?.requiresConfirmation) {
        setState('confirming');
      }
    }
  }, [startRecording]);

  const handleParsedCommand = useCallback((result: AssistantCommand, text: string, context: any, fromVoice: boolean = false) => {
    const replyText = result.spokenReply || "I'm here to help with your commute.";
    setSpokenReply(replyText);
    setCommand(result);
    setConversation(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text },
      { id: (Date.now() + 1).toString(), role: 'assistant', text: replyText }
    ]);

    // Speak response non-blockingly (never hang state on Android TTS onDone)
    try {
      Speech.speak(replyText, {
        onError: (err) => console.warn('Speech TTS error:', err)
      });
    } catch (speechErr) {
      console.warn('Failed to invoke Speech.speak:', speechErr);
    }

    if (result.requiresConfirmation) {
      // Immediately set state to confirming so confirmation card & buttons show up right away
      setState('confirming');
      if (fromVoice) {
        startConfirmationLoop(result, context);
      }
    } else if (result.type !== 'NOOP' && result.type !== 'CLARIFY') {
      // Non-confirming actions execute immediately without blocking on TTS
      handleExecution(result);
    } else {
      setState('idle');
    }
  }, [startConfirmationLoop, handleExecution]);

  const stopRecording: () => Promise<void> = useCallback(async () => {
    const currentState = stateRef.current;
    if (currentState !== 'recording' && currentState !== 'confirming') return;
    
    setState('transcribing');
    
    try {
      const textTranscript = await stopAudioAndTranscribe();
      console.log('Voice Assistant Transcribed text:', textTranscript);

      // If we were in the confirmation loop
      if ((currentState === 'confirming' || stateRef.current === 'confirming') && commandRef.current) {
        const t = textTranscript.toLowerCase().trim();
        const isYes = /\b(yes|yeah|yep|sure|ok|okay|proceed|confirm|do it|post it|send it|delete it|accept)\b/i.test(t);
        const isNo = /\b(no|cancel|stop|nevermind|dont|don't)\b/i.test(t);
        const activeCommand = commandRef.current;

        if (isYes) {
          setSpokenReply('Okay, executing now.');
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Okay, executing now.' }
          ]);
          try { Speech.speak('Okay, executing now.'); } catch {}
          await handleExecution(activeCommand);
        } else if (isNo) {
          setSpokenReply('Action cancelled.');
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Action cancelled.' }
          ]);
          try { Speech.speak('Action cancelled.'); } catch {}
          cancelAction();
        } else if (textTranscript.trim().length > 0) {
          setSpokenReply("I didn't catch a clear yes or no. You can tap Confirm or Cancel.");
          setConversation(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'user', text: textTranscript }, 
            { id: (Date.now() + 1).toString(), role: 'assistant', text: "I didn't catch a clear yes or no. You can tap Confirm or Cancel." }
          ]);
          setState('confirming');
          try { Speech.speak("I didn't catch a clear yes or no. You can tap Confirm or Cancel."); } catch {}
        } else {
          // Empty audio / silence: remain in confirming so user can tap buttons or type
          setState('confirming');
        }
        return;
      }

      setTranscript(textTranscript);
      
      const result = await parseCommand(textTranscript, currentContextRef.current, profile);
      handleParsedCommand(result, textTranscript, currentContextRef.current, true);
    } catch (e: any) {
      console.error('Voice Assistant Error:', e);
      setState('error');
      setSpokenReply('Sorry, there was an error processing your command.');
      setConversation(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: 'Sorry, there was an error processing your command.' }]);
      try {
        Speech.speak('Sorry, there was an error processing your command.');
      } catch {}
      setTimeout(() => {
        setState('idle');
        setConversation([]);
      }, 3000);
    }
  }, [stopAudioAndTranscribe, parseCommand, profile, handleParsedCommand, handleExecution, cancelAction]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const processTextInput = useCallback(async (text: string, contextData?: any) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const activeContext = {
      ...(currentContextRef.current || {}),
      activeRoute: currentContextRef.current?.activeRoute || activeRoute,
      ...(contextData || {})
    };

    // Check if there is an active command awaiting confirmation
    if (commandRef.current && (stateRef.current === 'confirming' || commandRef.current.requiresConfirmation)) {
      const isAffirmative = /^(yes|yeah|yep|sure|ok|okay|proceed|confirm|do it|post it|send it|delete it|accept)\b/i.test(trimmed);
      const isNegative = /^(no|cancel|stop|nevermind|dont|don't)\b/i.test(trimmed);

      if (isAffirmative) {
        try { Speech.stop(); } catch {}
        setConversation(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'user', text: trimmed },
          { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Confirmed. Executing now…' }
        ]);
        await confirmAction();
        return;
      } else if (isNegative) {
        try { Speech.stop(); } catch {}
        setConversation(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'user', text: trimmed }
        ]);
        cancelAction();
        return;
      }
    }

    try {
      try { Speech.stop(); } catch {}
      setCommand(null);
      setTranscript(trimmed);
      setSpokenReply('');
      setCurrentContext(activeContext);
      setState('thinking');

      const result = await parseCommand(trimmed, activeContext, profile);
      handleParsedCommand(result, trimmed, activeContext, false);

    } catch (e: any) {
      console.error('Text Command Input Error:', e);
      setState('error');
      setSpokenReply("Sorry, I couldn't process that command.");
      try {
        Speech.speak("Sorry, I couldn't process that command.");
      } catch {}
      setTimeout(() => {
        setState('idle');
      }, 2000);
    }
  }, [parseCommand, profile, activeRoute, handleParsedCommand, confirmAction, cancelAction]);

  const cancel = useCallback(() => {
    cancelRecording();
    try { Speech.stop(); } catch {}
    setState('idle');
    setCommand(null);
    setTranscript('');
    setSpokenReply('');
    setConversation([]);
  }, [cancelRecording]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

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
      cancelAction,
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
