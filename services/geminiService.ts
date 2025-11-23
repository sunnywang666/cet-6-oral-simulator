import { GoogleGenAI, Type } from "@google/genai";
import { ExamResult, Part2Data, Part3Data, RealExamTopic, ExamMode, Message } from "../types";

const MODEL_NAME = 'gemini-2.5-flash';

// Get API key from environment variable (build-time injection) or fallback to default
// For GitHub Pages deployment, API key will be injected during build via GitHub Secrets
const getApiKey = (): string => {
  // First try environment variable (for build-time injection via GitHub Secrets)
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY !== '') {
    return process.env.API_KEY;
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'undefined' && process.env.GEMINI_API_KEY !== '') {
    return process.env.GEMINI_API_KEY;
  }
  
  // Fallback: Use default API key for direct sharing (embedded in build)
  // This allows friends to use the app without configuration
  // Note: In production, this should be set via GitHub Secrets
  return 'AIzaSyBJwZbwagHUbZFKoiArwMI22TmHgEoz9po';
};

// Get or create AI instance with API key
const getAI = (): GoogleGenAI => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

// --- KNOWLEDGE BASE (Real Exam Mode) ---
export const REAL_EXAM_TOPICS: RealExamTopic[] = [
  {
    id: 1,
    name: "Money Management",
    part2Question: "How do you manage your money?",
    part3Title: "Importance of Financial Management",
    part3Quote: "Is financial management important? Plan income, avoid overspending, achieve goals.",
    part4Topic: "How do college students manage their money? (Budgeting, Recording expenses)",
    part5Question: "Do you think we should encourage college students to manage their money?"
  },
  {
    id: 2,
    name: "Spring Festival",
    part2Question: "What is your favorite thing to do during the Spring Festival?",
    part3Title: "Meaning of Spring Festival",
    part3Quote: "What does the Spring Festival represent for the Chinese people? (New beginning, Reunion)",
    part4Topic: "What is the best way to celebrate the Spring Festival?",
    part5Question: "What behaviors should be avoided during the Spring Festival?"
  },
  {
    id: 3,
    name: "Consumer Behavior",
    part2Question: "How has the way of shopping changed recently?",
    part3Title: "Changes in Consumer Attitudes",
    part3Quote: "Focus on Quality, Safety, Environment, and Online Shopping.",
    part4Topic: "The best way to boost consumer spending.",
    part5Question: "Do you ever borrow money from others to buy things?"
  },
  {
    id: 4,
    name: "Environment",
    part2Question: "Do you love the environment you live in?",
    part3Title: "Garbage Sorting",
    part3Quote: "The necessity of garbage sorting for a better future.",
    part4Topic: "What can young people do to improve the environment?",
    part5Question: "Do you buy second-hand things to save the environment?"
  },
  {
    id: 5,
    name: "Teamwork",
    part2Question: "Have you ever participated in team sports?",
    part3Title: "Team Leadership",
    part3Quote: "How to be a good team leader or member.",
    part4Topic: "Is teamwork always necessary?",
    part5Question: "Do you like team sports? Why or why not?"
  },
  {
    id: 6,
    name: "Stress",
    part2Question: "What are the main causes of stress for you?",
    part3Title: "Reducing Stress",
    part3Quote: "Ways to reduce stress in modern life.",
    part4Topic: "Is stress always harmful?",
    part5Question: "Does taking exams make you feel scared?"
  },
  {
    id: 7,
    name: "Travel",
    part2Question: "Can you introduce a city you like?",
    part3Title: "Historic Interests",
    part3Quote: "Introduce a historic place of interest in China.",
    part4Topic: "What's the best way to make the world know more about China?",
    part5Question: "Do you prefer to travel alone or in a group?"
  },
  {
    id: 8,
    name: "College Degree",
    part2Question: "What will you do after college graduation?",
    part3Title: "Benefits of a Degree",
    part3Quote: "The benefits of getting a college degree.",
    part4Topic: "The greatest advantage of college education.",
    part5Question: "Do you think a college degree can guarantee a person's success?"
  }
];

