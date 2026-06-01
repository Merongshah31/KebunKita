# KebunKita Frontend — API Reference & Error Codes

Quick reference for all API endpoints, request/response formats, and error codes.

## Base URL
```
http://localhost:8000  (dev)
https://api.kebunkita.example.com  (production)
```

## Common Response Fields
All agent endpoints return:
```json
{
  "status": "healthy|diseased|pending",
  "memory_ref": "user:alice:plant_health:uuid",
  "confidence": 0.85,
  "timestamp": "2026-05-16T10:00:00Z"
}
```

---

## 1. Plant Health Agent
**Endpoint:** `POST /api/agents/plant-health`

### Request
```json
{
  "user_id": "user:alice",
  "image_name": "leaf.jpg",
  "image": <binary file>,
  "notes": "Wilting leaves, brown spots"
}
```
**Note:** Use `multipart/form-data` content type (FormData in frontend)

### Response (Success - 200)
```json
{
  "status": "diseased",
  "disease_name": "Bacterial Wilt",
  "confidence": 0.92,
  "symptoms": "Wilting, yellowing, stem rot",
  "treatment_plan": "Remove affected plants, apply copper fungicide, improve drainage",
  "recommendation": "Isolate plant, treat with approved fungicide",
  "memory_ref": "user:alice:plant_health:abc123"
}
```

### Error Responses
| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | `Field 'user_id' is required` | Missing user_id | Add user ID to input |
| 400 | `Field 'image' is required` | No file uploaded | Select an image file |
| 413 | `File size exceeds limit` | Image > 10MB | Use smaller image |
| 422 | `Unsupported file type` | Not JPG/PNG | Convert to JPG or PNG |
| 500 | `YOLOv8 endpoint error: Connection refused` | Backend YOLOV8_ENDPOINT not configured | Set env var and restart backend |
| 500 | `DeepSeek API error: Invalid API key` | DEEPSEEK_API_KEY incorrect | Check backend `.env` |

---

## 2. Smart Farming Agent
**Endpoint:** `POST /api/agents/smart-farming`

### Request
```json
{
  "user_id": "user:alice",
  "crop_type": "Tomato",
  "area_size": 2.5,
  "soil_type": "Clay loam",
  "water_source": "Irrigation"
}
```

### Response (Success - 200)
```json
{
  "plan": "Plant in rows 60cm apart; fertilize every 2 weeks with balanced NPK; water deeply 3x weekly",
  "estimated_yield": "15-20 tons/hectare",
  "crop_type": "Tomato",
  "area_size": 2.5,
  "telegram_hint": "Progress updates will be sent via Telegram (configure webhook)",
  "memory_ref": "user:alice:smart_farming:def456"
}
```

### Error Responses
| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | `Field 'crop_type' is required` | Missing crop type | Enter a crop name |
| 400 | `Field 'area_size' is required` | Missing area size | Enter area in hectares |
| 400 | `Invalid area_size (must be number)` | Non-numeric input | Enter a number, e.g., 2.5 |
| 500 | `Ollama not responding` | OLLAMA_BASE_URL not configured or server down | Check env var, restart Ollama |

---

## 3. Community Exchange Agent
**Endpoint:** `POST /api/agents/community-exchange`

### Request
```json
{
  "user_id": "user:alice",
  "crop_name": "Tomato",
  "quantity": "50kg",
  "location": "Selangor"
}
```

### Response (Success - 200)
```json
{
  "match_status": "matched",
  "matched_farms": 3,
  "contact_info": "farmer:bob@example.com, farmer:charlie@example.com",
  "crops": ["Carrot", "Spinach"],
  "memory_ref": "user:alice:community_exchange:ghi789"
}
```

### Error Responses
| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | `Field 'crop_name' is required` | Missing crop name | Enter crop name |
| 400 | `Field 'quantity' is required` | Missing quantity | Enter quantity, e.g., "50kg" |
| 404 | `No matching farms found` | No farmers growing requested crops | Try a different crop or location |

---

## 4. Decision Support (Chat)
**Endpoint:** `POST /api/agents/decision-support`

### Request
```json
{
  "user_id": "user:alice",
  "question": "How do I prevent root rot?",
  "context": "user: Hello\nassistant: Hi there!"
}
```

### Response (Success - 200)
```json
{
  "answer": "Root rot is caused by overwatering and poor drainage. Solutions: 1) Reduce watering frequency, 2) Improve soil drainage by adding compost, 3) Use well-draining pots, 4) Avoid standing water.",
  "confidence": 0.87,
  "symptoms": "Root discoloration, wilting despite moist soil",
  "treatment_plan": "Reduce water frequency, improve drainage, consider repotting",
  "recommendation": "Monitor soil moisture; adjust watering schedule",
  "memory_ref": "user:alice:decision_support:jkl012"
}
```

### Error Responses
| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | `Field 'user_id' is required` | Missing user_id | Add user ID |
| 400 | `Field 'question' is required` | Empty question | Type a question |
| 500 | `DeepSeek connection timeout` | DeepSeek API slow or down | Increase timeout or retry |
| 503 | `Guardrail triggered: off-topic question` | Question not about farming | Ask farming-related questions |

