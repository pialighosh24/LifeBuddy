import type { AppLanguage } from '../i18n/translations';
import type { CommunicationItem } from '../types/communication';

export interface SentenceToken {
  key: string; // unique per selection instance
  item: CommunicationItem;
}

export function getItemLabel(item: CommunicationItem, lang: AppLanguage): string {
  if (lang === 'bn') return (item.labelBn && item.labelBn.trim()) || item.labelEn;
  return item.labelEn;
}

export function getItemSpeakText(item: CommunicationItem, lang: AppLanguage): string {
  if (lang === 'bn') return (item.speakTextBn && item.speakTextBn.trim()) || item.speakTextEn || item.labelBn || item.labelEn;
  return item.speakTextEn || item.labelEn;
}

export function buildSentenceText(tokens: SentenceToken[], lang: AppLanguage): string {
  if (!tokens.length) return '';
  const parts = tokens.map(t => getItemSpeakText(t.item, lang).trim()).filter(Boolean);
  if (!parts.length) return '';
  let sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  // Capitalize first letter for Latin text; Bengali has no case distinction but harmless
  if (sentence.length > 0) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }
  // Add period if no terminal punctuation
  if (!/[.!?।！？]$/.test(sentence)) {
    sentence += lang === 'bn' ? '।' : '.';
  }
  return sentence;
}

export function buildDisplayParts(tokens: SentenceToken[], lang: AppLanguage): string[] {
  return tokens.map(t => getItemLabel(t.item, lang));
}
