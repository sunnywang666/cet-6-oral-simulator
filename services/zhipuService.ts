// 智谱 AI (Zhipu AI) Service
// 替代 Google Gemini API

import { ExamMode, RealExamTopic, Part2Data, Part3Data, ExamResult, Message, PracticePart } from '../types';

/**
 * 获取智谱 API Key
 */
function getApiKey() {
    const apiKey = import.meta.env.VITE_ZHIPU_API_KEY || import.meta.env.ZHIPU_API_KEY;
    if (!apiKey) {
        throw new Error('API key is not configured. Please set VITE_ZHIPU_API_KEY or ZHIPU_API_KEY in your environment variables.');
    }
    return apiKey;
}

// Real exam topics data
export const REAL_EXAM_TOPICS: RealExamTopic[] = [
    {
        id: 1,
        name: "Education and Learning",
        part2Question: "What do you think is the most important quality for a good teacher?",
        part3Title: "The Future of Online Education",
        part3Quote: "Online learning is not the next big thing, it is the now big thing.",
        part4Topic: "Discuss the advantages and disadvantages of online education compared to traditional classroom learning.",
        part5Question: "How do you think technology will change the way we learn in the future?"
    },
    {
        id: 2,
        name: "Environment and Sustainability",
        part2Question: "What environmental issue concerns you most?",
        part3Title: "Climate Change and Individual Responsibility",
        part3Quote: "The greatest threat to our planet is the belief that someone else will save it.",
        part4Topic: "Discuss what individuals can do to help protect the environment in their daily lives.",
        part5Question: "Do you think governments or individuals should take more responsibility for environmental protection?"
    },
    {
        id: 3,
        name: "Technology and Society",
        part2Question: "How has technology changed your daily life?",
        part3Title: "The Impact of Social Media",
        part3Quote: "Social media is not about the exploitation of technology but service to community.",
        part4Topic: "Discuss whether social media has more positive or negative effects on society.",
        part5Question: "How do you think artificial intelligence will affect our future work and life?"
    },
    {
        id: 4,
        name: "Health and Lifestyle",
        part2Question: "What do you do to stay healthy?",
        part3Title: "Work-Life Balance",
        part3Quote: "Take care of your body. It's the only place you have to live.",
        part4Topic: "Discuss the importance of maintaining a healthy work-life balance.",
        part5Question: "What advice would you give to someone who wants to lead a healthier lifestyle?"
    },
    {
        id: 5,
        name: "Culture and Travel",
        part2Question: "What is the most interesting place you have visited?",
        part3Title: "Cultural Exchange",
        part3Quote: "Travel is the only thing you buy that makes you richer.",
        part4Topic: "Discuss the benefits of traveling and experiencing different cultures.",
        part5Question: "How does learning about different cultures help us understand the world better?"
    }
];

/**
 * 调用智谱 API
 */
async function callZhipuAPI(prompt: string, model: string = 'glm-5'): Promise<string> {
    const apiKey = getApiKey();
    
    // 智谱 API 端点
    const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 65536
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Zhipu API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        // 智谱 API 响应格式
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content || '';
        }
        
        throw new Error('Invalid response format from Zhipu API');
    } catch (error) {
        console.error('Zhipu API Error:', error);
        throw error;
    }
}

/**
 * ZhipuService - 使用智谱 AI API
 */
export class GeminiService {
    /**
     * Get a random real exam topic
     */
    static getRandomRealTopic(): RealExamTopic {
        const randomIndex = Math.floor(Math.random() * REAL_EXAM_TOPICS.length);
        return REAL_EXAM_TOPICS[randomIndex];
    }

