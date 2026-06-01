# KebunKita Frontend — Setup, Usage & Debug Guide

This document explains how to set up and run the KebunKita React frontend, understand the component structure, integrate with the backend API, and debug common errors.

## Quick Start

### Prerequisites
- Node.js 14+ and npm installed
- Backend running at `http://localhost:8000` (or configure `REACT_APP_API_URL`)

### Install & Run
From the `frontend/` directory:

```bash
npm install
npm start
```

The app will open at `http://localhost:3000`. Default backend URL is `http://localhost:8000`; to change it:

```bash
REACT_APP_API_URL=http://your-backend-url npm start
```

## App Structure

### Components
- **PlantHealth.js** — Upload plant image → analyze with YOLOv8/DeepSeek → get diagnosis
- **SmartFarming.js** — Input crop & farm details → get farming plan with Telegram updates
- **CommunityExchange.js** — List harvest → match with other farmers → exchange produce
- **DecisionSupport.js** — Chat with farming advisor (powered by DeepSeek/Ollama with Memory Core)
- **DebugConsole.js** — Collapsible debug panel at bottom; logs API calls, errors, and endpoints

### API Integration
File: `src/api/client.js`
- Wraps axios with automatic request/response logging
- All API errors include `debugInfo` with status, URL, and error message
- Methods:
  - `analyzePlant(userId, imageName, imageFile, notes)`
  - `createFarmingPlan(userId, cropType, areaSize, soilType, waterSource)`
  - `matchHarvest(userId, cropName, quantity, location)`
  - `askDecisionSupport(userId, question, context)`
  - `getMemory(userId)`
  - `getGuardrails()` — Debug endpoint showing env status and guardrails
  - `getHealth()` — Backend health check

## Error Debugging

### Debug Console (Bottom-right panel)
- **Expand/collapse** by clicking the header
- **Check Health** — Verify backend is running (`GET /health`)
- **Check Guardrails** — View env vars, guardrail rules, fallback paths (`GET /api/agents/guardrails`)
- **Check Memory** — Fetch stored memory for current user (`GET /api/agents/memory/{userId}`)
- **Clear Logs** — Reset the log list
- **Auto-logs** — All API requests/responses and errors are automatically captured

### Common Errors & Solutions

#### Error: "Cannot POST /api/agents/plant-health"
- **Cause:** Backend not running or API URL is wrong
- **Fix:**
  1. Check backend is running: `python -m uvicorn backend.main:app --reload --port 8000`
  2. Verify API URL in frontend env or `.env` file (`REACT_APP_API_URL`)
  3. Click "Check Health" in Debug Console to test connection

#### Error: "502 Bad Gateway" or "Network Error"
- **Cause:** Backend crashed or endpoint not defined
- **Fix:**
  1. Check backend logs for errors
  2. Restart backend: stop and run `python -m uvicorn backend.main:app --reload --port 8000`
  3. Verify API routes: `python -c "from backend.main import app; print([r.path for r in app.routes])"`

#### Error: "User ID is required"
- **Cause:** No user ID entered in the header input
- **Fix:** Enter any unique ID (e.g., "user:alice", "farmer:123") in the User ID field and retry

#### Plant Health: "Image upload fails"
- **Cause:** File size too large, unsupported format, or backend issue
- **Fix:**
  1. Use JPG/PNG, max 10MB
  2. Check browser console for detailed error
  3. In Debug Console, click "Check Guardrails" to see if YOLOv8 is configured

#### Decision Support: "Empty response or timeout"
- **Cause:** DeepSeek/Ollama not configured or slow response
- **Fix:**
  1. Check Debug Console → "Check Guardrails" → see `env_status` for DEEPSEEK_API_KEY, OLLAMA_BASE_URL
  2. If env vars are `False`, configure them in backend `.env` and restart backend
  3. Increase timeout: edit `src/api/client.js` line 8, change `timeout: 30000` to higher value (in ms)

#### Memory shows "empty" or "not found"
- **Cause:** Memory Core is in-memory or user_id has no entries
- **Fix:**
  1. Make a plant health or farming plan request first to create memories
  2. If using Pinecone, check `PINECONE_API_KEY` is set in backend `.env`
  3. For in-memory store, memories are lost on backend restart

### Console Logging
Open browser DevTools (F12 → Console tab) to see full API logs:
- `[API Request]` — outgoing request URL, method, data
- `[API Response]` — response status, URL, returned data
- `[API Error]` — error status, message, and detailed debugInfo object

