export type SpeechTerm = {
  id: string;
  /** Spoken or written form to match in transcripts */
  phrase: string;
  /** Preferred display (brand name, spelling, etc.) */
  replacement: string;
  createdAt: number;
};

export type SpeechCorrection = {
  id: string;
  from: string;
  to: string;
  createdAt: number;
  useCount: number;
};

export type SpeechPersonalization = {
  terms: SpeechTerm[];
  corrections: SpeechCorrection[];
  updatedAt: number;
};

export const EMPTY_SPEECH_PERSONALIZATION: SpeechPersonalization = {
  terms: [],
  corrections: [],
  updatedAt: 0,
};
