export type Language = 'en' | 'kr';

export type GamePhase = 'setup' | 'processing' | 'game' | 'results';

export interface PhotoEntry {
  id: string;
  file: File;
  previewUrl: string;
  primaryName: string;
  aliases: string[];
  description?: string;
  isValid?: boolean;
  validationError?: string;
}

export interface GameQuestion {
  id: string;
  photoEntryId: string;
  description: string;
  previewUrl: string; // Revealed after answer
  correctNames: string[];
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface GameState {
  score: number;
  currentQuestionIndex: number;
  questions: GameQuestion[];
  startTime: number | null;
  endTime: number | null;
}

export interface Translation {
  title: string;
  subtitle: string;
  startBtn: string;
  uploadTitle: string;
  uploadDesc: string;
  uploadLimit: string;
  nameLabel: string;
  aliasLabel: string;
  processingTitle: string;
  processingDesc: string;
  gameInputPlaceholder: string;
  submitAnswer: string;
  correct: string;
  incorrect: string;
  nextQuestion: string;
  resultsTitle: string;
  scoreLabel: string;
  timeLabel: string;
  accuracyLabel: string;
  newGame: string;
  replay: string;
  analyzing: string;
  errorNoFace: string;
  errorGemini: string;
  validation: string;
  dropzone: string;
}