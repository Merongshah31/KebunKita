# KebunKita Backend Debug Guide

## Purpose

This guide helps you debug the KebunKita backend by yourself after setting up `.env`.

The backend stack is:

- Supabase: Auth, Database, Storage.
- Firebase Cloud Messaging: push notifications only.
- DeepSeek: LLM fallback and decision support.
- YOLOv8 endpoint: plant image diagnosis when available.

Ollama is not used.

## Before Debugging

Run commands from the project root:

```bash
cd C:\reactproject\kebunkita
```

Use the project virtual environment:

```bash
.venv\Scripts\python.exe
```

Do not print real secret values. Only check whether they are loaded.

## 1. Compile Backend

Use this to check Python syntax.

```bash
.venv\Scripts\python.exe -m compileall backend
```

Expected result:

```text
Listing 'backend'...
```

No traceback means compile passed.

## 2. Check App Import and Routes

```bash
.venv\Scripts\python.exe -c "from backend.main import app; print(app.title); print(len(app.routes))"
```

Expected result:

```text
KebunKita Backend
23
```

If this fails, check the traceback. Common causes:

- Missing package in `.venv`
- Syntax error in backend file
- Bad import path

## 3. Check Environment Status

This checks only booleans, not secret values.

```bash
.venv\Scripts\python.exe -c "from backend.main import get_required_env_status; print(get_required_env_status())"
```

Expected example:

```python
{
  'YOLOV8_ENDPOINT': False,
  'DEEPSEEK_API_KEY': True,
  'SUPABASE_URL': True,
  'SUPABASE_KEY': True,
  'SUPABASE_SERVICE_ROLE_KEY': True,
  'FIREBASE_PROJECT_ID': True,
  'FIREBASE_CLIENT_EMAIL': True,
  'FIREBASE_PRIVATE_KEY': True
}
```

Notes:

- `YOLOV8_ENDPOINT` can be `False` while developing. The backend will use local heuristic fallback.
- `DEEPSEEK_API_KEY` should be `True`.
- Supabase values should be `True`.
- Firebase values should be `True` when testing push notification backend.

## 4. Check Supabase Connection

This confirms the backend can connect to Supabase.

```bash
.venv\Scripts\python.exe -c "from backend.main import app; from backend.lib.supabase_client import supabase_client; print(supabase_client.health())"
```

Expected result:

```python
{'configured': True, 'ok': True}
```

Common errors:

| Error | Meaning | Fix |
| --- | --- | --- |
| `configured: False` | Missing Supabase env values | Check `.env` |
| `401` or `403` | Wrong key or RLS issue | Check service role key |
| socket permission error | Local command blocked network | Run from normal terminal or allow network |
| relation does not exist | Schema not created | Run `SUPABASE_SCHEMA.sql` |

## 5. Start Backend Server

```bash
.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000
```

Open:

```text
http://localhost:8000/docs
```

Health endpoint:

```text
http://localhost:8000/health
```

Expected health shape:

```json
{
  "ok": true,
  "env_loaded": {
    "DEEPSEEK_API_KEY": true,
    "SUPABASE_URL": true
  },
  "supabase": {
    "configured": true,
    "ok": true
  }
}
```

## 6. How To Test The API

There are three simple ways to test the backend API.

### Option A: Swagger UI

Open:

```text
http://localhost:8000/docs
```

Use Swagger when you want to test form-data uploads, especially:

```text
POST /api/agents/plant-health
```

Swagger is easiest for selecting an image file.

### Option B: PowerShell

Use `Invoke-RestMethod` on Windows.

Example health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

### Option C: curl

Use curl if you prefer terminal-style API tests.

Example health check:

```bash
curl http://localhost:8000/health
```

## 7. Recommended API Test Order

Test in this order so each step gives you data for the next one.

1. `GET /health`
2. `POST /api/auth/guest`
3. `GET /api/auth/users/{user_id}`
4. `POST /api/agents/decision-support`
5. `POST /api/device-tokens`
6. `POST /api/notifications`
7. `POST /api/agents/smart-farming`
8. `POST /api/agents/community-exchange`
9. `POST /api/agents/plant-health`
10. `GET /api/agents/memory/{user_id}`

Recommended first command:

```powershell
$BASE_URL = "http://localhost:8000"
```

