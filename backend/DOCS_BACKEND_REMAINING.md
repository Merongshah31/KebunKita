# KebunKita Backend Status

This document summarizes the live backend implementation and the remaining work needed for deployment.

## Implemented

- FastAPI app entrypoint: `backend/main.py`
- Agent routes: `backend/api/agents_api.py`
- Project route: `backend/api/projects.py`
- AI integration hooks and guardrails: `backend/lib/ai_hooks.py`
- Agent modules: `backend/agents/`
- Request and response schemas: `backend/models/schemas.py`
- Memory Core with in-memory fallback and Pinecone support: `backend/tools/memory_tools.py`

## Live API

- `GET /health`
- `GET /api/agents/guardrails`
- `GET /api/agents/memory/{user_id}`
- `POST /api/agents/plant-health`
- `POST /api/agents/smart-farming`
- `POST /api/agents/community-exchange`
- `POST /api/agents/decision-support`

The agent `POST` routes accept form data. Plant Health also accepts a multipart image field named `file`.

## Remaining Work

1. Persist Memory Core to Pinecone, PostgreSQL, or Supabase in deployment.
2. Connect `YOLOV8_ENDPOINT` to a managed inference service or self-hosted model server.
3. Configure DeepSeek for deeper analysis when vision confidence is low.
4. Add a notification sender for Smart Farming reminders and progress updates.
5. Add tests for agent fallbacks, API validation, Memory Core persistence, and guardrail behavior.
6. Add CI for backend linting and test runs.

## Run Locally

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the generated API UI.
