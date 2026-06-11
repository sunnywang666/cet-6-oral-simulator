import { GeminiService as GeminiDirect } from './geminiService';
import { GeminiService as ZhipuService, REAL_EXAM_TOPICS } from './zhipuService';
import { ExamMode, RealExamTopic, Part2Data, Part3Data, ExamResult, Message, PracticePart } from '../types';

export { REAL_EXAM_TOPICS };

type AiProvider = 'zhipu' | 'gemini';

function getProvider(): AiProvider {
  return import.meta.env.VITE_AI_PROVIDER === 'gemini' ? 'gemini' : 'zhipu';
}

function getService() {
  return getProvider() === 'gemini' ? GeminiDirect : ZhipuService;
}

// Keep this class name so the rest of the app does not need a broad rename.
export class GeminiService {
  static getRandomRealTopic(): RealExamTopic {
    return ZhipuService.getRandomRealTopic();
  }

  static async getPart2Data(examMode: ExamMode, realTopic?: RealExamTopic): Promise<Part2Data> {
    return getService().getPart2Data(examMode, realTopic);
  }

  static async getPart3Data(examMode: ExamMode, realTopic?: RealExamTopic): Promise<Part3Data> {
    return getService().getPart3Data(examMode, realTopic);
  }

  static async getPart5Question(
    examMode: ExamMode,
    realTopic?: RealExamTopic,
    part2Topic?: string
  ): Promise<string> {
    return getService().getPart5Question(examMode, realTopic, part2Topic);
  }

  static async generatePart4Turn(
    historyContext: Message[],
    topicContext: string,
    lastUserText?: string
  ): Promise<string> {
    return getService().generatePart4Turn(historyContext, topicContext, lastUserText);
  }

  static async generateReport(
    messages: Message[],
    practicePart?: PracticePart
  ): Promise<ExamResult> {
    return getService().generateReport(messages, practicePart);
  }
}
