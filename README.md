# CET-6 Oral Simulator

A React + TypeScript practice app for CET-6 oral exam workflows. It supports full mock exams, part-by-part practice, browser speech recognition, text-to-speech prompts, local history, and AI-assisted scoring.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind via CDN
- Lucide React icons
- Browser Web Speech API
- Zhipu AI by default, optional Gemini support

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` for local development:

```bash
VITE_AI_PROVIDER=zhipu
VITE_ZHIPU_API_KEY=your_zhipu_key
```

Optional Gemini mode:

```bash
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_gemini_key
```

`VITE_BASE_PATH` defaults to `/`. Only set it when deploying to a subpath:

```bash
VITE_BASE_PATH=/cet-6-oral-simulator/
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Notes

- Use Chrome for the best Web Speech API support.
- Vite `VITE_*` variables are embedded in client bundles. For a public production app, a backend proxy is safer than putting provider keys in frontend builds.
- The repository intentionally keeps deployment automation minimal. Add server deployment only after the target server and DNS are confirmed.
