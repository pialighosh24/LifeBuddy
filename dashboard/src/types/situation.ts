export interface SituationSummary {
  situationKey: string;
  careUserId: number | null;
  titleEn: string | null;
  titleBn: string | null;
  isPredefined: boolean;
  isActive: boolean;
  stepCount: number;
}

export interface SituationStep {
  id: number;
  careUserId: number | null;
  situationKey: string;
  titleEn: string | null;
  titleBn: string | null;
  stepOrder: number;
  instructionEn: string | null;
  instructionBn: string | null;
  imageKey: string | null;
  isPredefined: boolean;
  isActive: boolean;
}

export interface SituationDetail {
  situationKey: string;
  careUserId: number | null;
  titleEn: string | null;
  titleBn: string | null;
  isPredefined: boolean;
  isActive: boolean;
  stepCount: number;
}
