import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import { useAuth } from './AuthContext';
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
  startRecording: (contextData: any, preserveCommand?: boolean, isConfirming?: boolean) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancel: () => void;
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

      await startAudioRecording();
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
  }, [startAudioRecording]);

  const startConfirmationLoop = useCallback(async (cmd: AssistantCommand, contextData: any) => {
    setState('confirming');
    
    try {
      // Small delay to let TTS audio fully release focus before mic starts
      await new Promise(resolve => setTimeout(resolve, 600));
      if (stateRef.current !== 'confirming') return;
      
      await startRecording(contextData, true, true);
      
      // Keep recording open for a short window
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      if (stateRef.current === 'confirming') {
        await stopRecording();
      }
    } catch (err) {
      console.error('Error starting auto-confirmation recording:', err);
      setState('idle');
    }
  }, [startRecording, stopRecording]);

  const stopRecording = useCallback(async () => {
    const currentState = stateRef.current;
    if (currentState !== 'recording' && currentState !== 'confirming') return;
    
    setState('transcribing');
    
    try {
      const textTranscript = await stopAudioAndTranscribe();
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
          Speech.speak('Okay, executing now.', { onDone: () => { handleExecution(activeCommand); } });
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
      
      const result = await parseCommand(textTranscript, currentContextRef.current, profile);
      handleParsedCommand(result, textTranscript, currentContextRef.current);
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
  }, [stopAudioAndTranscribe, parseCommand, profile, startConfirmationLoop]);

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

      const result = await parseCommand(text, activeContext, profile);
      handleParsedCommand(result, text, activeContext);

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
  }, [parseCommand, profile, startConfirmationLoop]);

  const handleParsedCommand = (result: AssistantCommand, text: string, context: any) => {
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
            startConfirmationLoop(result, context);
          } else {
            handleExecution(result);
          }
        }
      });
    } else {
      if (result.requiresConfirmation) {
        startConfirmationLoop(result, context);
      } else {
        handleExecution(result);
      }
    }
  };

  const handleExecution = async (cmd: AssistantCommand) => {
    setState('executing');
    try {
      await executeCommand(cmd, currentContextRef.current, profile);
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

  const cancel = useCallback(() => {
    cancelRecording();
    Speech.stop();
    setState('idle');
    setCommand(null);
    setTranscript('');
    setSpokenReply('');
    setConversation([]);
  }, [cancelRecording]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  const confirmAction = useCallback(async () => {
    if (stateRef.current !== 'confirming' || !commandRef.current) return;
    cancelRecording();
    handleExecution(commandRef.current);
  }, [cancelRecording]);

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
