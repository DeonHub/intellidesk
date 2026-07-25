# IntelliDesk — Project Documentation

## 1. Introduction

Many organizations struggle with slow, unstructured IT support. **IntelliDesk** is an automated IT help desk ticketing platform that combines:

1. Self-service ticket submission and tracking  
2. Role-based workflows for technicians, managers, and administrators  
3. Optional AI assistance (Google Gemini) for common troubleshooting  
4. Human intervention for complex or escalated issues  

**Case study focus:** staff face daily IT problems (network, email, accounts, software). IntelliDesk shortens time-to-resolution by guiding users quickly and routing remaining work to the right humans.

## 2. Objectives

- Provide a single portal for reporting and tracking IT issues  
- Automate first-line guidance with an AI chatbot when configured  
- Support SLA-aware ticket handling  
- Enable managers to monitor workload and satisfaction  
- Allow administrators to manage users and permissions securely  

## 3. System architecture

```
Browser (Netlify)
    │  HTTPS / REST JSON
    ▼
Express API (Render / local)
    │
    ├── MongoDB (Atlas / local)
    └── Gemini API (optional)
```

- **Frontend:** React SPA with client-side routing  
- **Backend:** Stateless REST API authenticated with JWT  
- **Database:** MongoDB collections for users, tickets, feedback, SLA configs  

## 4. User roles

| Role | Responsibilities |
|------|------------------|
| End User | Submit tickets, track status, comment, provide feedback |
| IT Support Technician | Diagnose/resolve issues, update progress, escalate |
| IT Support Manager | Monitor team performance, manage SLAs, review reports |
| System Administrator | Manage users/permissions, configure system, security |

## 5. Core workflows

### 5.1 Ticket lifecycle

`open` → `in_progress` → `awaiting_user` (optional) → `resolved` → `closed`  
Escalation path: any active state → `escalated` (priority raised, manager notified via assignment field)

### 5.2 AI + human model

1. User asks the chatbot about a common issue  
2. If Gemini is configured, AI returns step-by-step guidance  
3. If Gemini is **not** configured or fails, the API responds that the chatbot is **not available** and the user should open a ticket  
4. On ticket creation, when Gemini is available, an AI suggested plan is stored for technicians  

### 5.3 Feedback

Only the ticket owner can rate a ticket after it is `resolved` or `closed` (one feedback per ticket).

## 6. Data models (MongoDB)

### User

- name, email (unique), password (hashed), role, department, isActive  

### Ticket

- ticketNumber, title, description, category, priority, status  
- createdBy, assignedTo, escalatedTo  
- slaDueAt, resolvedAt, closedAt  
- aiSuggestedResolution, updates[]  

### Feedback

- ticket (unique), user, rating (1–5), comment  

### SlaConfig

- priority, responseHours, resolutionHours, isActive  

## 7. API reference

Base URL: `VITE_API_URL` (local default `http://localhost:4000`)

### Health

- `GET /api/health` — status + Gemini availability  

### Auth

- `POST /api/auth/register` — `{ name, email, password, department? }`  
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`  
- `GET /api/auth/me` — Bearer token required  

### Tickets

- `POST /api/tickets/quick` — public landing-page submit (creates end-user account if needed)  
- `GET /api/tickets` — role-filtered list  
- `GET /api/tickets/:id`  
- `POST /api/tickets` — create (authenticated)  
- `PATCH /api/tickets/:id` — staff update  
- `POST /api/tickets/:id/escalate` — staff  
- `POST /api/tickets/:id/comment`  

### Users (admin/manager)

- `GET /api/users`  
- `GET /api/users/technicians`  
- `POST /api/users` — admin  
- `PATCH /api/users/:id` — admin  

### Feedback

- `POST /api/feedback`  
- `GET /api/feedback` — manager/admin  

### Reports

- `GET /api/reports/overview`  
- `GET /api/reports/sla`  
- `PUT /api/reports/sla`  

### Chat

- `GET /api/chat/status`  
- `POST /api/chat` — `{ message, history? }`  

## 8. Security notes

- Passwords hashed with bcrypt  
- JWT required for protected routes  
- Role checks via middleware (`authorize`)  
- Secrets only in environment variables — never commit `.env`  
- Disable demo seeding in production after first run  

## 9. Hosting guide (summary)

1. Create a MongoDB Atlas cluster and copy the URI into `MONGODB_URI`  
2. Deploy backend to Render with env vars from `backend/.env.example`  
3. Deploy frontend to Netlify with `VITE_API_URL` pointing at the API  
4. Add your Netlify URL to `CORS_ORIGINS`  
5. Optionally add `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)  

## 10. Testing checklist

- [ ] Login as each seeded role  
- [ ] End user creates a ticket and comments  
- [ ] Technician claims ticket, updates status, escalates  
- [ ] Manager views overview and edits SLA hours  
- [ ] Admin creates a user and disables an account  
- [ ] End user submits feedback on a resolved ticket  
- [ ] Chatbot works with key, or clearly says **not available** without it  

## 11. Demo accounts

All passwords: `qwertyuiop`

- `admin@intellidesk.app`  
- `manager@intellidesk.app`  
- `tech1@intellidesk.app` / `tech2@intellidesk.app`  
- `user1@intellidesk.app` / `user2@intellidesk.app`  
