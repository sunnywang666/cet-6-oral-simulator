# cet-6-oral-simulator

纯前端 CET-6 口语考试模拟器:浏览器 Web Speech API 做语音识别与朗读,LLM(默认智谱 GLM,可选 Gemini)扮演考官/讨论搭档并生成评分报告。已归档完结。

## 技术栈

TypeScript ~5.8 + React 19 + Vite 6(ESM,dev 端口 3000)。Tailwind 走 index.html 的 CDN(非构建集成,无 tailwind.config)。AI 默认智谱 glm-5,可选 @google/generative-ai。Web Speech API + AudioContext,需 Chrome + 麦克风权限。CI 用 Node 20。无测试/lint。

## 常用命令

- `npm install` / `npm run dev` / `npm run build` / `npm run preview`
- 环境准备:复制 .env.example 为 .env.local(Windows 用 Copy-Item)
- 部署:.github/workflows/deploy.yml 双重部署(SCP 到 Nginx + GitHub Pages)
- 无 test/lint/typecheck 脚本;手动 `tsc` 检查类型(未验证)

## 目录导览

- `App.tsx`(~2000 行)— 核心单文件:ExamStage 状态机驱动全部流程(模式选择 → Part1-5 → PROCESSING → REPORT/HISTORY)
- `hooks/useSpeech.ts` — 语音识别 + 流利度指标、TTS,大量用 ref 规避闭包/自动重启问题
- `services/aiService.ts` — provider 门面,按 VITE_AI_PROVIDER 切换 zhipu/gemini
- `services/zhipuService.ts` — 智谱实现 + 硬编码真题题库 REAL_EXAM_TOPICS
- `services/storageService.ts` — localStorage 历史记录(key `cet6_exam_history`)
- `types.ts` — 全部枚举/接口 + window 语音 API 类型扩展

## 架构要点

- 五个 Part 对应真实 CET-6 口语结构;支持完整考试与单 Part 专项特训
- 语音管线:useSpeech 连续识别+自动重启+双缓冲 → PunctuationService 加标点 → 入库;评分由 LLM 的 generateReport 生成 ExamResult 并自动存档
- 数据全在 localStorage,无后端
- 改 AI 逻辑动 services/,改流程动 App.tsx 状态机

## 约定与雷区

- **命名陷阱**:对外导出的类叫 `GeminiService`,实际是 provider 门面,默认走智谱——别被类名误导
- 语音时序脆弱:App.tsx 和 useSpeech.ts 里带 `CRITICAL:` 注释的 setTimeout 延迟与状态捕获是刻意规避浏览器竞态的,不要随意改
- 所有 VITE_* 密钥会打进前端 bundle,生产应走后端代理,别把真实 key 提交
- VITE_BASE_PATH 默认 `/`,仅子路径部署(GitHub Pages)时才设,设错资源 404