For Render later:

```powershell
$BASE_URL = "https://your-render-service.onrender.com"
```

## 8. Test Health API

PowerShell:

```powershell
Invoke-RestMethod "$BASE_URL/health"
```

curl:

```bash
curl http://localhost:8000/health
```

Expected:

- `ok`: `true`
- `supabase.configured`: `true`
- `supabase.ok`: `true`

## 9. Create Guest User

PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/auth/guest" `
  -ContentType "application/json" `
  -Body '{"full_name":"Debug Guest","location_text":"Tanjung Malim"}'
```

Expected result:

- `id`
- `access_type`: `guest`
- `is_guest`: `true`

Save the returned `id` as your `USER_ID` for later tests.

PowerShell helper:

```powershell
$guest = Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/auth/guest" `
  -ContentType "application/json" `
  -Body '{"full_name":"Debug Guest","location_text":"Tanjung Malim"}'

$USER_ID = $guest.id
$USER_ID
```

curl:

```bash
curl -X POST http://localhost:8000/api/auth/guest \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Debug Guest\",\"location_text\":\"Tanjung Malim\"}"
```

## 10. Read User Profile

PowerShell:

```powershell
Invoke-RestMethod "$BASE_URL/api/auth/users/$USER_ID"
```

Expected:

- `id` matches `$USER_ID`
- `access_type` is `guest`
- `is_guest` is `true`

## 11. Check Guest Access Limit

Decision Support allows 5 guest chat messages.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/agents/decision-support" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "user_id=$USER_ID&budget_rm=30&timeline_weeks=4&space=balcony&goal=grow food&chat_message=What should I grow?"
```

Expected result:

- `answer`
- `recommendations`
- `memory_ref`

Guest blocked example:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/plants" `
  -ContentType "application/json" `
  -Body "{`"user_id`":`"$USER_ID`",`"name`":`"Chili`",`"plant_type`":`"vegetable`"}"
```

Expected for guest:

```json
{
  "detail": {
    "code": "ACCESS_LIMITED"
  }
}
```

This is correct because Free Web App guest cannot accept a new saved plant name.

## 12. Test Device Token Save

Use a fake token for backend testing.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/device-tokens" `
  -ContentType "application/json" `
  -Body "{`"user_id`":`"$USER_ID`",`"fcm_token`":`"debug-token-$USER_ID`",`"platform`":`"android`",`"device_name`":`"Debug Device`"}"
```

Expected result:

```json
{
  "ok": true,
  "device_token": {
    "id": "...",
    "fcm_token": "debug-token-..."
  }
}
```

## 13. Test Notification Row

This creates a notification row. It does not send to FCM yet.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/notifications" `
  -ContentType "application/json" `
  -Body "{`"user_id`":`"$USER_ID`",`"notification_type`":`"system`",`"title`":`"Debug Notification`",`"body`":`"Backend notification row test`"}"
```

Expected result:

```json
{
  "status": "pending"
}
```

## 14. Test Smart Farming API

Guest users can generate task time, task name, and reason.

PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/agents/smart-farming" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "user_id=$USER_ID&plant_name=Chili&budget_rm=30"
```

Expected:

- `user_id`
- `plant_name`
- `tasks`
- `memory_ref`

## 15. Test Community Exchange API

PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/agents/community-exchange" `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "user_id=$USER_ID&title=Fresh Red Chilies&quantity=500g&location=Tanjung Malim"
```

Expected:

- `post_id`
- `matches`
- `memory_ref`

## 16. Test Plant Health API

Best option:

```text
http://localhost:8000/docs
```

Endpoint:

```text
POST /api/agents/plant-health
```

Form fields:

- `user_id`: your `$USER_ID`
- `notes`: optional notes
- `file`: image file

PowerShell example:

```powershell
$filePath = "C:\path\to\leaf_spot.jpg"

$form = @{
  user_id = $USER_ID
  notes = "brown spots on leaves"
  file = Get-Item $filePath
}

Invoke-RestMethod `
  -Method Post `
  -Uri "$BASE_URL/api/agents/plant-health" `
  -Form $form
```

Expected:

- `status`
- `confidence`
- `symptoms`
- `treatment_plan`
- `recommendation`
- `memory_ref`

## 17. Test Memory API

After running agent endpoints, check saved memory.