export const GeminiService = {
  /**
   * Pick a random topic from the Knowledge Base.
   */
  getRandomRealTopic(): RealExamTopic {
    const index = Math.floor(Math.random() * REAL_EXAM_TOPICS.length);
    return REAL_EXAM_TOPICS[index];
  },

  /**
   * Part 2: Generate or Retrieve Data
   */
  async getPart2Data(mode: ExamMode, realTopic?: RealExamTopic): Promise<Part2Data> {
    if (mode === ExamMode.REAL && realTopic) {
      return { topic: realTopic.name, question: realTopic.part2Question };
    }

    // Simulation Mode
    const prompt = `
      Generate a CET-6 Oral Exam Part 2 Topic and Question.
      Topic should be broad (e.g. Technology, Health).
      Question should be specific and open-ended.
    `;
    const schema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        question: { type: Type.STRING },
      },
      required: ["topic", "question"]
    };

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(response.text || "{}") as Part2Data;
    } catch (e) {
      return { topic: "Simulation", question: "Describe a memorable event." };
    }
  },

  /**
   * Part 3: Generate or Retrieve Data
   */
  async getPart3Data(mode: ExamMode, realTopic?: RealExamTopic): Promise<Part3Data> {
    if (mode === ExamMode.REAL && realTopic) {
      return { title: realTopic.part3Title, quote: realTopic.part3Quote };
    }

    const prompt = `
      Generate a prompt card for CET-6 Part 3.
      Provide a Title and a provocative Quote/Statement.
    `;
    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        quote: { type: Type.STRING },
      },
      required: ["title", "quote"]
    };

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(response.text || "{}") as Part3Data;
    } catch (e) {
      return { title: "Patience", quote: "Patience is a virtue." };
    }
  },

  /**
   * Part 4: Turn Generation (Updated to be context-aware)
   * CRITICAL: Only generate YOUR OWN response, not a full dialogue
   */
  async generatePart4Turn(history: Message[], topic: string, lastUserText?: string): Promise<string> {
    // Case 1: AI Initiates (No history or explicit start)
    if (!lastUserText && history.length === 0) {
        const systemInstruction = `
You are Candidate B in a CET-6 Pair Discussion exam.
Topic: "${topic}"

CRITICAL RULES:
1. You are ONLY Candidate B. Generate ONLY what YOU (Candidate B) say.
2. DO NOT include what Candidate A says. DO NOT create a dialogue.
3. Keep it SHORT (20-40 words).
4. Start the discussion by introducing the topic and asking your partner's opinion.

Generate ONLY your opening statement as Candidate B:`;

        try {
             const ai = getAI();
             const response = await ai.models.generateContent({ 
               model: MODEL_NAME, 
               contents: systemInstruction 
             });
             let text = response.text?.trim() || "Shall we start? What do you think about this topic?";
             // Clean up: remove any dialogue markers or Partner's lines
             text = text.split('\n')[0].trim(); // Take only first line
             text = text.replace(/^(Candidate [AB]:|Partner:|You:)\s*/i, ''); // Remove role markers
             return text;
        } catch (e) { 
          return "Shall we start? What is your opinion?"; 
        }
    }

    // Case 2: Replying to User
    // Format previous history for context (last 4 turns, only user messages)
    const userMessages = history
      .filter(h => h.text.includes('[Part 4') && h.role === 'user')
      .slice(-3)
      .map(h => h.text.replace(/\[Part 4.*?\]:\s*/, ''))
      .join(' | ');

    const systemInstruction = `
You are Candidate B in a CET-6 Pair Discussion exam.
Topic: "${topic}"

CRITICAL RULES:
1. You are ONLY Candidate B. Generate ONLY what YOU (Candidate B) say in this turn.
2. DO NOT include what Candidate A says. DO NOT create a dialogue format.
3. DO NOT write "Candidate A: ..." or "Partner: ..." - only YOUR words.
4. Keep it SHORT (20-40 words).
5. Respond directly to what your partner just said, then add your own point or ask a question.

Your partner (Candidate A) just said: "${lastUserText}"

${userMessages ? `Recent conversation context: ${userMessages}` : ''}

Now generate ONLY your response as Candidate B (no dialogue format, just your words):`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemInstruction,
      });
      
      let text = response.text?.trim() || "I agree with that. What else is important?";
      
      // CRITICAL: Clean up the response to remove any dialogue format
      // Remove role markers
      text = text.replace(/^(Candidate [AB]:|Partner:|You:|Candidate B:)\s*/gi, '');
      // Remove dialogue format like "A: ... B: ..."
      text = text.split(/[AB]:/i)[0].trim();
      // Take only the first line (in case AI generated multiple lines)
      text = text.split('\n')[0].trim();
      // Remove any quotes if AI wrapped the response
      text = text.replace(/^["']|["']$/g, '');
      
      return text || "I agree with that. What else is important?";
    } catch (e) {
      return "That's a good point. Do you have other ideas?";
    }
  },

  /**
   * Part 5: Question
   */
  async getPart5Question(mode: ExamMode, realTopic?: RealExamTopic, simTopicName?: string): Promise<string> {
    if (mode === ExamMode.REAL && realTopic) {
      return realTopic.part5Question;
    }

    const prompt = `
      Based on the topic "${simTopicName}", ask ONE abstract, complex question for CET-6 Part 5.
      Return ONLY the question text.
    `;
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      return response.text?.trim() || "How does this impact society in the long run?";
    } catch (e) {
      return "What are the future implications of this?";
    }
  },

  /**
   * Detailed Report Generation
   */
  async generateReport(fullTranscript: Message[], practicePart?: string): Promise<ExamResult> {
    // Determine which parts to evaluate
    const isPractice = !!practicePart;
    const partToEvaluate = practicePart; // e.g., "PART1", "PART2", etc.
    
    let prompt = `
      You are a professional CET-6 Oral Examiner following the official SET-6 (College English Test Band 6 Oral Test) scoring standards.
      
      OFFICIAL SCORING STANDARDS (SET-6):
      
      Each section is scored out of 15 points, based on THREE dimensions (5 points each):
      
      1. ACCURACY AND RANGE (准确性) - 5 points:
         - 5 points (Excellent/A-level): Grammar and vocabulary are basically correct. Rich vocabulary. Complex sentence structures. Good pronunciation (native accent allowed if it doesn't affect understanding).
         - 4 points (Good/B-level): Some grammar/vocabulary errors, but don't seriously affect communication. Relatively rich vocabulary. Acceptable pronunciation.
         - 3 points (Passing/C-level): Errors sometimes affect communication. Limited vocabulary. Simple grammar structures. Pronunciation defects sometimes affect understanding.
         - 2 points (Fail): Many errors causing frequent communication breakdowns. Severe lack of vocabulary/grammar.
      
      2. SIZE AND COHERENCE (话语长短和连贯性) - 5 points:
         - 5 points (Excellent): Can speak for extended periods. Language is coherent. Pauses only occur when organizing thoughts (thinking pauses are allowed), NOT when searching for words.
         - 4 points (Good): Can speak coherently, but most utterances are short. Frequent pauses, sometimes due to word-searching (hesitation), sometimes affecting communication.
         - 3 points (Passing): Short utterances. Frequent long pauses, but can basically complete tasks.
         - 2 points (Fail): Short utterances with no coherence. Basically cannot communicate.
      
      3. FLEXIBILITY AND APPROPRIATENESS (灵活性和适切性) - 5 points:
         - 5 points (Excellent): Can handle different scenarios and topics naturally. Actively participates in discussions (doesn't go silent, actively contributes). Language is appropriate and contextually fitting.
         - 4 points (Good): Can handle situations relatively naturally. Relatively active participation. Basically appropriate.
         - 3 points (Passing): Cannot actively participate. Sometimes cannot adapt to topic/content changes (goes off-topic or cannot respond).
         - 2 points (Fail): Cannot participate in discussions.
      
      FINAL GRADE CRITERIA:
      - A (A+): Deep, clear, detailed. Can engage in in-depth communication on general topics. Expresses views clearly and fluently. Provides detailed statements of facts/reasons. (Score range: 13-15 points)
      - B: Relatively deep, relatively clear. Can engage in relatively deep communication. Relatively clear and coherent. Relatively detailed statements. (Score range: 10-12 points)
      - C: Simple, basic. Can engage in simple communication. Basic expression of views. Simple statements. (Score range: 7-9 points)
      - D: Does not meet basic oral communication ability. (Score range: 0-6 points)
      
      IMPORTANT GRADING PRINCIPLES:
      - Be FAIR and PROFESSIONAL. Follow the official standards strictly.
      - Score range: 0-15 points per section (total of three dimensions).
      - Provide detailed feedback explaining performance in each dimension.
      - Be encouraging but accurate. Focus on both strengths and areas for improvement.
      
      TRANSCRIPT:
      ${JSON.stringify(fullTranscript)}
      
      IMPORTANT: Each user message may include "speechMetrics" with the following data:
      - duration: Total speaking duration in seconds
      - pauseCount: Number of pauses detected (pauses > 1 second)
      - pauseDuration: Total pause duration in seconds
      - wordCount: Number of words spoken
      - averageWordsPerSecond: Speaking rate (words per second)
      - longestPause: Longest pause duration in seconds
      - fluencyScore: Calculated fluency score (0-1, higher is more fluent)
      
      Use these metrics to evaluate:
      1. SIZE AND COHERENCE (话语长短和连贯性):
         - duration: Longer duration = better (shows extended speaking ability)
         - wordCount: More words = better (shows ability to express ideas fully)
         - averageWordsPerSecond: Ideal range is 2-3 words/sec. Too slow (<1.5) or too fast (>4) may indicate issues
         - pauseCount: Fewer pauses = better. More than 1 pause per 10 seconds is excessive
         - longestPause: Pauses > 3 seconds are problematic (searching for words). Pauses < 2 seconds are acceptable (organizing thoughts)
         - fluencyScore: Higher score (0.7-1.0) = excellent fluency, lower (<0.5) = needs improvement
      
      2. When evaluating, consider:
         - If speechMetrics is available, use it to assess Size and Coherence dimension
         - If speechMetrics is not available, infer from text length and content
         - Combine text analysis (Accuracy) with speech metrics (Coherence) for comprehensive evaluation
      
    `;
    
    if (isPractice && partToEvaluate) {
      // For practice mode, only evaluate the specific part
      const partNumber = partToEvaluate.replace('PART', '');
      const partNames: { [key: string]: string } = {
        '1': 'Part 1 (Self-Introduction)',
        '2': 'Part 2 (Short Q&A)',
        '3': 'Part 3 (Presentation)',
        '4': 'Part 4 (Pair Discussion)',
        '5': 'Part 5 (In-depth Q&A)'
      };
      
      prompt += `
      IMPORTANT: This is a PRACTICE SESSION. The student only practiced ${partNames[partNumber]}.
      - ONLY evaluate ${partNames[partNumber]}. 
      - For all other parts (${Object.values(partNames).filter((_, i) => (i + 1).toString() !== partNumber).join(', ')}), set score to 0, originalText to empty string, and feedback to "Not practiced in this session".
      - The overall grade should be based ONLY on ${partNames[partNumber]} performance.
      - High frequency errors should only be identified from ${partNames[partNumber]}.
      - General advice should focus on improving ${partNames[partNumber]}.
      
      Task: Provide a structured assessment following OFFICIAL SET-6 standards.
      1. Evaluate ONLY ${partNames[partNumber]} using the three dimensions (Accuracy, Coherence, Flexibility):
         ${partNumber === '1' ? `- Part 1 (Self-Introduction): 
           * Focus on Accuracy (grammar, vocabulary, pronunciation) and Coherence (length, fluency).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 10-15 seconds for adequate introduction
             - wordCount: Should be at least 30-50 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 2 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate introductions, 13-15 for excellent ones.` : ''}
         ${partNumber === '2' ? `- Part 2 (Short Q&A): 
           * Evaluate all three dimensions: Accuracy, Coherence, and Flexibility (ability to respond appropriately).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 15-20 seconds for adequate response
             - wordCount: Should be at least 40-60 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 3 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate responses, 13-15 for excellent ones.` : ''}
         ${partNumber === '3' ? `- Part 3 (Presentation): 
           * Focus on Accuracy (complex sentence structures, rich vocabulary) and Coherence (extended speaking, organization).
           * Also consider Flexibility (ability to present ideas clearly).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 60-90 seconds for adequate presentation
             - wordCount: Should be at least 150-200 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Some pauses are acceptable for organizing thoughts, but excessive pauses (> 5) indicate issues
             - longestPause: Pauses > 3 seconds are problematic
             - fluencyScore: Should be > 0.7 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 11-14 points for good presentations, 13-15 for excellent ones.` : ''}
         ${partNumber === '4' ? `- Part 4 (Pair Discussion): 
           * CRITICAL: The originalText MUST include the FULL dialogue between Candidate A (the user) and Candidate B (the partner).
           * Extract ALL messages marked with [Part 4 User], [Part 4 Partner], or [Part 4 End] from the transcript.
           * Format the originalText as a dialogue, showing both sides:
             Example format:
             "Candidate A: [user's first statement]
             Candidate B: [partner's response]
             Candidate A: [user's next statement]
             Candidate B: [partner's response]
             ..."
           * FLEXIBILITY is CRITICAL for Part 4 - evaluate active participation, ability to respond to partner, topic transitions.
           * For Coherence: Check speechMetrics if available (aggregate across all user turns):
             - duration: Should be substantial across all turns (at least 60-90 seconds total)
             - wordCount: Should be substantial (at least 100-150 words total)
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be reasonable (not excessive, but some pauses for thinking are OK)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension, with Flexibility being especially important).
           * Typical scores: 10-13 points for active participation, 13-15 for excellent interactive discussion.` : ''}
         ${partNumber === '5' ? `- Part 5 (In-depth Q&A): 
           * Evaluate all three dimensions: Accuracy, Coherence, and Flexibility (ability to handle complex questions).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 20-30 seconds for adequate response
             - wordCount: Should be at least 50-80 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 3 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate responses, 13-15 for excellent ones.` : ''}
      2. For other parts, set score to 0, originalText to "", and feedback to "Not practiced in this session".
      3. In the feedback for ${partNames[partNumber]}, clearly explain performance in each dimension using this EXACT format:
         Accuracy and Range: [specific feedback on grammar, vocabulary, pronunciation]
         Size and Coherence: [specific feedback on speaking length, fluency, pauses]
         Flexibility and Appropriateness: [specific feedback on interaction, adaptability, appropriateness]
         
         IMPORTANT: Use the exact labels "Accuracy and Range:", "Size and Coherence:", and "Flexibility and Appropriateness:" at the start of each section. Put each dimension on a new line.
      4. Identify High Frequency Errors from ${partNames[partNumber]} (e.g., "She/He confusion", "Tense inconsistency", "Word repetition").
      5. Give an overall grade (A+, A, B, C, D) based ONLY on ${partNames[partNumber]} performance:
         - A+ or A: 13-15 points (Deep, clear, detailed)
         - B: 10-12 points (Relatively deep, relatively clear)
         - C: 7-9 points (Simple, basic)
         - D: 0-6 points (Does not meet basic requirements)
      6. Provide constructive general advice focused on improving ${partNames[partNumber]}, referencing the three dimensions.

      Return strictly JSON.
    `;
    } else {
      // For full exam, evaluate all parts
      prompt += `
      Task: Provide a structured assessment following OFFICIAL SET-6 standards for ALL parts.
      1. Break down by Part (1, 2, 3, 4, 5), evaluating each using the three dimensions (Accuracy, Coherence, Flexibility):
         - Part 1 (Self-Introduction): 
           * Focus on Accuracy (grammar, vocabulary, pronunciation) and Coherence (length, fluency).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 10-15 seconds for adequate introduction
             - wordCount: Should be at least 30-50 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 2 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate introductions, 13-15 for excellent ones.
         
         - Part 2 (Short Q&A): 
           * Evaluate all three dimensions: Accuracy, Coherence, and Flexibility (ability to respond appropriately).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 15-20 seconds for adequate response
             - wordCount: Should be at least 40-60 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 3 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate responses, 13-15 for excellent ones.
         
         - Part 3 (Presentation): 
           * Focus on Accuracy (complex sentence structures, rich vocabulary) and Coherence (extended speaking, organization).
           * Also consider Flexibility (ability to present ideas clearly).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 60-90 seconds for adequate presentation
             - wordCount: Should be at least 150-200 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Some pauses are acceptable for organizing thoughts, but excessive pauses (> 5) indicate issues
             - longestPause: Pauses > 3 seconds are problematic
             - fluencyScore: Should be > 0.7 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 11-14 points for good presentations, 13-15 for excellent ones.
         
         - Part 4 (Pair Discussion): 
           * CRITICAL: For Part 4, the originalText MUST include the FULL dialogue between Candidate A (the user) and Candidate B (the partner).
           * Extract ALL messages marked with [Part 4 User], [Part 4 Partner], or [Part 4 End] from the transcript.
           * Format the originalText as a dialogue, showing both sides:
             Example format:
             "Candidate A: [user's first statement]
             Candidate B: [partner's response]
             Candidate A: [user's next statement]
             Candidate B: [partner's response]
             ..."
           * FLEXIBILITY is CRITICAL for Part 4 - evaluate active participation, ability to respond to partner, topic transitions.
           * For Coherence: Check speechMetrics if available (aggregate across all user turns):
             - duration: Should be substantial across all turns (at least 60-90 seconds total)
             - wordCount: Should be substantial (at least 100-150 words total)
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be reasonable (not excessive, but some pauses for thinking are OK)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension, with Flexibility being especially important).
           * Typical scores: 10-13 points for active participation, 13-15 for excellent interactive discussion.
         
         - Part 5 (In-depth Q&A): 
           * Evaluate all three dimensions: Accuracy, Coherence, and Flexibility (ability to handle complex questions).
           * For Coherence: Check speechMetrics if available:
             - duration: Should be at least 20-30 seconds for adequate response
             - wordCount: Should be at least 50-80 words
             - averageWordsPerSecond: Ideal 2-3 words/sec
             - pauseCount: Should be minimal (< 3 pauses)
             - fluencyScore: Should be > 0.6 for good performance
           * Score: 0-15 points (5 points per dimension).
           * Typical scores: 10-13 points for adequate responses, 13-15 for excellent ones.
      
      2. For each part's feedback, clearly explain performance in each dimension using this EXACT format:
         Accuracy and Range: [specific feedback on grammar, vocabulary, pronunciation]
         Size and Coherence: [specific feedback on speaking length, fluency, pauses]
         Flexibility and Appropriateness: [specific feedback on interaction, adaptability, appropriateness]
         
         IMPORTANT: Use the exact labels "Accuracy and Range:", "Size and Coherence:", and "Flexibility and Appropriateness:" at the start of each section. Put each dimension on a new line.
      
      3. Identify High Frequency Errors across all parts (e.g., "She/He confusion", "Tense inconsistency", "Word repetition", "Inappropriate pauses").
      
      4. Give an overall grade (A+, A, B, C, D) based on comprehensive performance:
         - A+ or A: Average 13-15 points across parts (Deep, clear, detailed communication)
         - B: Average 10-12 points (Relatively deep, relatively clear)
         - C: Average 7-9 points (Simple, basic communication)
         - D: Average 0-6 points (Does not meet basic oral communication requirements)
      
      5. Provide constructive general advice that addresses all three dimensions and helps improve overall performance.

      Return strictly JSON.
    `;
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        totalGrade: { type: Type.STRING, enum: ["A+", "A", "B", "C", "D"] },
        part1Feedback: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          }
        },
        part2Feedback: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          }
        },
        part3Feedback: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          }
        },
        part4Feedback: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          }
        },
        part5Feedback: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          }
        },
        highFreqErrors: { type: Type.ARRAY, items: { type: Type.STRING } },
        generalAdvice: { type: Type.STRING }
      }
    };

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(response.text || "{}") as ExamResult;
    } catch (error) {
      console.error("Report Gen Error", error);
      return {
        totalGrade: "C",
        part1Feedback: { originalText: "", feedback: "Error", score: 0 },
        part2Feedback: { originalText: "", feedback: "Error", score: 0 },
        part3Feedback: { originalText: "", feedback: "Error", score: 0 },
        part4Feedback: { originalText: "", feedback: "Error", score: 0 },
        part5Feedback: { originalText: "", feedback: "Error", score: 0 },
        highFreqErrors: ["Analysis Failed"],
        generalAdvice: "Please try again."
      };
    }
  }
};