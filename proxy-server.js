// 简单的 Node.js 代理服务器
// 用于在国内服务器上代理 Gemini API 请求

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 从环境变量获取 API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 代理 Gemini API 请求
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-2.0-flash' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate content',
      details: error.toString()
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Gemini Proxy' });
});

app.listen(PORT, () => {
  console.log(`Gemini Proxy Server running on port ${PORT}`);
  console.log(`API Key configured: ${GEMINI_API_KEY ? 'Yes' : 'No'}`);
});