Example console output:
```
[API Request] POST http://localhost:8000/api/agents/plant-health {FormData...}
[API Response] 200 http://localhost:8000/api/agents/plant-health {status: "healthy", confidence: 0.95, ...}
[API Error] {status: 400, message: "Field 'user_id' is required", url: "...", timestamp: "2026-05-16T..."}
```

## Feature Breakdown

### 1. Plant Health Agent
- **Input:** Plant image (JPG/PNG), optional notes (e.g., "wilting leaves, brown spots")
- **Output:** Disease name, symptoms, treatment plan, confidence score, memory reference
- **Backend endpoint:** `POST /api/agents/plant-health`
- **How it works:** Image is sent to YOLOv8 for vision analysis; if low confidence, falls back to DeepSeek text analysis; guardrails prevent hallucinated diagnoses

### 2. Smart Farming Agent
- **Input:** Crop type, farm area (hectares), soil type (optional), water source (optional)
- **Output:** Farming plan, estimated yield, Telegram hint, memory reference
- **Backend endpoint:** `POST /api/agents/smart-farming`
- **How it works:** Generates an optimized plan using DeepSeek; stores in Memory Core; flags Telegram integration for progress updates

### 3. Community Exchange Agent
- **Input:** Crop name, quantity, location (optional)
- **Output:** Matching status, matched farms, contact info, memory reference
- **Backend endpoint:** `POST /api/agents/community-exchange`
- **How it works:** Searches for farms with compatible harvests (currently a demo); stores exchange in Memory Core

### 4. Decision Support (Chat)
- **Input:** User question (e.g., "How do I prevent root rot?"), conversation history
- **Output:** Advisor response, confidence score
- **Backend endpoint:** `POST /api/agents/decision-support`
- **How it works:** Maintains chat history in Memory Core; sends context to DeepSeek for contextual answers; guardrails prevent off-topic responses

## Environment Variables

Create a `.env` file in `frontend/` (optional, for customization):
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_DEBUG_MODE=true  # Enable extra logging
```

## Production Deployment

### Build
```bash
npm run build
```

Creates optimized static files in `build/` folder.

### Deploy
- Upload `build/` folder to Vercel, Netlify, or any static hosting
- Set environment variable in deployment platform:
  - `REACT_APP_API_URL=https://your-backend-url.com`

### Example (Vercel)
```bash
npm install -g vercel
vercel
# Follow prompts, set REACT_APP_API_URL in Vercel dashboard
```

## Testing API Endpoints Locally

### Plant Health (with image)
```bash
curl -X POST http://localhost:8000/api/agents/plant-health \
  -F "user_id=user:test" \
  -F "image_name=leaf.jpg" \
  -F "image=@/path/to/leaf.jpg" \
  -F "notes=Brown spots observed"
```

### Smart Farming (no image)
```bash
curl -X POST http://localhost:8000/api/agents/smart-farming \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user:test",
    "crop_type": "Tomato",
    "area_size": 2.5,
    "soil_type": "Clay loam",
    "water_source": "Irrigation"
  }'
```

### Decision Support Chat
```bash
curl -X POST http://localhost:8000/api/agents/decision-support \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user:test",
    "question": "How to prevent plant wilting?",
    "context": "user: Hello\nassistant: Hi there!"
  }'
```

### Check Guardrails (debug)
```bash
curl http://localhost:8000/api/agents/guardrails
```

## Next Steps & Improvements

- [ ] Add file size validation before upload
- [ ] Implement image preview in Plant Health
- [ ] Add Telegram webhook receiver to show push notifications in UI
- [ ] Add export/download farming plans as PDF
- [ ] Add multi-language support (i18n)
- [ ] Add unit tests for components and API client
- [ ] Implement real-time chat with WebSockets
- [ ] Add dark mode toggle

## Support

If you encounter issues:
1. **Check Debug Console** — expand it and run health checks
2. **Check backend logs** — restart backend and watch output
3. **Check browser console** (F12) — look for [API Error] logs
4. **Check env vars** — ensure backend `.env` has all required keys
5. **Verify API connectivity** — use `curl` to test endpoints directly

For more details, see [backend/DOCS_BACKEND_REMAINING.md](../backend/DOCS_BACKEND_REMAINING.md) and [backend/DOCS_PINECONE_MEMORY.md](../backend/DOCS_PINECONE_MEMORY.md).
