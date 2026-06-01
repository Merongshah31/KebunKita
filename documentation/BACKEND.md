# KebunKita Backend Document

## Purpose

The backend is the live API layer for KebunKita. It coordinates agent workflows, AI services, storage, and memory.

## Stack

- FastAPI
- Pydantic schemas
- Memory Core with in-memory fallback and Pinecone option
- YOLOv8 endpoint hook for plant image analysis
- DeepSeek fallback for deeper explanation
- Supabase Auth, PostgreSQL Database, and Storage for MVP backend data
- Firebase Cloud Messaging for push notifications only

## MVP Backend Split

KebunKita does not need to move the whole project to Firebase.

- Supabase: Auth, Database, and Storage.
- Firebase FCM: push notification delivery only.

Push notification flow:

1. User logs in through Flutter.
2. Flutter gets the FCM device token.
3. Flutter saves the FCM token into a Supabase table.
4. Supabase Edge Function, Laravel backend, or FastAPI backend sends a request to FCM when notification is needed.
5. User receives the push notification.

## Main Files

- `backend/main.py`: app setup, environment loading, root route, health route
- `backend/api/agents_api.py`: agent API routes
- `backend/models/schemas.py`: request and response models
- `backend/agents/`: agent orchestration logic
- `backend/lib/ai_hooks.py`: YOLOv8, DeepSeek, and guardrails
- `backend/tools/memory_tools.py`: Memory Core storage

## Backend Implementation Phases

See [BACKEND_PHASES.md](BACKEND_PHASES.md) for the ordered backend implementation plan after the Supabase database setup.

## Live Endpoints

### Health

`GET /health`

Returns whether the backend is running.

### Plant Health

`POST /api/agents/plant-health`

Form fields:

- `user_id`
- `file`
- `notes` optional

### Smart Farming

`POST /api/agents/smart-farming`

Form fields:

- `user_id`
- `plant_name`
- `budget_rm` optional

### Community Exchange

`POST /api/agents/community-exchange`

Form fields:

- `user_id`
- `title`
- `quantity`
- `location` optional

### Decision Support

`POST /api/agents/decision-support`

Form fields:

- `user_id`
- `budget_rm`
- `timeline_weeks`
- `space`
- `goal`
- `chat_message` optional

## Environment

Important variables:

- `YOLOV8_ENDPOINT`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENV`
- `PINECONE_INDEX_NAME`

## Run

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## Render Hosting

The backend is Render-ready.

Render start command:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

See [RENDER_DEPLOY.md](RENDER_DEPLOY.md) for full deployment steps.

## AI Service

The backend expects YOLOv8 inference through `YOLOV8_ENDPOINT`.

For local AI development, the trained YOLOv8 weights can be placed at:

```text
backend/ml/models/plant.pt
```

Do not commit `plant.pt` to GitHub. For production, deploy a separate YOLO inference service that loads `plant.pt`, then set `YOLOV8_ENDPOINT` in Render.

See [AI_SERVICE.md](AI_SERVICE.md) for the full hybrid YOLOv8 + DeepSeek flow.
