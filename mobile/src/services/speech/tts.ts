import * as Speech from 'expo-speech';
import type { AppLanguage } from '../../i18n/translations';

let speaking = false;

export function getSpeechLanguage(lang: AppLanguage): string {
  // Best-effort language tags; actual availability depends on device voices
  return lang === 'bn' ? 'bn-BD' : 'en-US';
}

export async function stopSpeaking(): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) Speech.stop();
  } catch {
    try { Speech.stop(); } catch { /* ignore */ }
  } finally {
    speaking = false;
  }
}

export async function speakText(text: string, lang: AppLanguage): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  // avoid overlapping requests
  await stopSpeaking();
  speaking = true;
  return new Promise((resolve, reject) => {
    try {
      Speech.speak(trimmed, {
        language: getSpeechLanguage(lang),
        rate: 0.95,
        pitch: 1.0,
        onDone: () => { speaking = false; resolve(); },
        onStopped: () => { speaking = false; resolve(); },
        onError: () => { speaking = false; reject(new Error('Speech playback failed.')); },
      });
    } catch (e) {
      speaking = false;
      reject(e instanceof Error ? e : new Error('Speech playback failed.'));
    }
  });
}

export function isSpeaking(): boolean {
  return speaking;
}
