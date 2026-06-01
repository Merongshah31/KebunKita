# KebunKita Product Requirements Document

## 1. Product Name

KebunKita

## 2. Product Vision

KebunKita helps urban residents grow food confidently at home by combining AI plant diagnosis, daily care planning, community exchange, and personalized recommendations.

## 3. Problem Statement

Many people want to grow food at home but struggle with limited space, lack of gardening knowledge, inconsistent care routines, plant diseases, and wasted harvests. Generic gardening content is often too broad and does not adapt to user budget, local space, or previous plant history.

## 4. Target Users

- Beginner gardeners with little or no plant care knowledge.
- Apartment and balcony growers.
- Busy users who need guided daily actions.
- Users with limited budgets.
- Community growers who want to share or exchange harvests.

## 5. Goals

- Help users diagnose plant health problems from images.
- Provide simple daily care tasks for each plant.
- Recommend crops and actions based on budget, timeline, space, and goals.
- Support harvest sharing through community matching.
- Store useful history so recommendations improve over time.

## 6. Non-Goals

- KebunKita is not a replacement for professional agricultural inspection.
- KebunKita does not guarantee crop yield.
- KebunKita does not provide medical, chemical safety, or legal advice.
- KebunKita should not guess when AI confidence is weak.

## 7. Temporary Hackathon-Day Access Model

For the hackathon day, KebunKita will support two access levels:

- Free Web App Guest: browser-based access with a temporary guest account and limited usage.
- Premium Flutter: full-access app experience with unlimited usage for supported features.

This model is temporary and is intended for testing, judging, and demonstration during the event.

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

## 8. Core Features

### 8.1 Plant Health Analysis

User story:

As a grower, I want to upload a plant image so I can understand whether my plant is healthy or diseased.

Requirements:

- Accept image upload from the frontend.
- Return health status: healthy, diseased, or unknown.
- Return confidence score.
- Return disease name when available.
- Return symptoms and treatment plan.
- Store analysis in Memory Core.
- Use fallback analysis when vision confidence is low.

### 8.2 Smart Farming Plan

User story:

As a grower, I want daily plant care tasks so I know what to do without guessing.

Requirements:

- Accept plant name and optional budget.
- Generate care tasks with time, task name, and reason.
- Include budget-aware guidance when budget is low.
- Store generated plans in Memory Core.
- Support future notification integration.

### 8.3 Community Exchange

User story:

As a grower, I want to post extra harvests so I can share or exchange them with nearby users.

Requirements:

- Accept crop title, quantity, and optional location.
- Return matched users with score and reason.
- Store exchange activity in Memory Core.
- Support future location-based matching.

### 8.4 Decision Support

User story:

As a grower, I want to ask farming questions and receive recommendations based on my situation.

Requirements:

- Accept budget, timeline, space, goal, and optional chat message.
- Return direct answer and recommendation list.
- Reuse Memory Core history when available.
- Use guardrails to avoid unsupported claims.

## 9. Architecture Requirements

- Frontend must call backend APIs for all live functions.
- Backend must validate requests through Pydantic/FastAPI models.
- Backend must store important agent outputs in Memory Core.
- AI service must support image diagnosis and fallback explanation.
- MVP backend should use Supabase for Auth, Database, and Storage.
- Firebase Cloud Messaging should be used for push notifications only.
- Storage should support uploaded plant images through Supabase Storage.
- Access limits must be enforced for temporary guest accounts.

## 10. AI Guardrails

- If confidence is low, return uncertainty instead of forcing a diagnosis.
- Recommendations must be based on image result, user input, memory, or approved fallback logic.
- Treatment suggestions should be practical and clearly framed as guidance.
- The system should preserve user privacy and avoid unnecessary personal data in notifications or logs.

## 11. Success Metrics

- Users can complete plant diagnosis from upload to result.
- Users can generate a care plan in one flow.
- Users can create a harvest exchange post and receive matches.
- Users can ask a question and receive a useful recommendation.
- Backend health endpoint remains available.
- Agent responses are stored in Memory Core.

## 12. MVP Scope

Included:

- React web frontend.
- Flutter app connected to Supabase.
- FastAPI backend.
- Supabase Auth, Database, and Storage as the main backend platform.
- Firebase Cloud Messaging for push notifications only.
- Plant Health, Smart Farming, Community Exchange, and Decision Support flows.
- Memory Core storage path.
- AI service hooks and fallback behavior.
- Basic documentation for frontend, backend, architecture, and product requirements.

Not included yet:

- Full Flutter mobile app implementation.
- Production authentication.
- Payment system.
- Advanced location-based community marketplace.
- Full production monitoring dashboard.

## 13. Open Questions

- Which backend function layer will send FCM requests: Supabase Edge Functions, Laravel, or FastAPI?
- What plant disease dataset will be used for the first production model?
- How long should temporary guest accounts remain active after the event?