---

## 5. Memory Lookup
**Endpoint:** `GET /api/agents/memory/{user_id}`

### Request
```
GET /api/agents/memory/user:alice
```

### Response (Success - 200)
```json
{
  "user_id": "user:alice",
  "memories": [
    {
      "agent_name": "plant_health",
      "payload": {"disease": "Bacterial Wilt", "confidence": 0.92, "timestamp": "2026-05-16T10:00:00Z"}
    },
    {
      "agent_name": "smart_farming",
      "payload": {"crop": "Tomato", "plan": "...", "timestamp": "2026-05-16T10:15:00Z"}
    }
  ]
}
```

### Error Responses
| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 404 | `No memories found for user` | User has no stored memories | Make a request with one of the agents first |

---

## 6. Guardrails (Debug)
**Endpoint:** `GET /api/agents/guardrails`

### Response
```json
{
  "env_status": {
    "YOLOV8_ENDPOINT": false,
    "DEEPSEEK_API_KEY": false,
    "OLLAMA_BASE_URL": true
  },
  "guardrail_rules": [
    "Confidence score must be >= 0.5 to return diagnosis",
    "Responses must include treatment recommendations",
    "Off-topic questions are refused"
  ],
  "fallback_paths": {
    "vision": ["YOLOv8 endpoint", "local heuristic fallback"],
    "llm": ["DeepSeek", "Ollama", "local safe fallback"]
  },
  "memory_policy": "Store plant history, prior disease analysis, recommendations, and farming activity only.",
  "review_policy": "If confidence is low or evidence is missing, return uncertainty and request more data."
}
```

---

## 7. Health Check
**Endpoint:** `GET /health`

### Response
```json
{
  "status": "ok",
  "version": "1.0.0",
  "env_status": {
    "YOLOV8_ENDPOINT": false,
    "DEEPSEEK_API_KEY": false,
    "OLLAMA_BASE_URL": true
  }
}
```

---

## Error Code Reference

### HTTP Status Codes
- **200** — Success
- **400** — Bad request (missing/invalid field)
- **404** — Not found (user, memory, or resource)
- **413** — File too large
- **422** — Validation error (invalid type)
- **500** — Server error (backend, AI service, env var issue)
- **503** — Service unavailable (external API down)

### Common Error Messages
- `Connection refused` — Backend not running or wrong URL
- `API key invalid` — Check DEEPSEEK_API_KEY or OPENAI_API_KEY
- `Endpoint not responding` — YOLOv8 server down or misconfigured
- `Timeout after 30s` — Request took too long; increase timeout or check server
- `Guardrail triggered` — Response violates safety rules (hallucination, off-topic, etc.)

---

## Frontend Error Handling Example

```javascript
try {
  const response = await apiService.analyzePlant(userId, imageName, imageFile, notes);
  console.log('Success:', response.data);
} catch (error) {
  const debugInfo = error.debugInfo;
  console.error(`Error ${debugInfo.status}: ${debugInfo.message}`);
  
  // Handle specific errors
  if (debugInfo.status === 400) {
    alert('Invalid input. Check that all required fields are filled.');
  } else if (debugInfo.status === 413) {
    alert('Image file is too large. Please use a smaller image.');
  } else if (debugInfo.status === 500) {
    alert('Server error. Check that the backend is running and env vars are configured.');
  } else {
    alert(`Error: ${debugInfo.message}`);
  }
}
```

---

## Testing with cURL

### Test Plant Health (requires image file)
```bash
curl -X POST http://localhost:8000/api/agents/plant-health \
  -F "user_id=test:user" \
  -F "image_name=test.jpg" \
  -F "image=@./test_plant.jpg" \
  -F "notes=Test image"
```

### Test Smart Farming
```bash
curl -X POST http://localhost:8000/api/agents/smart-farming \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test:user","crop_type":"Tomato","area_size":2.5,"soil_type":"Clay","water_source":"Rain"}'
```

### Test Decision Support
```bash
curl -X POST http://localhost:8000/api/agents/decision-support \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test:user","question":"How to grow tomatoes?","context":""}' \
  | jq .
```

### Check Backend Health
```bash
curl http://localhost:8000/health | jq .
```

### View Guardrails
```bash
curl http://localhost:8000/api/agents/guardrails | jq .
```

---

## Frontend Checklist Before Deployment

- [ ] Set `REACT_APP_API_URL` to production backend URL
- [ ] Test all 4 agents with sample data
- [ ] Verify error messages are user-friendly
- [ ] Check Debug Console logs for missing env vars
- [ ] Test memory retrieval (`GET /api/agents/memory/{userId}`)
- [ ] Confirm guardrails endpoint returns expected status
- [ ] Test image upload with various file sizes
- [ ] Test chat with multi-turn conversation
- [ ] Verify mobile responsiveness
- [ ] Check backend `.env` has all required keys before deploying

