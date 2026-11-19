import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startAudioRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission denied');
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      } as any);
    } catch {}

    // Check if recorder is already running and safely stop it
    try {
      const status = recorder.getStatus?.();
      if (status?.isRecording || recorder.isRecording) {
        await recorder.stop();
      }
    } catch {}

    // Prepare recorder if not already prepared
    try {
      const status = recorder.getStatus?.();
      if (!status?.canRecord) {
        await recorder.prepareToRecordAsync();
      }
    } catch (prepErr: any) {
      // If error indicates already prepared, we can safely proceed to record
      if (prepErr?.message?.includes('already been prepared')) {
        // Safe to continue to record()
      } else {
        // Try one reset cycle
        try {
          await recorder.stop();
          await recorder.prepareToRecordAsync();
        } catch {
          if (!recorder.getStatus?.()?.canRecord) {
            throw prepErr;
          }
        }
      }
    }

    recorder.record();
  };

  const stopAudioAndTranscribe = async (): Promise<string> => {
    try {
      if (recorder.isRecording || recorder.getStatus?.()?.isRecording) {
        await recorder.stop();
      }
    } catch (stopErr) {
      console.warn('Recorder stop warning:', stopErr);
    }

    if (!recorder.uri) throw new Error('No audio recorded');

    const audioBase64 = await FileSystem.readAsStringAsync(recorder.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.functions.invoke('voice-command', {
      body: {
        action: 'transcribe',
        audioBase64,
      }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.transcript || '';
  };

  const cancelRecording = async () => {
    try {
      if (recorder.isRecording || recorder.getStatus?.()?.isRecording) {
        await recorder.stop();
      }
    } catch {}
  };

  return { recorder, startAudioRecording, stopAudioAndTranscribe, cancelRecording };
}