PowerShell:

```powershell
Invoke-RestMethod "$BASE_URL/api/agents/memory/$USER_ID"
```

Expected:

- `user_id`
- `history`

## 18. Test DeepSeek

This verifies the backend can call DeepSeek through the same `.env` loading path as FastAPI.

```powershell
@'
import backend.main
from backend.lib.ai_hooks import explain_with_deepseek

result = explain_with_deepseek(
    "Reply with JSON recommending one beginner balcony crop.",
    {"budget_rm": 20, "space": "balcony"}
)

print("source", result.get("source"))
print("has_answer", bool(result.get("answer")))
print("needs_review", result.get("needs_review"))
print("error_message", result.get("error_message"))
'@ | .venv\Scripts\python.exe -
```

Expected result:

```text
source deepseek
has_answer True
needs_review False
error_message None
```

If `source` is `fallback`:

- Check `DEEPSEEK_API_KEY`.
- Check `DEEPSEEK_BASE_URL`.
- Check internet/network access.
- Check DeepSeek account/API quota.

## 19. Test Plant Health Without YOLOv8

If `YOLOV8_ENDPOINT` is not configured, image name heuristic is used.

Use Swagger at:

```text
http://localhost:8000/docs
```

Endpoint:

```text
POST /api/agents/plant-health
```

Form fields:

- `user_id`
- `notes`
- `file`

Expected behavior:

- File name with `healthy`, `good`, or `ok` returns healthy fallback.
- File name with `leaf`, `spot`, `disease`, `mildew`, or `yellow` returns diseased fallback.
- Other names return unknown and DeepSeek fallback.

## 20. Common Backend Problems

### FastAPI Not Found

Error:

```text
ModuleNotFoundError: No module named 'fastapi'
```

Fix:

Use the virtual environment:

```bash
.venv\Scripts\python.exe
```

or install requirements:

```bash
.venv\Scripts\pip.exe install -r backend\requirements.txt
```

### Supabase Relation Does Not Exist

Fix:

Run:

```text
documentation/SUPABASE_SCHEMA.sql
```

inside Supabase SQL Editor.

### Guest Cannot Add Plant

This is correct for the current UAF rule.

Free Web App guest:

- Can generate smart farming task.
- Cannot save a new plant profile.

Premium Flutter:

- Can save new plant profile.

To test plant creation, use a `premium` user row in Supabase.

### DeepSeek Returns Fallback

Check:

- `.env` loaded from project root or `backend/.env`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- Network access
- API quota

### YOLOv8 Endpoint False

This means no real vision service is configured.

Temporary behavior:

- Backend uses local heuristic fallback.

Production behavior:

- Set `YOLOV8_ENDPOINT` to your model service.

## 21. API Response Status Cheat Sheet

| Status | Meaning |
| --- | --- |
| 200 | Request worked |
| 201 | Created successfully, if used |
| 400 | Bad request data |
| 403 | Access blocked or guest limit reached |
| 404 | Record not found |
| 422 | Missing or invalid required field |
| 502 | Backend could not reach Supabase or external service |

Most common during testing:

- `422`: field name is wrong or content type is wrong.
- `403`: guest tried a premium-only action.
- `502`: Supabase/env/network issue.

## 22. Useful Debug SQL in Supabase

Check recent users:

```sql
select id, full_name, access_type, is_guest, created_at
from public.users
order by created_at desc
limit 10;
```

Check guest usage:

```sql
select *
from public.guest_usage
order by updated_at desc
limit 20;
```

Check FCM tokens:

```sql
select user_id, platform, device_name, is_active, created_at
from public.device_tokens
order by created_at desc
limit 20;
```

Check notifications:

```sql
select user_id, notification_type, title, status, created_at
from public.notifications
order by created_at desc
limit 20;
```

Check memory:

```sql
select user_id, agent_name, summary, created_at
from public.memory_entries
order by created_at desc
limit 20;
```

## 23. Backend Debug Checklist

- Backend compiles.
- FastAPI app imports.
- `/health` returns `ok: true`.
- Supabase health returns `ok: true`.
- Guest user can be created.
- Guest access limits work.
- Device token can be saved.
- Notification row can be created.
- DeepSeek returns `source deepseek`.
- Plant Health returns a result with or without YOLOv8 endpoint.
