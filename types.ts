export enum ExamStage {
  ONBOARDING = 'ONBOARDING',
  MODE_SELECTION = 'MODE_SELECTION',
  EXAM_TYPE_SELECTION = 'EXAM_TYPE_SELECTION', // 新增：考试类型选择
  PRACTICE_PART_SELECTION = 'PRACTICE_PART_SELECTION', // 新增：专项特训部分选择
  PART1_SELF_INTRO = 'PART1_SELF_INTRO',
  PART2_SHORT_QA = 'PART2_SHORT_QA',
  PART3_PREP = 'PART3_PREP',
  PART3_PRESENTATION = 'PART3_PRESENTATION',
  PART4_PAIR_DISCUSSION = 'PART4_PAIR_DISCUSSION',
  PART5_IN_DEPTH_QA = 'PART5_IN_DEPTH_QA',
  PROCESSING = 'PROCESSING', 
  REPORT = 'REPORT',
  HISTORY = 'HISTORY'
}

export enum ExamMode {
  REAL = 'REAL', 
  SIMULATION = 'SIMULATION' 
}

export enum ExamType {
  FULL_EXAM = 'FULL_EXAM',  // 完整考试
  PRACTICE = 'PRACTICE'     // 专项特训
}

export enum PracticePart {
  PART1 = 'PART1',
  PART2 = 'PART2',
  PART3 = 'PART3',
  PART4 = 'PART4',
  PART5 = 'PART5'
}

export interface SpeechMetrics {
  duration: number; // Total speaking duration in seconds
  pauseCount: number; // Number of pauses detected
  pauseDuration: number; // Total pause duration in seconds
  wordCount: number; // Number of words spoken
  averageWordsPerSecond: number; // Speaking rate
  longestPause: number; // Longest pause duration in seconds
  fluencyScore: number; // Calculated fluency score (0-1)
}

export interface Message {
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  speechMetrics?: SpeechMetrics; // Optional: only for user messages with speech
}

export interface RealExamTopic {
  id: number;
  name: string;
  part2Question: string;
  part3Title: string;
  part3Quote: string;
  part4Topic: string; 
  part5Question: string;
}

export interface Part2Data {
  topic: string;
  question: string;
}

export interface Part3Data {
  title: string;
  quote: string;
}

export interface SectionFeedback {
  originalText: string;
  feedback: string; 
  score: number; 
}

export interface ExamResult {
  totalGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  part1Feedback: SectionFeedback;
  part2Feedback: SectionFeedback;
  part3Feedback: SectionFeedback;
  part4Feedback: SectionFeedback;
  part5Feedback: SectionFeedback;
  highFreqErrors: string[]; 
  generalAdvice: string;
}

// New Interface for Saved Records
export interface ExamRecord {
  id: string;
  timestamp: number;
  mode: ExamMode;
  topicName: string;
  result: ExamResult;
  fullTranscript: Message[]; // Optional: save full chat log if needed
  examType?: ExamType; // Optional: FULL_EXAM or PRACTICE
  practicePart?: PracticePart; // Optional: which part was practiced (only for PRACTICE type)
}

export interface AudioState {
  isListening: boolean;
  transcript: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext: any;
  }
}