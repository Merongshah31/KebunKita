# KebunKita User Flow

## Purpose

This document describes how users move through KebunKita during the temporary hackathon-day setup and in the intended full product flow.

KebunKita has two user access paths:

- Free Web App Guest: opens KebunKita in a browser and receives a temporary guest account with limited access.
- Premium Flutter User: uses the Flutter app and receives full access to the complete KebunKita experience.

## High-Level User Flow

```mermaid
flowchart TD
    Start[User opens KebunKita]
    Access{Access path}
    Web[Free Web App in browser]
    Flutter[Premium Flutter App]
    Guest[Create temporary guest account]
    Full[Use registered or premium app account]
    Home[View KebunKita home]
    Choose{Choose function}
    Plant[Plant Health]
    Smart[Smart Farming]
    Community[Community Exchange]
    Decision[Decision Support]
    Limit[Check access limit]
    Run[Run live function]
    Result[Show result to user]
    Upgrade[Prompt to use Flutter for full access]

    Start --> Access
    Access --> Web
    Access --> Flutter
    Web --> Guest
    Flutter --> Full
    Guest --> Home
    Full --> Home
    Home --> Choose
    Choose --> Plant
    Choose --> Smart
    Choose --> Community
    Choose --> Decision
    Plant --> Limit
    Smart --> Limit
    Community --> Limit
    Decision --> Limit
    Limit --> Run
    Limit --> Upgrade
    Run --> Result
```

## Temporary Guest Account Flow

This flow is used for the free browser Web App during the hackathon day.

1. User opens the KebunKita web app in a browser.
2. System creates a temporary guest account.
3. Guest account stores only the minimum session data needed for testing.
4. User lands on the main KebunKita interface.
5. User selects one of the available functions.
6. System checks the User Access Function limit.
7. If the feature is allowed, the backend runs the live function.
8. If the feature limit is reached, the app shows that Flutter has full access.
9. Guest activity can be cleared after the event.

## Premium Flutter User Flow

This flow is used for the full-access Flutter app.

1. User opens the Flutter app.
2. User signs in or uses the assigned premium event account.
3. User lands on the main KebunKita dashboard.
4. User can access all product modules.
5. User actions are saved to Memory Core and database storage.
6. User can use unlimited Plant Health, Smart Farming, Community Exchange, and Decision Support flows according to the UAF table.
7. User receives full mobile functions such as camera capture, optional video, saved journey album, smart farming save, and push notification support.

## User Access Function Summary

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

## Plant Health Flow

```mermaid
flowchart TD
    Start[Open Plant Health]
    Access{Access allowed?}
    Upload[Upload or capture plant picture]
    Notes[Add optional notes]
    Analyze[Send image to backend]
    AI[Run AI analysis]
    Confidence{Confidence high?}
    Diagnosis[Return diagnosis and treatment]
    Fallback[Return uncertainty or fallback analysis]
    Save[Save result to Memory Core]
    Result[Display result]

    Start --> Access
    Access --> Upload
    Upload --> Notes
    Notes --> Analyze
    Analyze --> AI
    AI --> Confidence
    Confidence --> Diagnosis
    Confidence --> Fallback
    Diagnosis --> Save
    Fallback --> Save
    Save --> Result
```

Free Web App guest limits:

- Upload picture: 1 time.
- Take picture: 1 time.
- Video, journey album, and save to smart farming are not available.

Premium Flutter access:

- Unlimited upload and capture.
- Optional video.
- Save album journey picture.
- Save plant result to Smart Farming.

## Smart Farming Flow

```mermaid
flowchart TD
    Start[Open Smart Farming]
    Access{Access allowed?}
    Plant[Enter or select plant]
    Plan[Generate task time, task name, and reason]
    Notify{Notification available?}
    Push[Send push notification]
    Save[Save plan to Memory Core]
    Result[Display daily care plan]

    Start --> Access
    Access --> Plant
    Plant --> Plan
    Plan --> Notify
    Notify --> Push
    Notify --> Save
    Push --> Save
    Save --> Result
```

Free Web App guest limits:

- Can generate task time, task name, and reason.
- Cannot accept a new plant name as a saved plant profile.
- Cannot receive push notifications.

Premium Flutter access:

- Can accept new plant name.
- Can generate task plan.
- Can receive push notification reminders.

## Community Exchange Flow

```mermaid
flowchart TD
    Start[Open Community Exchange]
    Access{Access allowed?}
    Post[Create harvest post]
    Match[Find matching users]
    Trade{Trade limit available?}
    Confirm[Confirm trade]
    Result[Show match or trade result]

    Start --> Access
    Access --> Post
    Post --> Match
    Match --> Trade
    Trade --> Confirm
    Trade --> Result
    Confirm --> Result
```

Free Web App guest limits:

- Can create a user post.
- Can trade 1 time.

Premium Flutter access:

- Can create posts.
- Can trade unlimited times.

## Decision Support Flow

```mermaid
flowchart TD
    Start[Open Decision Support]
    Access{Message limit available?}
    Ask[User sends chat message]
    Context[Load user context and memory]
    Answer[Generate answer and recommendations]
    Save[Save chat result to Memory Core]
    Result[Display response]
    Limit[Show message limit reached]

    Start --> Access
    Access --> Ask
    Access --> Limit
    Ask --> Context
    Context --> Answer
    Answer --> Save
    Save --> Result
```

Free Web App guest limits:

- Chat message limit: 5 messages.

Premium Flutter access:

- Unlimited chat messages.

## Event-Day Completion Flow

1. User tests one or more features through the free Web App.
2. System stores temporary guest usage counts.
3. If the user reaches a limit, the app explains that Flutter has full access.
4. Team can reset or remove guest data after the event.
5. Product team reviews guest activity to understand which functions users tested most.

## Implementation Notes

- The frontend should create or reuse a guest session for free Web App users.
- The backend should enforce access limits because frontend-only limits can be bypassed.
- Guest accounts should be clearly marked as temporary.
- Premium Flutter access should use a separate access type so limits are easy to check.
- Usage counts should be tracked per account, per function, and per activity.

