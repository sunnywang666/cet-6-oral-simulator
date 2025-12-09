# CET-6 口语考试模拟器

一个基于 React + TypeScript + Google Gemini API 的大学英语六级口语考试模拟系统。

## 功能特点

- 📝 **完整考试模式**：模拟完整的 CET-6 口语考试流程（5个部分）
- 🎯 **专项特训模式**：可以单独练习某个部分
- 🎤 **实时语音识别**：使用浏览器原生 Web Speech API
- 🔊 **语音合成**：AI 考官和对话伙伴的语音提示
- 📊 **智能评分系统**：基于官方 SET-6 评分标准，三个维度评估
- 📈 **语音指标分析**：分析话语长短、流畅度、停顿等
- 💾 **历史记录**：自动保存考试记录，支持查看和导出
- 🎨 **现代化 UI**：响应式设计，美观易用

## 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite
- **AI 服务**：Google Gemini API
- **语音技术**：Web Speech API（浏览器原生）
- **UI 框架**：Tailwind CSS
- **图标库**：Lucide React

## 快速开始

### 环境要求

- Node.js 16+ 
- Chrome 浏览器（推荐，支持 Web Speech API）

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/cet-6-oral-simulator.git
   cd cet-6-oral-simulator
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 API Key**
   
   创建 `.env.local` 文件，添加你的 Gemini API Key：
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   
   > 获取 API Key：访问 [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **运行开发服务器**
   ```bash
   npm run dev
   ```
   
   访问 http://localhost:3000

5. **构建生产版本**
   ```bash
   npm run build
   ```

## 项目结构

```
cet-6-oral-simulator/
├── components/          # React 组件
│   ├── Timer.tsx       # 倒计时组件
│   └── Visualizer.tsx  # 语音可视化组件
├── hooks/              # 自定义 Hooks
│   └── useSpeech.ts    # 语音识别和合成 Hook
├── services/           # 服务层
│   ├── geminiService.ts      # Gemini API 服务
│   ├── punctuationService.ts # 标点符号处理
│   └── storageService.ts     # 本地存储服务
├── types.ts            # TypeScript 类型定义
├── App.tsx             # 主应用组件
└── vite.config.ts      # Vite 配置
```

## 考试部分说明

1. **Part 1: 自我介绍** (20秒)
2. **Part 2: 简短问答** (30秒)
3. **Part 3: 个人陈述** (准备60秒 + 陈述90秒)
4. **Part 4: 双人讨论** (180秒，与 AI 伙伴对话)
5. **Part 5: 深入问答** (45秒)

## 评分标准

基于官方 SET-6 评分标准，每个部分满分 15 分：

- **准确性 (Accuracy)** - 5分：语法、词汇、发音
- **连贯性 (Coherence)** - 5分：话语长短、流畅度、停顿
- **互动性 (Flexibility)** - 5分：应变能力、参与度

## 部署

### GitHub Pages

项目已配置 GitHub Actions 自动部署。详细说明请查看 [DEPLOY.md](DEPLOY.md)

## 注意事项

- ⚠️ **浏览器兼容性**：推荐使用 Chrome 浏览器，其他浏览器可能不支持 Web Speech API
- 🔑 **API Key 安全**：不要将 `.env.local` 文件提交到 Git 仓库
- 🎤 **麦克风权限**：首次使用需要授权麦克风权限

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
