# KebunKita Backend Phases

## Purpose

This document defines the backend implementation phases after the Supabase database schema is ready.

MVP backend direction:

- Supabase: Auth, PostgreSQL Database, Storage.
- Firebase Cloud Messaging: push notification delivery only.
- Backend function layer: Supabase Edge Functions, Laravel, or FastAPI for protected workflows, AI calls, and FCM dispatch.

## Phase 0: Backend Setup Confirmation

Goal:

Confirm the backend foundation is ready before building feature logic.

Tasks:

- Confirm `SUPABASE_SCHEMA.sql` has been executed in Supabase.
- Confirm tables exist in Supabase.
- Confirm storage buckets exist:
  - `plant-images`
  - `community-media`
  - `marketplace-media`
  - `avatars`
- Confirm RLS policies are enabled.
- Prepare environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `YOLOV8_ENDPOINT`
  - `DEEPSEEK_API_KEY`

Definition of done:

- Supabase tables, storage buckets, and auth trigger are ready.
- Backend can connect to Supabase using service role key.

## Phase 1: Supabase Connection Layer

Goal:

Create a stable backend connection to Supabase.

Tasks:

- Configure Supabase client in backend.
- Create reusable helpers for:
  - select
  - insert
  - update
  - upload file
  - signed/public file URL
- Add health check for Supabase connection.
- Add safe error handling for Supabase failures.

Backend files likely involved:

- `backend/lib/supabase_client.py`
- `backend/main.py`
- `backend/.env.example`

Definition of done:

- Backend can read/write a test row.
- Backend can upload a test file to Supabase Storage.
- `/health` can report backend and Supabase status.

## Phase 2: Auth and User Profile

Goal:

Support user identity for Flutter and temporary guest access for Web App.

Tasks:

- Verify Supabase Auth creates matching `public.users` row.
- Add backend helper to resolve current user.
- Support permanent users from Flutter login.
- Support temporary guest account creation for Free Web App.
- Store guest expiration time.
- Return user profile and access type to frontend.

Tables:

- `users`
- `guest_usage`

Suggested endpoints:

- `POST /api/auth/guest`
- `GET /api/users/me`
- `PATCH /api/users/me`

Definition of done:

- Flutter user can be identified by Supabase user id.
- Browser guest can be created and tracked.
- Backend can tell whether user is guest, free, premium, or admin.

## Phase 3: Access Limit Enforcement

Goal:

Enforce the temporary User Access Function table on the backend.

Tasks:

- Create access check middleware or helper.
- Store usage count in `guest_usage`.
- Increment usage after successful action.
- Block guest action when limit is reached.
- Let premium Flutter users bypass guest limits.
- Return friendly structured error for limit reached.

Access limits:

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

Definition of done:

- Guest limits are enforced server-side.
- Premium Flutter access is unlimited for allowed features.
- Limit response is consistent for frontend.

## Phase 4: Garden and Plant Care Backend

Goal:

Power My Garden, Add New Plant, Crop Details, Log Water, and care reminders.

Tasks:

- Create plant CRUD.
- Upload plant photo to Supabase Storage.
- Save plant media.
- Create care tasks.
- Create care history.
- Update growth percentage and next watering.
- Return dashboard summary.

Tables:

- `plants`
- `plant_media`
- `care_tasks`
- `care_history`

Suggested endpoints:

- `GET /api/plants`
- `POST /api/plants`
- `GET /api/plants/{plant_id}`
- `PATCH /api/plants/{plant_id}`
- `POST /api/plants/{plant_id}/media`
- `POST /api/plants/{plant_id}/water`
- `GET /api/care-tasks`

Definition of done:

- User can add a plant.
- User can view My Garden.
- User can log water and see care history.

## Phase 5: Plant Health and AI Diagnosis Backend

Goal:

Connect camera/upload diagnosis to AI and store diagnosis history.

Tasks:

- Accept image upload.
- Upload diagnosis image to Supabase Storage.
- Call YOLOv8 endpoint.
- Use DeepSeek fallback when confidence is low.
- Save result to `plant_diagnoses`.
- Save agent memory to `memory_entries`.
- Return structured diagnosis result.

Tables:

- `plant_diagnoses`
- `memory_entries`
- `plant_media` optional

Existing agent:

- `PlantHealthAgent`

Suggested endpoints:

- `POST /api/agents/plant-health`
- `GET /api/plants/{plant_id}/diagnoses`

Definition of done:

- User can upload/capture a plant image.
- Backend returns status, confidence, symptoms, treatment plan, and recommendation.
- Low-confidence cases return uncertainty or fallback analysis.

## Phase 6: Smart Farming Backend

Goal:

Generate care tasks and connect them to garden records.

Tasks:

- Generate tasks from plant name, plant profile, budget, and care settings.
- Save generated tasks to `care_tasks`.
- Save agent memory to `memory_entries`.
- Prepare notification rows for future reminders.
- Support smart care guide data for frontend.

Tables:

- `care_tasks`
- `plants`
- `notifications`
- `memory_entries`

