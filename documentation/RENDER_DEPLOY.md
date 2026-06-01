# KebunKita Backend Render Deployment

## Purpose

This guide explains how to host the KebunKita FastAPI backend on Render.

Render will host only the backend API. Supabase remains the main backend platform for Auth, Database, and Storage. Firebase Cloud Messaging is used only for push notifications.

## Files Added

Render blueprint:

```text
render.yaml
```

Python version pin:

```text
.python-version
```

Backend entry point:

```text
backend.main:app
```

## Render Build Settings

If creating the service manually in Render, use these settings.

| Setting | Value |
| --- | --- |
| Service Type | Web Service |
| Runtime | Python |
| Root Directory | leave empty / repository root |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

The repository pins Python to `3.12` using `.python-version`. This avoids Render's newer Python default trying to compile packages such as `pydantic-core` from source.

## Environment Variables

Set these in Render Dashboard under Environment.

Required:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `CORS_ALLOW_ORIGINS`

Firebase FCM:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Optional:

- `YOLOV8_ENDPOINT`
- `PINECONE_API_KEY`
- `PINECONE_ENV`
- `PINECONE_INDEX_NAME`

Recommended values:

```text
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

For `CORS_ALLOW_ORIGINS`, include your deployed frontend URL and local development URL.

Example:

```text
https://your-frontend-domain.com,http://localhost:3000,http://127.0.0.1:3000
```

## AI Service On Render

The main Render backend should not load `plant.pt` directly for the MVP. Keep this backend focused on API routes, Supabase, DeepSeek, and access limits.

For Plant Health, deploy YOLOv8 as a separate inference service that loads `plant.pt`, then set:

```text
YOLOV8_ENDPOINT=https://your-yolo-service.com/analyze
```

Keep the raw training dataset outside the Render backend repository. For local testing only, model weights can sit at:

```text
backend/ml/models/plant.pt
```

See [AI_SERVICE.md](AI_SERVICE.md) for the full hybrid YOLOv8 + DeepSeek setup.

## Firebase Private Key Note

Render environment variables can store multiline secrets, but Firebase private keys sometimes need escaped newlines.

If the raw private key causes issues, store it with `\n` line breaks:

```text
-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Deploy With render.yaml

1. Push the project to GitHub.
2. Open Render Dashboard.
3. Select New.
4. Select Blueprint.
5. Connect the GitHub repo.
6. Render detects `render.yaml`.
7. Add required environment variables.
8. Deploy.

## Deploy Manually

1. Open Render Dashboard.
2. Select New Web Service.
3. Connect the GitHub repo.
4. Use Python runtime.
5. Set build command:

```bash
pip install -r backend/requirements.txt
```

6. Set start command:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

7. Set health check path:

```text
/health
```

8. Add environment variables.
9. Deploy.

## Verify Deployment

After Render deploys, open:

```text
https://your-render-service.onrender.com/health
```

Expected shape:

```json
{
  "ok": true,
  "env_loaded": {
    "DEEPSEEK_API_KEY": true,
    "SUPABASE_URL": true,
    "SUPABASE_KEY": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "FIREBASE_PROJECT_ID": true,
    "FIREBASE_CLIENT_EMAIL": true,
    "FIREBASE_PRIVATE_KEY": true
  },
  "supabase": {
    "configured": true,
    "ok": true
  }
}
```

Open API docs:

```text
https://your-render-service.onrender.com/docs
```

## Quick Smoke Test

Create guest:

```bash
curl -X POST https://your-render-service.onrender.com/api/auth/guest \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Render Guest\",\"location_text\":\"Tanjung Malim\"}"
```

Create notification row:

```bash
curl -X POST https://your-render-service.onrender.com/api/notifications \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"PASTE_USER_ID\",\"notification_type\":\"system\",\"title\":\"Render Test\",\"body\":\"Backend is deployed\"}"
```

## Common Render Issues

### App Starts Then Fails

Check the Render logs. Common causes:

- Missing environment variable.
- Wrong start command.
- Bad Python import.
- Supabase key error.

### Health Check Fails

Open:

```text
/health
```

Check:

- `ok` is true.
- `supabase.ok` is true.
- Required env values are true.

### CORS Error From Frontend

Set `CORS_ALLOW_ORIGINS` to include the frontend URL.

Example:

```text
https://kebunkita-frontend.onrender.com,http://localhost:3000
```

### Supabase Works Locally But Not Render

Check:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase project is not paused.
- Supabase schema has been created.

## Production Notes

- Do not commit real `.env` values.
- Set secrets only in Render Environment.
- Use `SUPABASE_SERVICE_ROLE_KEY` only on the backend.
- Never expose service role key to frontend or Flutter.
- Add the Render backend URL to frontend API config.
