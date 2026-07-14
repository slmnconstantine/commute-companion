import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startAudioRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission denied');
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopAudioAndTranscribe = async (): Promise<string> => {
    await recorder.stop();
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

  const cancelRecording = () => {
    try {
      recorder.stop();
    } catch {}
  };

  return { recorder, startAudioRecording, stopAudioAndTranscribe, cancelRecording };
}
