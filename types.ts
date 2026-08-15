
export interface Flashcard {
  pt: string;
  en: string;
}

export type AppMode = 'study' | 'game' | 'training';
export type CardMode = 'pt-en' | 'en-pt';

export type CategoryKey = 
  | string // Permitir strings dinâmicas para IDs de listas customizadas
  | 'favorites'
  | 'difficult'
  | 'custom_list'
  | 'verbs_essentials'
  | 'pronouns_subject'
  | 'pronouns_object'
  | 'possessive_adj'
  | 'possessive_pron'
  | 'reflexive_pron'
  | 'professions'
  | 'numbers'
  | 'question_words'
  | 'days_of_week'
  | 'verbs_comm'
  | 'verbs_routine'
  | 'verbs_perception'
  | 'verbs_other'
  | 'fruits'
  | 'insects' 
  | 'transport' 
  | 'feelings' 
  | 'seasons' 
  | 'months' 
  | 'body' 
  | 'farm_animals' 
  | 'wild_animals' 
  | 'sea_animals' 
  | 'nature_others'
  | 'personal_accessories';

export interface Category {
  id: CategoryKey;
  label: string;
  icon: string;
}

export interface CustomList {
  id: string;
  name: string;
  icon: string;
  words: Flashcard[];
}

export interface AIExplanation {
  explanation: string;
  examples: string[];
}

export interface ReviewScheduleEntry {
  stage: number;
  intervalDays: number;
  nextReviewAt: string;
  lastReviewedAt: string;
}

export interface UserStats {
  masteredWords: string[]; 
  favoriteWords: string[];
  difficultWords: string[];
  customLists: CustomList[]; // Agora suporta múltiplas listas
  reviewSchedule: Record<string, ReviewScheduleEntry>;
  streak: number;
  lastStudyDate: string;
}