Existing agent:

- `SmartFarmingAgent`

Suggested endpoints:

- `POST /api/agents/smart-farming`
- `POST /api/plants/{plant_id}/care-plan`

Definition of done:

- Backend generates task time, task name, and reason.
- Tasks appear in My Garden or Crop Details.
- Notification records can be created for reminder tasks.

## Phase 7: Community Feed Backend

Goal:

Support feed posts, media, comments, reactions, and solutions.

Tasks:

- Create community post.
- Upload post media.
- List feed posts.
- Add comments and suggested solutions.
- Add likes/saves.
- Support public community reading.

Tables:

- `community_posts`
- `post_media`
- `post_comments`
- `post_reactions`
- `communities`
- `community_members`

Suggested endpoints:

- `GET /api/feed`
- `POST /api/feed`
- `POST /api/feed/{post_id}/media`
- `POST /api/feed/{post_id}/comments`
- `POST /api/feed/{post_id}/reactions`

Definition of done:

- User can post harvest/question/advice/progress.
- Feed can display posts with media and interaction counts.

## Phase 8: Marketplace, Barter, and Chat Backend

Goal:

Support marketplace listings, listing details, barter offers, trade completion, and chat messages.

Tasks:

- Create marketplace listing.
- Upload listing media.
- List active marketplace items.
- Show listing details.
- Create barter trade.
- Store chat messages.
- Complete trade.
- Create trade update notifications.

Tables:

- `marketplace_listings`
- `listing_media`
- `trades`
- `chat_messages`
- `notifications`

Suggested endpoints:

- `GET /api/marketplace`
- `POST /api/marketplace`
- `GET /api/marketplace/{listing_id}`
- `POST /api/trades`
- `PATCH /api/trades/{trade_id}`
- `GET /api/trades/{trade_id}/messages`
- `POST /api/trades/{trade_id}/messages`

Definition of done:

- User can browse produce.
- User can start barter.
- Trade conversation can be stored.
- Trade can be marked completed.

## Phase 9: Firebase Cloud Messaging Backend

Goal:

Deliver push notifications to Flutter using FCM only.

Tasks:

- Save FCM device token from Flutter into `device_tokens`.
- Create notification records in `notifications`.
- Add backend function to send FCM message.
- Update notification status after FCM response.
- Handle invalid or expired tokens.

Tables:

- `device_tokens`
- `notifications`

Suggested endpoints:

- `POST /api/device-tokens`
- `DELETE /api/device-tokens/{token_id}`
- `POST /api/notifications/send`

Notification flow:

1. User logs in through Flutter.
2. Flutter gets FCM device token.
3. Flutter saves token into Supabase.
4. Backend creates notification row.
5. Supabase Edge Function, Laravel backend, or FastAPI sends request to FCM.
6. FCM delivers push to user device.

Definition of done:

- Flutter can register FCM token.
- Backend can send a test push notification.
- Notification status is updated after send.

## Phase 10: Memory Core Persistence

Goal:

Move agent memory from development fallback into Supabase.

Tasks:

- Save each agent output to `memory_entries`.
- Retrieve user memory by agent and recent history.
- Add summaries for important memories.
- Optional: connect Pinecone for semantic search later.

Tables:

- `memory_entries`
- `agent_runs` optional

Definition of done:

- Plant Health, Smart Farming, Community Exchange, and Decision Support all save useful memory.
- Decision Support can reuse past context.

## Phase 11: Testing and Demo Readiness

Goal:

Make backend stable for frontend and Flutter integration.

Tasks:

- Add endpoint tests.
- Add access-limit tests.
- Add Supabase insert/read tests.
- Add upload tests.
- Add FCM token save test.
- Add AI fallback tests.
- Prepare test users:
  - guest web user
  - premium Flutter user
  - admin/debug user

Definition of done:

- Backend can run without breaking demo flows.
- Main flows return predictable structured responses.
- Limit behavior is clear and stable.

## Recommended Build Order

1. Phase 0: Backend Setup Confirmation
2. Phase 1: Supabase Connection Layer
3. Phase 2: Auth and User Profile
4. Phase 3: Access Limit Enforcement
5. Phase 4: Garden and Plant Care Backend
6. Phase 5: Plant Health and AI Diagnosis Backend
7. Phase 6: Smart Farming Backend
8. Phase 9: Firebase Cloud Messaging Backend
9. Phase 7: Community Feed Backend
10. Phase 8: Marketplace, Barter, and Chat Backend
11. Phase 10: Memory Core Persistence
12. Phase 11: Testing and Demo Readiness

## MVP Cut Line

Minimum backend for a useful demo:

- Supabase connection.
- Guest and premium user handling.
- Access limit enforcement.
- Plant Health diagnosis.
- My Garden add/list/log water.
- Smart Farming task generation.
- FCM token save and one test notification.
- Memory save for agent results.

Can move after MVP:

- Full community feed interactions.
- Full marketplace filters.
- Full barter chat.
- Pinecone semantic memory.
- Admin dashboard.