    /**
     * Get Part 2 data (topic and question)
     */
    static async getPart2Data(examMode: ExamMode, realTopic?: RealExamTopic): Promise<Part2Data> {
        if (examMode === ExamMode.REAL && realTopic) {
            return {
                topic: realTopic.name,
                question: realTopic.part2Question
            };
        }

        const prompt = `Generate a Part 2 question for CET-6 oral exam. 
        Part 2 is a short Q&A section. 
        Provide a topic and a question about that topic.
        Return ONLY a JSON object in this exact format:
        {
            "topic": "topic name",
            "question": "the question"
        }`;

        try {
            const text = await callZhipuAPI(prompt);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return {
                    topic: data.topic || "General Topic",
                    question: data.question || "Please share your thoughts."
                };
            }
            return { topic: "General Topic", question: "Please share your thoughts on this topic." };
        } catch (error) {
            console.error('Error generating Part 2 data:', error);
            return { topic: "General Topic", question: "Please share your thoughts on this topic." };
        }
    }

    /**
     * Get Part 3 data (title and quote)
     */
    static async getPart3Data(examMode: ExamMode, realTopic?: RealExamTopic): Promise<Part3Data> {
        if (examMode === ExamMode.REAL && realTopic) {
            return {
                title: realTopic.part3Title,
                quote: realTopic.part3Quote
            };
        }

        const prompt = `Generate a Part 3 card for CET-6 oral exam.
        Part 3 is a presentation section with a title and a quote.
        Return ONLY a JSON object in this exact format:
        {
            "title": "the title",
            "quote": "the quote"
        }`;

        try {
            const text = await callZhipuAPI(prompt);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return {
                    title: data.title || "General Topic",
                    quote: data.quote || "A relevant quote."
                };
            }
            return { title: "General Topic", quote: "A relevant quote." };
        } catch (error) {
            console.error('Error generating Part 3 data:', error);
            return { title: "General Topic", quote: "A relevant quote." };
        }
    }

    /**
     * Get Part 5 question
     */
    static async getPart5Question(
        examMode: ExamMode, 
        realTopic?: RealExamTopic, 
        part2Topic?: string
    ): Promise<string> {
        if (examMode === ExamMode.REAL && realTopic) {
            return realTopic.part5Question;
        }

        const topicContext = part2Topic || "general topics";
        const prompt = `Generate a Part 5 in-depth question for CET-6 oral exam.
        Part 5 is a follow-up question that requires deeper thinking.
        The topic context is: ${topicContext}
        Return ONLY the question text, no additional explanation.`;

        try {
            const text = await callZhipuAPI(prompt);
            return text.trim() || "What are your thoughts on this topic?";
        } catch (error) {
            console.error('Error generating Part 5 question:', error);
            return "What are your thoughts on this topic?";
        }
    }

    /**
     * Generate Part 4 turn
     */
    static async generatePart4Turn(
        historyContext: Message[],
        topicContext: string,
        lastUserText?: string
    ): Promise<string> {
        const conversationHistory = historyContext
            .map(msg => {
                if (msg.role === 'user') {
                    return `User: ${msg.text.replace(/\[Part 4[^\]]*\]\s*/g, '')}`;
                } else if (msg.role === 'ai') {
                    return `Partner: ${msg.text.replace(/\[Part 4 Partner\]:\s*/g, '')}`;
                }
                return '';
            })
            .filter(Boolean)
            .join('\n');

        const prompt = `You are a discussion partner in a CET-6 oral exam Part 4 (pair discussion).
        Topic: ${topicContext}
        
        ${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}
        
        ${lastUserText ? `The user just said: "${lastUserText}"\n` : ''}
        
        Respond naturally as a discussion partner. Keep your response concise (2-3 sentences), engaging, and appropriate for an English oral exam discussion. 
        Do NOT include any prefixes like "[Part 4 Partner]:" - just return your response directly.`;

        try {
            const text = await callZhipuAPI(prompt);
            return text.trim();
        } catch (error) {
            console.error('Error generating Part 4 turn:', error);
            return "That's an interesting point. Could you tell me more about that?";
        }
    }

    /**
     * Generate exam report with scoring
     */
    static async generateReport(
        messages: Message[],
        practicePart?: PracticePart
    ): Promise<ExamResult> {
        console.log('ZhipuService.generateReport called with', messages.length, 'messages');
        
        const part1Messages = messages.filter(m => m.text.includes('[Part 1]'));
        const part2Messages = messages.filter(m => m.text.includes('[Part 2]'));
        const part3Messages = messages.filter(m => m.text.includes('[Part 3]'));
        const part4Messages = messages.filter(m => m.text.includes('[Part 4]'));
        const part5Messages = messages.filter(m => m.text.includes('[Part 5]'));

        const partsToEvaluate = practicePart 
            ? [practicePart] 
            : ['PART1', 'PART2', 'PART3', 'PART4', 'PART5'];

        let evaluationPrompt = `You are an expert CET-6 oral exam evaluator. Evaluate the student's performance based on the SET-6 scoring criteria.

Scoring Criteria (each part scored 0-15):
- Accuracy and Range (0-5): Grammar, vocabulary, pronunciation
- Size and Coherence (0-5): Discourse length, fluency, pauses
- Flexibility and Appropriateness (0-5): Adaptability, participation

Grade Scale:
- A+ (14-15): Excellent
- A (12-13): Good
- B (9-11): Satisfactory
- C (6-8): Needs Improvement
- D (0-5): Poor

`;

        if (partsToEvaluate.includes('PART1') && part1Messages.length > 0) {
            const part1Text = part1Messages.map(m => m.text.replace(/\[Part 1\]\s*/g, '')).join(' ');
            evaluationPrompt += `Part 1 (Self-introduction):\n${part1Text}\n\n`;
        }

        if (partsToEvaluate.includes('PART2') && part2Messages.length > 0) {
            const part2Text = part2Messages.map(m => m.text.replace(/\[Part 2\]\s*/g, '')).join(' ');
            evaluationPrompt += `Part 2 (Short Q&A):\n${part2Text}\n\n`;
        }

        if (partsToEvaluate.includes('PART3') && part3Messages.length > 0) {
            const part3Text = part3Messages.map(m => m.text.replace(/\[Part 3\]\s*/g, '')).join(' ');
            evaluationPrompt += `Part 3 (Presentation):\n${part3Text}\n\n`;
        }

        if (partsToEvaluate.includes('PART4') && part4Messages.length > 0) {
            const part4Text = part4Messages
                .filter(m => m.role === 'user')
                .map(m => m.text.replace(/\[Part 4[^\]]*\]\s*/g, '')).join(' ');
            evaluationPrompt += `Part 4 (Pair Discussion - user's contributions):\n${part4Text}\n\n`;
        }

        if (partsToEvaluate.includes('PART5') && part5Messages.length > 0) {
            const part5Text = part5Messages.map(m => m.text.replace(/\[Part 5\]\s*/g, '')).join(' ');
            evaluationPrompt += `Part 5 (In-depth Q&A):\n${part5Text}\n\n`;
        }

        evaluationPrompt += `Return ONLY a valid JSON object in this exact format:
{
    "totalGrade": "A+",
    "part1Feedback": {
        "originalText": "...",
        "feedback": "...",
        "score": 15,
        "accuracyScore": 5,
        "coherenceScore": 5,
        "flexibilityScore": 5
    },
    "part2Feedback": { ... },
    "part3Feedback": { ... },
    "part4Feedback": { ... },
    "part5Feedback": { ... },
    "highFreqErrors": ["error1", "error2"],
    "generalAdvice": "..."
}

For parts not evaluated, use:
{
    "originalText": "",
    "feedback": "Not evaluated in this practice session",
    "score": 0
}`;

        try {
            console.log('Sending evaluation prompt to Zhipu API...');
            const text = await callZhipuAPI(evaluationPrompt);
            
            console.log('Received response from Zhipu, length:', text.length);
            
            let data: any = null;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    data = JSON.parse(jsonMatch[0]);
                    console.log('Successfully parsed JSON from response');
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError);
                }
            }
            
            if (data) {
                const defaultFeedback = {
                    originalText: "",
                    feedback: practicePart ? "Not evaluated in this practice session" : "",
                    score: 0
                };

                return {
                    totalGrade: data.totalGrade || 'C',
                    part1Feedback: data.part1Feedback || defaultFeedback,
                    part2Feedback: data.part2Feedback || defaultFeedback,
                    part3Feedback: data.part3Feedback || defaultFeedback,
                    part4Feedback: data.part4Feedback || defaultFeedback,
                    part5Feedback: data.part5Feedback || defaultFeedback,
                    highFreqErrors: data.highFreqErrors || [],
                    generalAdvice: data.generalAdvice || "Keep practicing to improve your oral English skills."
                };
            }
            
            throw new Error(`Failed to parse evaluation response. Response: ${text.substring(0, 200)}`);
            
        } catch (error: any) {
            console.error('Error generating report:', error);
            
            const errorMessage = error?.message || 'Unknown error';
            const defaultFeedback = {
                originalText: "",
                feedback: `Evaluation failed: ${errorMessage}. Please check your API key configuration.`,
                score: 0
            };

            return {
                totalGrade: 'C',
                part1Feedback: defaultFeedback,
                part2Feedback: defaultFeedback,
                part3Feedback: defaultFeedback,
                part4Feedback: defaultFeedback,
                part5Feedback: defaultFeedback,
                highFreqErrors: [],
                generalAdvice: `An error occurred during evaluation: ${errorMessage}. Please check your API key and network connection.`
            };
        }
    }
}
