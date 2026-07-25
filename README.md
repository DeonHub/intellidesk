# IntelliDesk

**IntelliDesk** is an AI-powered Automated IT Help Desk Ticketing System. End users submit and track support requests; technicians diagnose and resolve them; managers monitor SLAs and performance; administrators manage users and system access. A Gemini-powered chatbot helps with common issues and guides users to human support when needed.

![IntelliDesk logo](./docs/logo.png)

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript (host on **Netlify**) |
| Backend | Node.js + Express + TypeScript (host on **Render** or **Vercel**) |
| Database | **MongoDB** (Atlas recommended) |
| Auth | JWT + bcrypt |
| AI chatbot | Google Gemini API (optional) |

No Docker is required. Frontend and backend are separate apps.

## Project structure

```
it_helpdesk/
├── backend/          # Express API
├── frontend/         # React SPA
├── docs/             # Documentation & logo
└── README.md
```

## Local setup

### 1. Prerequisites

- Node.js 18+ (20 recommended)
- A MongoDB connection string when you are ready ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas) recommended)
- For local demos without MongoDB installed, set `USE_IN_MEMORY_MONGO=true` in `backend/.env` (data resets when the API stops)

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env — see Environment variables below
npm install
npm run dev
```

API defaults to **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# set VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

App defaults to **http://localhost:5173**

### 4. Demo login credentials

On startup, if `SEED_ON_START` is not `false`, demo users and sample tickets are created/updated.

**Password for all seeded accounts:** `qwertyuiop`

| Role | Email |
|------|-------|
| System Administrator | `admin@intellidesk.app` |
| IT Support Manager | `manager@intellidesk.app` |
| IT Support Technician | `tech1@intellidesk.app` |
| IT Support Technician | `tech2@intellidesk.app` |
| End User | `user1@intellidesk.app` |
| End User | `user2@intellidesk.app` |

End users can also submit a ticket from the landing page without signing up first. New visitors get an account automatically (with a one-time temporary password shown after submit).

Manual seed:

```bash
cd backend
npm run seed
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `4000`) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `GEMINI_API_KEY` | No | Google AI Studio key; without it chat says **not available** |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash` |
| `SEED_ON_START` | No | `true`/`false` (default seeds on start) |
| `NODE_ENV` | No | `development` or `production` |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Backend base URL, e.g. `http://localhost:4000` |

Copy from the `.env.example` files in each folder.

## Roles & features

- **End User** — register/login, submit tickets, track status, comment, rate resolved tickets, use chatbot
- **IT Support Technician** — view queue, claim tickets, update status/priority, escalate, see AI suggestions
- **IT Support Manager** — all tickets, workload report, SLA configuration, satisfaction metrics
- **System Administrator** — create users, change roles, enable/disable accounts

## Deployment

### Frontend → Netlify

1. Build command: `npm run build` (base directory: `frontend`)
2. Publish directory: `dist`
3. Set `VITE_API_URL` to your deployed API URL
4. SPA redirects are in `frontend/netlify.toml`

### Backend → Render

1. New **Web Service** from the `backend` folder
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Add the same env vars as `backend/.env.example`
5. Set `SEED_ON_START=false` after the first successful seed in production

### Backend → Vercel (optional)

Express can run as a serverless function with an entry adapter; **Render is simpler** for a long-running Express + MongoDB API. Prefer Render for this project.

## Documentation

See [`docs/DOCUMENTATION.md`](./docs/DOCUMENTATION.md) for architecture, API reference, and user guides.

## License

Academic / final year project use.
