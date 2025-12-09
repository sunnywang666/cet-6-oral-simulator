// geminiService.js - Gemini API 服务（小程序版本，使用 HTTP 请求）

const MODEL_NAME = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// 获取 API Key
const getApiKey = () => {
  const app = getApp();
  return app.globalData.apiKey || 'AIzaSyCA7YGsUo95mqKn6zzsT0i5GQypTodEFUM';
};

// 真题题库
export const REAL_EXAM_TOPICS = [
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

// HTTP 请求封装
const requestGemini = (prompt, schema = null) => {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    const url = `${API_BASE}/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const requestData = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
    
    // 如果提供了 schema，使用 JSON 模式
    if (schema) {
      requestData.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema
      };
    }
    
    wx.request({
      url: url,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.candidates && res.data.candidates[0]) {
          const text = res.data.candidates[0].content.parts[0].text;
          if (schema) {
            try {
              resolve(JSON.parse(text));
            } catch (e) {
              reject(new Error('Failed to parse JSON response'));
            }
          } else {
            resolve(text);
          }
        } else {
          reject(new Error(res.data.error?.message || 'API request failed'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

export const GeminiService = {
  /**
   * 随机选择真题
   */
  getRandomRealTopic() {
    const index = Math.floor(Math.random() * REAL_EXAM_TOPICS.length);
    return REAL_EXAM_TOPICS[index];
  },

  /**
   * Part 2: 获取数据
   */
  async getPart2Data(mode, realTopic) {
    if (mode === 'REAL' && realTopic) {
      return { topic: realTopic.name, question: realTopic.part2Question };
    }

    // 模拟模式
    const prompt = `Generate a CET-6 Oral Exam Part 2 Topic and Question.
Topic should be broad (e.g. Technology, Health).
Question should be specific and open-ended.
Return JSON: {"topic": "...", "question": "..."}`;

    const schema = {
      type: "object",
      properties: {
        topic: { type: "string" },
        question: { type: "string" }
      },
      required: ["topic", "question"]
    };

    try {
      return await requestGemini(prompt, schema);
    } catch (e) {
      return { topic: "Simulation", question: "Describe a memorable event." };
    }
  },

  /**
   * Part 3: 获取数据
   */
  async getPart3Data(mode, realTopic) {
    if (mode === 'REAL' && realTopic) {
      return { title: realTopic.part3Title, quote: realTopic.part3Quote };
    }

    const prompt = `Generate a prompt card for CET-6 Part 3.
Provide a Title and a provocative Quote/Statement.
Return JSON: {"title": "...", "quote": "..."}`;

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        quote: { type: "string" }
      },
      required: ["title", "quote"]
    };

    try {
      return await requestGemini(prompt, schema);
    } catch (e) {
      return { title: "Patience", quote: "Patience is a virtue." };
    }
  },

  /**
   * Part 4: 生成对话回合
   */
  async generatePart4Turn(history, topic, lastUserText) {
    // Case 1: AI 开始（无历史记录）
    if (!lastUserText && history.length === 0) {
      const systemInstruction = `You are Candidate B in a CET-6 Pair Discussion exam.
Topic: "${topic}"

CRITICAL RULES:
1. You are ONLY Candidate B. Generate ONLY what YOU (Candidate B) say.
2. DO NOT include what Candidate A says. DO NOT create a dialogue.
3. Keep it SHORT (20-40 words).
4. Start the discussion by introducing the topic and asking your partner's opinion.

Generate ONLY your opening statement as Candidate B:`;

      try {
        const text = await requestGemini(systemInstruction);
        let cleaned = text.split('\n')[0].trim();
        cleaned = cleaned.replace(/^(Candidate [AB]:|Partner:|You:)\s*/i, '');
        return cleaned || "Shall we start? What do you think about this topic?";
      } catch (e) {
        return "Shall we start? What is your opinion?";
      }
    }

    // Case 2: 回复用户
    const userMessages = history
      .filter(h => h.text.includes('[Part 4') && h.role === 'user')
      .slice(-3)
      .map(h => h.text.replace(/\[Part 4.*?\]:\s*/, ''))
      .join(' | ');

    const systemInstruction = `You are Candidate B in a CET-6 Pair Discussion exam.
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
      const text = await requestGemini(systemInstruction);
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^(Candidate [AB]:|Partner:|You:|Candidate B:)\s*/gi, '');
      cleaned = cleaned.split(/[AB]:/i)[0].trim();
      cleaned = cleaned.split('\n')[0].trim();
      cleaned = cleaned.replace(/^["']|["']$/g, '');
      return cleaned || "I agree with that. What else is important?";
    } catch (e) {
      return "That's a good point. Do you have other ideas?";
    }
  },

  /**
   * Part 5: 获取问题
   */
  async getPart5Question(mode, realTopic, simTopicName) {
    if (mode === 'REAL' && realTopic) {
      return realTopic.part5Question;
    }

    const prompt = `Based on the topic "${simTopicName}", ask ONE abstract, complex question for CET-6 Part 5.
Return ONLY the question text.`;

    try {
      const text = await requestGemini(prompt);
      return text.trim() || "How does this impact society in the long run?";
    } catch (e) {
      return "What are the future implications of this?";
    }
  },

  /**
   * 生成详细报告
   */
  async generateReport(fullTranscript, practicePart) {
    const isPractice = !!practicePart;
    const partToEvaluate = practicePart;

    // 构建提示词（简化版，包含核心逻辑）
    let prompt = `You are a professional CET-6 Oral Examiner following the official SET-6 scoring standards.

OFFICIAL SCORING STANDARDS:
Each section is scored out of 15 points, based on THREE dimensions (5 points each):
1. ACCURACY AND RANGE (准确性) - 5 points
2. SIZE AND COHERENCE (话语长短和连贯性) - 5 points  
3. FLEXIBILITY AND APPROPRIATENESS (灵活性和适切性) - 5 points

TRANSCRIPT:
${JSON.stringify(fullTranscript)}

Return JSON with this structure:
{
  "totalGrade": "A+" | "A" | "B" | "C" | "D",
  "part1Feedback": {
    "originalText": "...",
    "feedback": "Accuracy and Range: ... (Score: X/5)\\nSize and Coherence: ... (Score: X/5)\\nFlexibility and Appropriateness: ... (Score: X/5)",
    "score": 0-15,
    "accuracyScore": 0-5,
    "coherenceScore": 0-5,
    "flexibilityScore": 0-5
  },
  ... (same for part2, part3, part4, part5),
  "highFreqErrors": ["error1", "error2"],
  "generalAdvice": "..."
}`;

    const schema = {
      type: "object",
      properties: {
        totalGrade: { type: "string", enum: ["A+", "A", "B", "C", "D"] },
        part1Feedback: {
          type: "object",
          properties: {
            originalText: { type: "string" },
            feedback: { type: "string" },
            score: { type: "integer" },
            accuracyScore: { type: "integer" },
            coherenceScore: { type: "integer" },
            flexibilityScore: { type: "integer" }
          }
        },
        part2Feedback: {
          type: "object",
          properties: {
            originalText: { type: "string" },
            feedback: { type: "string" },
            score: { type: "integer" },
            accuracyScore: { type: "integer" },
            coherenceScore: { type: "integer" },
            flexibilityScore: { type: "integer" }
          }
        },
        part3Feedback: {
          type: "object",
          properties: {
            originalText: { type: "string" },
            feedback: { type: "string" },
            score: { type: "integer" },
            accuracyScore: { type: "integer" },
            coherenceScore: { type: "integer" },
            flexibilityScore: { type: "integer" }
          }
        },
        part4Feedback: {
          type: "object",
          properties: {
            originalText: { type: "string" },
            feedback: { type: "string" },
            score: { type: "integer" },
            accuracyScore: { type: "integer" },
            coherenceScore: { type: "integer" },
            flexibilityScore: { type: "integer" }
          }
        },
        part5Feedback: {
          type: "object",
          properties: {
            originalText: { type: "string" },
            feedback: { type: "string" },
            score: { type: "integer" },
            accuracyScore: { type: "integer" },
            coherenceScore: { type: "integer" },
            flexibilityScore: { type: "integer" }
          }
        },
        highFreqErrors: { type: "array", items: { type: "string" } },
        generalAdvice: { type: "string" }
      }
    };

    try {
      return await requestGemini(prompt, schema);
    } catch (error) {
      console.error("Report Gen Error", error);
      const errorMessage = error.message || String(error);
      
      // 返回错误结果
    return {
        totalGrade: "C",
        part1Feedback: {
      originalText: "",
          feedback: `Error generating report: ${errorMessage}`,
      score: 0,
          accuracyScore: undefined,
          coherenceScore: undefined,
          flexibilityScore: undefined
        },
        part2Feedback: { originalText: "", feedback: "Error", score: 0 },
        part3Feedback: { originalText: "", feedback: "Error", score: 0 },
        part4Feedback: { originalText: "", feedback: "Error", score: 0 },
        part5Feedback: { originalText: "", feedback: "Error", score: 0 },
        highFreqErrors: [`Analysis Failed: ${errorMessage}`],
        generalAdvice: `Error: ${errorMessage}`
      };
    }
  }
};
