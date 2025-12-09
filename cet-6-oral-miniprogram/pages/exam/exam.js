// pages/exam/exam.js
import { GeminiService, REAL_EXAM_TOPICS } from '../../services/geminiService';
import { SpeechService, TTSService } from '../../services/speechService';
import { PunctuationService } from '../../utils/punctuationService';
import { StorageService } from '../../utils/storageService';

const ExamStage = {
  ONBOARDING: 'ONBOARDING',
  PART1_SELF_INTRO: 'PART1_SELF_INTRO',
  PART2_SHORT_QA: 'PART2_SHORT_QA',
  PART3_PREP: 'PART3_PREP',
  PART3_PRESENTATION: 'PART3_PRESENTATION',
  PART4_PAIR_DISCUSSION: 'PART4_PAIR_DISCUSSION',
  PART5_IN_DEPTH_QA: 'PART5_IN_DEPTH_QA',
  PROCESSING: 'PROCESSING'
};

Page({
  data: {
    stage: ExamStage.ONBOARDING,
    isTimerActive: false,
    isListening: false,
    transcript: '',
    processingText: '正在处理...',
    
    // Part data
    part2Data: null,
    part3Data: null,
    part4Topic: '',
    part5Question: '',
    
    // Part 4 specific
    part4Turn: 'user', // 'user' or 'ai'
    part4GlobalTimerActive: false,
    currentAIMessage: '',
    
    // Messages
    messages: [],
    
    // Exam config
    examMode: 'REAL',
    examType: 'FULL_EXAM',
    practicePart: null,
    realTopic: null
  },

  onLoad() {
    const app = getApp();
    this.setData({
      examMode: app.globalData.examMode || 'REAL',
      examType: app.globalData.examType || 'FULL_EXAM',
      practicePart: app.globalData.practicePart || null
    });

    // Initialize speech service
    SpeechService.onTranscriptUpdate = (text) => {
      this.setData({ transcript: text });
    };

    // Start exam
    this.startExam();
  },

  onUnload() {
    SpeechService.stopListening();
    TTSService.stopSpeaking();
  },

  async startExam() {
    // Get real topic if in REAL mode
    if (this.data.examMode === 'REAL') {
      const topic = GeminiService.getRandomRealTopic();
      this.setData({ realTopic: topic });
    }

    // Start onboarding
    await this.startOnboarding();
  },

  async startOnboarding() {
    const instruction = "Welcome to the CET-6 Oral Exam. Part 1. Please make a brief self-introduction.";
    
    await TTSService.speak(instruction);
    
    if (this.data.examType === 'PRACTICE' && this.data.practicePart !== 'PART1') {
      // Skip to the practice part
      this.startPracticePart();
    } else {
      this.startPart1();
    }
  },

  startPracticePart() {
    const part = this.data.practicePart;
    if (part === 'PART2') this.startPart2();
    else if (part === 'PART3') this.startPart3();
    else if (part === 'PART4') this.startPart4();
    else if (part === 'PART5') this.startPart5();
  },

  async startPart1() {
    this.setData({ stage: ExamStage.PART1_SELF_INTRO });
    SpeechService.resetTranscript();
    
    setTimeout(() => {
      this.setData({ isTimerActive: true });
      SpeechService.startListening();
      this.setData({ isListening: true });
    }, 500);
  },

  async startPart2() {
    SpeechService.stopListening();
    TTSService.stopSpeaking();
    SpeechService.resetTranscript();
    
    const data = await GeminiService.getPart2Data(this.data.examMode, this.data.realTopic);
    this.setData({ part2Data: data, stage: ExamStage.PART2_SHORT_QA });
    
    const instruction = `Part 2. Topic: ${data.topic}. Question: ${data.question}`;
    await TTSService.speak(instruction);
    
    setTimeout(() => {
      this.setData({ isTimerActive: true });
      SpeechService.startListening();
      this.setData({ isListening: true });
    }, 500);
  },

  async startPart3() {
    SpeechService.resetTranscript();
    const data = await GeminiService.getPart3Data(this.data.examMode, this.data.realTopic);
    this.setData({ part3Data: data, stage: ExamStage.PART3_PREP });
    
    const instruction = "Part 3. Individual Presentation. Please read the card and prepare for 1 minute.";
    await TTSService.speak(instruction);
    
    setTimeout(() => {
      this.setData({ isTimerActive: true });
    }, 500);
  },

  async startPart3Speaking() {
    SpeechService.stopListening();
    TTSService.stopSpeaking();
    SpeechService.resetTranscript();
    this.setData({ stage: ExamStage.PART3_PRESENTATION });
    
    await TTSService.speak("Time is up. Please start your presentation.");
    
    setTimeout(() => {
      this.setData({ isTimerActive: true });
      SpeechService.startListening();
      this.setData({ isListening: true });
    }, 500);
  },

  async startPart4() {
    SpeechService.stopListening();
    TTSService.stopSpeaking();
    SpeechService.resetTranscript();
    this.setData({ stage: ExamStage.PART4_PAIR_DISCUSSION });
    
    const topicText = this.data.examMode === 'REAL'
      ? (this.data.realTopic?.part4Topic || "Discussion")
      : (this.data.part2Data?.topic || "Current Events");
    
    this.setData({ part4Topic: topicText });
    
    const userStarts = Math.random() > 0.5;
    const startRole = userStarts ? 'Candidate A' : 'Candidate B';
    const partnerRole = userStarts ? 'Candidate B' : 'Candidate A';
    
    const intro = `Part 4. Pair Discussion. We will discuss: "${topicText}". You are ${startRole}. Your partner is ${partnerRole}. ${userStarts ? 'Please start the discussion.' : 'I will start.'}`;
    
    await TTSService.speak(intro);
    this.setData({ part4GlobalTimerActive: true });
    
    if (userStarts) {
      this.setData({ part4Turn: 'user' });
      setTimeout(() => {
        SpeechService.startListening();
        this.setData({ isListening: true });
      }, 500);
    } else {
      this.setData({ part4Turn: 'ai' });
      await this.handlePart4AITurn();
    }
  },

  async handlePart4AITurn() {
    const lastUserText = this.data.transcript;
    const aiResponse = await GeminiService.generatePart4Turn(
      this.data.messages,
      this.data.part4Topic,
      lastUserText
    );
    
    this.setData({ currentAIMessage: aiResponse });
    this.addMessage('ai', `[Part 4 Partner] ${aiResponse}`);
    
    await TTSService.speak(aiResponse);
    
    // Auto switch to user turn
    this.setData({ part4Turn: 'user' });
    SpeechService.resetTranscript();
    setTimeout(() => {
      SpeechService.startListening();
      this.setData({ isListening: true });
    }, 500);
  },

  async startPart5() {
    SpeechService.stopListening();
    TTSService.stopSpeaking();
    SpeechService.resetTranscript();
    this.setData({ stage: ExamStage.PART5_IN_DEPTH_QA });
    
    const question = await GeminiService.getPart5Question(
      this.data.examMode,
      this.data.realTopic,
      this.data.part2Data?.topic
    );
    
    this.setData({ part5Question: question });
    await TTSService.speak(`Part 5. ${question}`);
    
    setTimeout(() => {
      this.setData({ isTimerActive: true });
      SpeechService.startListening();
      this.setData({ isListening: true });
    }, 500);
  },

  stopRecording() {
    SpeechService.stopListening();
    this.setData({ isListening: false, isTimerActive: false });
    
    // Save transcript
    const text = SpeechService.getTranscript();
    if (text && text.trim()) {
      const processedText = PunctuationService.addPunctuation(text);
      const metrics = SpeechService.getSpeechMetrics();
      this.addMessage('user', this.getCurrentPartTag() + processedText, metrics);
    }
    
    // Handle next step
    this.handleTimerFinish();
  },

  getCurrentPartTag() {
    const stage = this.data.stage;
    if (stage === ExamStage.PART1_SELF_INTRO) return '[Part 1] ';
    if (stage === ExamStage.PART2_SHORT_QA) return '[Part 2] ';
    if (stage === ExamStage.PART3_PRESENTATION) return '[Part 3] ';
    if (stage === ExamStage.PART4_PAIR_DISCUSSION) return '[Part 4 User] ';
    if (stage === ExamStage.PART5_IN_DEPTH_QA) return '[Part 5] ';
    return '';
  },

  async handleTimerFinish() {
    // Save current transcript
    const text = SpeechService.getTranscript();
    if (text && text.trim()) {
      const processedText = PunctuationService.addPunctuation(text);
      const metrics = SpeechService.getSpeechMetrics();
      this.addMessage('user', this.getCurrentPartTag() + processedText, metrics);
    }
    
    SpeechService.stopListening();
    this.setData({ isListening: false, isTimerActive: false });
    
    // Move to next part
    await this.moveToNextPart();
  },

  async moveToNextPart() {
    const stage = this.data.stage;
    const examType = this.data.examType;
    const practicePart = this.data.practicePart;
    
    if (examType === 'PRACTICE') {
      // Practice mode: finish after current part
      await this.finishExam();
      return;
    }
    
    // Full exam: move to next part
    if (stage === ExamStage.PART1_SELF_INTRO) {
      await this.startPart2();
    } else if (stage === ExamStage.PART2_SHORT_QA) {
      await this.startPart3();
    } else if (stage === ExamStage.PART3_PRESENTATION) {
      await this.startPart4();
    } else if (stage === ExamStage.PART4_PAIR_DISCUSSION) {
      // Part 4 handled separately
      if (this.data.part4Turn === 'user') {
        // Save user turn and switch to AI
        const text = SpeechService.getTranscript();
        if (text && text.trim()) {
          const processedText = PunctuationService.addPunctuation(text);
          const metrics = SpeechService.getSpeechMetrics();
          this.addMessage('user', '[Part 4 User] ' + processedText, metrics);
        }
        SpeechService.resetTranscript();
        await this.handlePart4AITurn();
      }
    } else if (stage === ExamStage.PART5_IN_DEPTH_QA) {
      await this.finishExam();
    }
  },

  handlePart4TimerFinish() {
    // Part 4 global timer finished
    const text = SpeechService.getTranscript();
    if (text && text.trim()) {
      const processedText = PunctuationService.addPunctuation(text);
      const metrics = SpeechService.getSpeechMetrics();
      this.addMessage('user', '[Part 4 End] ' + processedText, metrics);
    }
    
    if (this.data.examType === 'PRACTICE' && this.data.practicePart === 'PART4') {
      this.finishExam();
    } else {
      this.startPart5();
    }
  },

  addMessage(role, text, speechMetrics) {
    const messages = [...this.data.messages, {
      role,
      text,
      timestamp: Date.now(),
      speechMetrics
    }];
    this.setData({ messages });
  },

  async finishExam() {
    this.setData({ stage: ExamStage.PROCESSING, processingText: '正在生成报告...' });
    
    try {
      const result = await GeminiService.generateReport(
        this.data.messages,
        this.data.practicePart
      );
      
      // Save record
      const record = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        mode: this.data.examMode,
        topicName: this.data.realTopic?.name || this.data.part2Data?.topic || 'Unknown',
        result: result,
        fullTranscript: this.data.messages,
        examType: this.data.examType,
        practicePart: this.data.practicePart
      };
      
      StorageService.saveRecord(record);
      
      // Navigate to report
      wx.redirectTo({
        url: `/pages/report/report?recordId=${record.id}`
      });
    } catch (error) {
      console.error('Failed to generate report', error);
      wx.showToast({
        title: '生成报告失败',
        icon: 'none'
      });
    }
  }
});



