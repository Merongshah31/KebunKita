# KebunKita Documentation

KebunKita is a smart urban gardening platform for people who want to grow food at home, especially in apartments, balconies, and small spaces. The product combines plant health analysis, daily farming guidance, community harvest exchange, and AI-based decision support into one connected system.

## Product Summary

KebunKita helps users answer four practical gardening questions:

- What is wrong with my plant?
- What should I do today to care for it?
- Who can I share or exchange my harvest with?
- What should I grow next based on my space, budget, and goals?

The system is designed as a live product, not only a prototype. A user interacts with the frontend, the backend runs agent workflows, and the services layer manages storage, database records, AI analysis, and memory.

## Temporary Hackathon-Day Access Plan

For the hackathon day, KebunKita will use a temporary access model so visitors can test the system quickly.

- Free Web App: opened in a browser and uses a temporary guest account.
- Premium Flutter App: full-access mobile experience for complete product flow.
- Guest accounts are only for testing and should not be treated as permanent production accounts.
- The User Access Function table below controls which features each access type can use during the event.

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

## Core Users

- Beginner home growers who need simple plant care instructions.
- Apartment residents with limited space and limited gardening experience.
- Busy users who need reminders and daily care plans.
- Community growers who want to exchange extra harvests.
- Budget-conscious users who need low-cost recommendations.

## Main Product Modules

### Plant Health

Users upload a plant image and optional notes. KebunKita analyzes the image, returns a health status, confidence score, symptoms, treatment plan, recommendation, and memory reference.

### Smart Farming

Users enter plant details and budget context. KebunKita creates daily care tasks with reasons, including watering, leaf checks, progress updates, and budget-aware actions.

### Community Exchange

Users post available harvests with crop name, quantity, and location. KebunKita matches the post with nearby or relevant community users.

### Decision Support

Users ask farming questions. KebunKita responds with recommendations using user context such as budget, timeline, available space, goals, and previous Memory Core history.

## System Architecture

KebunKita follows this structure:

- Frontend: React Web App now, Flutter App planned.
- Backend: FastAPI API server.
- MVP Backend: Supabase Auth, Database, and Storage.
- Push Notification: Firebase Cloud Messaging only.
- Storage: uploaded plant images and generated files in Supabase Storage.
- AI Service: YOLOv8 for plant image analysis and DeepSeek for explanation and fallback.
- Memory Core: stores previous plant analysis, care actions, user preferences, and recommendation history.

See [DOCUMENT.md](DOCUMENT.md) for the full architecture diagram and live request flow.

## Documentation Files

- [FRONTEND.md](FRONTEND.md): frontend structure, screens, and live functions.
- [BACKEND.md](BACKEND.md): backend stack, endpoints, environment variables, and run command.
- [BACKEND_PHASES.md](BACKEND_PHASES.md): ordered backend implementation phases after database setup.
- [BACKEND_DEBUG.md](BACKEND_DEBUG.md): step-by-step backend debugging guide.
- [RENDER_DEPLOY.md](RENDER_DEPLOY.md): Render hosting guide for the backend.
- [DOCUMENT.md](DOCUMENT.md): system architecture and live function flow.
- [ARCHITECTURE.md](ARCHITECTURE.md): detailed technical architecture, layers, services, access control, and deployment shape.
- [DATABASE.md](DATABASE.md): proposed PostgreSQL/Supabase database structure.
- [SUPABASE_SCHEMA.sql](SUPABASE_SCHEMA.sql): runnable SQL schema for Supabase.
- [PRD.md](PRD.md): product requirements document.
- [USERFLOW.md](USERFLOW.md): guest, premium, and feature-level user flows.
- [DESIGN.md](DESIGN.md): frontend visual direction, screen inventory, and UI guidelines.
- [AGENTS.md](AGENTS.md): agent roles, flows, inputs, outputs, memory, and guardrails.
- [AI_SERVICE.md](AI_SERVICE.md): YOLOv8 `plant.pt`, DeepSeek hybrid flow, and AI service deployment guidance.

## Current Development Focus

- Keep the product documentation clean and aligned with the live architecture.
- Connect frontend actions to backend live functions.
- Strengthen backend persistence through Supabase and Memory Core.
- Store Flutter FCM device tokens in Supabase for push notification delivery.
- Add reliable AI fallback behavior when plant diagnosis confidence is low.
- Prepare Firebase Cloud Messaging support for farming reminders and progress updates.

## Local Run

Backend:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm start
```
