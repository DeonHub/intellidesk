# Deploy IntelliDesk (GitHub → Render + Netlify)

## 1. GitHub

Repository should contain `frontend/` and `backend/` (no `.env` files).

## 2. Backend on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect the GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Environment variables:

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string |
| `CORS_ORIGINS` | Your Netlify URL, e.g. `https://something.netlify.app` |
| `SEED_ON_START` | `true` once, then `false` |
| `USE_IN_MEMORY_MONGO` | `false` |
| `GEMINI_API_KEY` | Optional |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `NODE_ENV` | `production` |

5. Deploy → copy the service URL (e.g. `https://intellidesk-api.onrender.com`)

Free Render services sleep after inactivity; the first request may be slow.

## 3. Frontend on Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect the same GitHub repo
3. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Environment variable:
   - `VITE_API_URL` = your Render API URL (no trailing slash)
5. Deploy

`frontend/netlify.toml` already handles SPA redirects.

## 4. Wire them together

1. Set Render `CORS_ORIGINS` to the Netlify URL
2. Redeploy API if needed
3. Confirm `VITE_API_URL` on Netlify matches the API
4. Open the Netlify site and test login / quick ticket submit

## MongoDB Atlas (required for production)

1. Create a free cluster at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Database Access → create a user
3. Network Access → allow `0.0.0.0/0` (or Render IPs)
4. Connect → Drivers → copy URI into Render `MONGODB_URI`
