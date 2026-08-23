# Complete Railway + MongoDB Deployment Guide

## Prerequisites
- GitHub repository with your code
- Railway account (https://railway.app)
- MongoDB Atlas account (https://cloud.mongodb.com)

---

## Part 1: MongoDB Atlas Setup

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
6. Add database name before `?`:
```
mongodb+srv://nevika_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/nevika_cura_prod?retryWrites=true&w=majority
```

---

## Part 2: Railway Deployment

### Step 1: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

### Step 2: Configure Backend Service

#### Environment Variables:
```bash
MONGO_URL=mongodb+srv://nevika_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/nevika_cura_prod?retryWrites=true&w=majority
DB_NAME=nevika_cura_prod
PORT=8001
PYTHON_VERSION=3.11.0
CORS_ORIGINS=https://your-frontend-url.railway.app,https://nevikacura.com
MSG91_AUTH_KEY=your_msg91_key
MSG91_SENDER_ID=NEVIKA
MSG91_TEMPLATE_ID=your_template_id
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

#### Start Command:
```bash
cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Step 3: Configure Frontend Service

#### Environment Variables:
```bash
REACT_APP_BACKEND_URL=https://your-backend-service.railway.app
NODE_VERSION=18.x
CI=false
GENERATE_SOURCEMAP=false
```

#### Build Command:
```bash
cd frontend && yarn install --frozen-lockfile && yarn build
```

#### Start Command:
```bash
cd frontend && yarn global add serve && serve -s build -l $PORT
```

---

## Part 3: Critical Fixes

### Fix 1: SPA Routing (backend/server.py)
Add at END of server.py:
```python
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse('/app/frontend/build/index.html')
```

### Fix 2: CORS Configuration
```python
cors_origins_str = os.getenv('CORS_ORIGINS', '')
allowed_origins = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]
allowed_origins.extend(["http://localhost:3000", "http://localhost:8001"])
```

### Fix 3: nixpacks.toml (Root directory)
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

---

## Part 4: Custom Domain Setup

### DNS Configuration:
```
Type: CNAME, Name: @, Value: your-app.up.railway.app, TTL: 300
Type: CNAME, Name: www, Value: your-app.up.railway.app, TTL: 300
```

Railway auto-provisions SSL via Let's Encrypt.

---

## Part 5: Production Checklist

- [ ] MongoDB Atlas cluster running
- [ ] MongoDB user permissions correct
- [ ] IP whitelist includes 0.0.0.0/0
- [ ] All backend env vars set
- [ ] REACT_APP_BACKEND_URL correct
- [ ] CORS includes custom domain
- [ ] SPA fallback route is LAST
- [ ] Custom domain DNS configured
- [ ] SSL certificate active
- [ ] Health endpoint returns "healthy"
- [ ] All API calls work from frontend
- [ ] Auth works, DB operations work
- [ ] No console errors
- [ ] Mobile responsive

---

**Estimated Time:** 30-45 minutes (first time)
**Cost:** $0 (Free tiers)
**Last Updated:** February 2026
