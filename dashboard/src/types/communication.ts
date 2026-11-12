export interface CommunicationItem {
  id: number;
  itemKey: string;
  category: string;
  labelEn: string;
  labelBn: string | null;
  iconKey: string | null;
  speakTextEn: string;
  speakTextBn: string | null;
  sentenceRole: 'subject' | 'object' | 'need' | 'feeling' | 'action' | 'modifier' | 'yesno' | 'other';
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunicationCategory {
  category: string;
  itemCount: number;
}

export interface FavouritePhrase {
  id: number;
  careUserId: number;
  communicationItemId: number | null;
  selectedItemKeys: string[] | null;
  phraseEn: string;
  phraseBn: string | null;
  phraseLabel: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCommunicationItemPayload {
  itemKey: string;
  category?: string;
  labelEn: string;
  labelBn?: string | null;
  iconKey?: string | null;
  speakTextEn: string;
  speakTextBn?: string | null;
  sentenceRole?: CommunicationItem['sentenceRole'];
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCommunicationItemPayload {
  category?: string;
  labelEn?: string;
  labelBn?: string | null;
  iconKey?: string | null;
  speakTextEn?: string;
  speakTextBn?: string | null;
  sentenceRole?: CommunicationItem['sentenceRole'];
  sortOrder?: number;
  isActive?: boolean;
}
