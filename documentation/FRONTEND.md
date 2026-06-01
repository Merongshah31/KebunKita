# KebunKita Frontend Document

## Purpose

The frontend is the live user interface for KebunKita. It lets growers upload plant images, create daily care plans, match harvest posts with the community, and ask the farming advisor for recommendations.

## Current App

- Framework: React
- Entry point: `frontend/src/App.js`
- API client: `frontend/src/api/client.js`
- Components:
  - `PlantHealth.js`
  - `SmartFarming.js`
  - `CommunityExchange.js`
  - `DecisionSupport.js`
  - `DebugConsole.js`

## Temporary Hackathon-Day Frontend Access

The free Web App will be opened through a browser and will create a temporary guest account so users can test the system quickly. This access is limited by the User Access Function table.

The Flutter App is treated as the premium access path and receives full access to the complete KebunKita flow.

| Function | Activity | Free Web App Guest | Premium Flutter |
| --- | --- | --- | --- |
| Plant Health | User upload picture | 1 | Unlimited |
| Plant Health | Analyze images | Yes | Yes |
| Plant Health | User take picture | 1 | Unlimited |
| Plant Health | User take video optional | Not available | Yes |
| Plant Health | Save album journey picture | Not available | Yes |
| Plant Health | Save to smart farming | Not available | Yes |
| Smart Farming | Accept plant name new plant | Not available | Yes |
| Smart Farming | Generate task time, task name, reason | Yes | Yes |
| Smart Farming | Push notification | Not available | Yes |
| Community Exchange | User post | Yes | Yes |
| Community Exchange | Trade | 1 | Unlimited |
| Decision Support | Chat message | 5 | Unlimited |

## Live Functions

### Plant Health

- User uploads a plant image.
- Frontend sends multipart form data to `/api/agents/plant-health`.
- Backend returns status, confidence, disease name, symptoms, treatment plan, recommendation, and memory reference.

### Smart Farming

- User enters plant name and optional budget.
- Frontend sends form data to `/api/agents/smart-farming`.
- Backend returns daily tasks, reasons, notification hint, and memory reference.

### Community Exchange

- User posts crop name, quantity, and optional location.
- Frontend sends form data to `/api/agents/community-exchange`.
- Backend returns post id, matched users, match scores, reasons, and memory reference.

### Decision Support

- User sends a farming question.
- Frontend sends form data to `/api/agents/decision-support` with default live context.
- Backend returns answer, recommendations, and memory reference.

## Environment

Set `REACT_APP_API_URL` when the backend is not running on `http://localhost:8000`.

```bash
REACT_APP_API_URL=http://localhost:8000
```

## Run

```bash
cd frontend
npm start
```
