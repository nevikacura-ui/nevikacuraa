# Complete Railway + MongoDB Deployment Guide

## ✅ Prerequisites
- GitHub repository with your code
- Railway account (https://railway.app)
- MongoDB Atlas account (https://cloud.mongodb.com)

---

## 📋 Part 1: MongoDB Atlas Setup

### Step 1: Create MongoDB Cluster
1. Go to https://cloud.mongodb.com
2. Click "Build a Database" → Choose "M0 FREE"
3. Select region closest to your Railway deployment
4. Cluster Name: `nevika-cura-prod` (or your choice)
5. Click "Create"

### Step 2: Configure Network Access
1. Left sidebar → "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access From Anywhere" → Add `0.0.0.0/0`
4. Click "Confirm"

### Step 3: Create Database User
1. Left sidebar → "Database Access"
2. Click "Add New Database User"
3. Authentication Method: Password
4. Username: `nevika_admin` (save this)
5. Password: Generate secure password (SAVE THIS!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 4: Get Connection String
1. Go to "Database" → Click "Connect"
2. Choose "Connect your application"
3. Driver: Node.js, Version: 5.5 or later
4. Copy connection string, it looks like:
```
mongodb+srv://nevika_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. Replace `<password>` with your actual password
6. Add database name before `?`, example:
```
mongodb+srv://nevika_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/nevika_cura_prod?retryWrites=true&w=majority
```

---

## 🚀 Part 2: Railway Deployment

### Step 1: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect it's a monorepo with frontend + backend

### Step 2: Configure Backend Service — see Part 8 below for the exact copy-paste variable block

#### Build Command:
```bash
pip install --upgrade pip && pip install -r backend/requirements.txt
```

#### Start Command:
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
```

#### Root Directory:
```
/
```

#### Watch Paths:
```
backend/**
```

### Step 3: Configure Frontend Service — see Part 8 below for the exact copy-paste variable block

#### Build Command:
```bash
cd frontend && yarn install --frozen-lockfile && yarn build
```

#### Start Command:
```bash
cd frontend && yarn global add serve && serve -s build -l $PORT
```

#### Root Directory:
```
/
```

#### Watch Paths:
```
frontend/**
```

---

## 🔧 Part 3: Critical Fixes (already applied in this codebase)

### Fix 1: Backend server.py SPA Routing
Add this at the END of your `backend/server.py` (only needed if you serve frontend build from the backend service; not needed if frontend is a separate Railway service using `serve`):
```python
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse('/app/frontend/build/index.html')
```

### Fix 2: Backend CORS — already fixed in `backend/server.py` + `.env`
```python
cors_origins_str = os.getenv('CORS_ORIGINS', '')
allowed_origins = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()] or ["*"]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```

### Fix 3: Frontend API URL — already using `process.env.REACT_APP_BACKEND_URL` everywhere. Never hardcode.

### Fix 4: MongoDB Connection — already reads `MONGO_URL`/`DB_NAME` from env with no hardcoded fallback.

### Fix 5: Railway nixpacks.toml (place in repo root)
```toml
[phases.setup]
nixPkgs = ["python311", "nodejs-18_x", "yarn"]

[phases.install]
cmds = [
  "pip install --upgrade pip",
  "pip install -r backend/requirements.txt",
  "cd frontend && yarn install --frozen-lockfile"
]

[phases.build]
cmds = ["cd frontend && yarn build"]

[start]
cmd = "cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT"
```

### Fix 6 & 7: `requirements.txt` and `package.json`
Use the versions already committed in this repo (`backend/requirements.txt`, `frontend/package.json`) — do not regenerate from scratch, they already contain every dependency this app needs (Motor, FastAPI, pywebpush, emergentintegrations, etc).

---

## 🌐 Part 4: Custom Domain Setup

### Step 1: Railway Domain Settings
1. Go to your Railway Frontend service → Settings → "Domains"
2. Click "Generate Domain" (you'll get: `your-app.up.railway.app`)
3. Click "Custom Domain" → Add `nevikacura.com`

### Step 2: DNS Configuration (your domain registrar)
```
Type: CNAME, Name: @,   Value: your-app.up.railway.app, TTL: 300
Type: CNAME, Name: www, Value: your-app.up.railway.app, TTL: 300
```
If your registrar doesn't support CNAME on the root (`@`), use the A record IP Railway shows in the dashboard instead.

### Step 3: SSL — Railway auto-provisions via Let's Encrypt. Wait 5-30 min for DNS propagation, then check for the 🔒 icon on https://nevikacura.com

---

## 🧪 Part 5: Verification & Testing

```bash
curl https://your-backend.railway.app/api/health        # expect {"status": "healthy", ...}
curl -I https://nevikacura.com                           # expect HTTP/2 200
```
In browser console on https://nevikacura.com:
```javascript
fetch(process.env.REACT_APP_BACKEND_URL + '/api/health').then(r => r.json()).then(console.log)
```

---

## ⚠️ Common Errors & Fixes

| Error | Fix |
|---|---|
| `ModuleNotFoundError` | Re-check `backend/requirements.txt` was installed |
| Frontend "Failed to fetch" | Check `CORS_ORIGINS` and `REACT_APP_BACKEND_URL` |
| `MongoServerError: bad auth` | Re-check Atlas password in `MONGO_URL`, IP whitelist `0.0.0.0/0` |
| "This site can't be reached" | DNS not propagated yet — check https://dnschecker.org |
| Build fails with `ECONNREFUSED` | Set `CI=false` in Railway frontend env vars |

---

## 📊 Part 6: Monitoring & Logs
Railway → Service → Deployments → Latest deployment → View Logs.
Health endpoint already exists at `/api/health`.

---

## 🎯 Part 7: Production Checklist
- [ ] MongoDB Atlas cluster running, user configured, IP whitelist `0.0.0.0/0`
- [ ] All backend env vars set (see Part 8)
- [ ] `REACT_APP_BACKEND_URL` set on frontend service
- [ ] `CORS_ORIGINS` includes `https://nevikacura.com` and `https://www.nevikacura.com`
- [ ] Custom domain DNS configured + SSL active
- [ ] `/api/health` returns healthy
- [ ] Resend sender domain `nevikacura.com` verified at resend.com/domains (otherwise admin emails fail)
- [ ] Cashfree is already in `production` mode — test a real ₹1 order before full launch
- [ ] JWT_SECRET rotated to a fresh random 32+ char string for production

---

## 🔑 Part 8: Railway Environment Variables — Copy/Paste Ready

See the chat message for the exact copy-paste blocks generated from this app's live `.env` files (backend + frontend), with notes on what must change per-environment (Mongo URL, CORS, callback URLs).

---

## 🚨 Emergency Rollback
1. Railway → Service → Deployments → previous working deployment → "Redeploy"
2. MongoDB: never delete data manually; restore from Atlas backup if needed
3. Keep old DNS records until new deployment is verified

---

**Estimated Deployment Time:** 30-45 minutes (first time)
**Cost:** $0 (Railway Free tier + MongoDB Atlas Free tier, until you scale)
**Last Updated:** August 2026
