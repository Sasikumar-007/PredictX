# PredictX Deployment Guide

This guide covers running both servers **locally** and deploying to **Render (Backend)** and **Vercel (Frontend)**.

---

## 1. Running Both Servers Locally

You can run both servers either using the provided 1-click launcher scripts or manually in two separate terminal tabs.

### Option A: 1-Click Launchers (Easiest)
- **Windows Batch**: Double-click [run_dev.bat](file:///c:/Users/Sasikumar%20baskar/Downloads/PredictX/run_dev.bat)
- **PowerShell**: Run `./run_dev.ps1`

Both commands will automatically launch the backend and frontend in separate dedicated windows.

### Option B: Manual Terminal Execution

#### Terminal 1 — Backend (FastAPI)
Run from the project root:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Or from the `backend/` directory:
```powershell
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend URL**: `http://127.0.0.1:8000`
- **Interactive API Docs (Swagger)**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/health`

#### Terminal 2 — Frontend (React + Vite)
Run from the `frontend/` directory:
```powershell
cd frontend
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- *Note*: Vite is configured to automatically proxy `/api` requests to `http://127.0.0.1:8000`.

---

## 2. Deploying the Backend to Render

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Web Service**.
4. Select your `PredictX` repository.
5. Configure the service:
   - **Name**: `predictx-backend`
   - **Language / Runtime**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free tier
6. Under **Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `ENVIRONMENT`: `production`
   - `PORT`: `10000` (Render sets this automatically)
   - `SUPABASE_URL`: `https://<your-project-id>.supabase.co` *(Optional, for cloud persistence)*
   - `SUPABASE_KEY`: `<your-supabase-anon-or-service-key>` *(Optional, for cloud persistence)*

---

## 2.5 Setting up Supabase Database (Optional for Cloud Persistence)

Render free tier instances have ephemeral disks (SQLite restarts with fresh storage). To persist your uploaded datasets and analysis histories across deployments:
1. Create a free project at [Supabase](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the entire contents of [`supabase_schema.sql`](file:///c:/Users/Sasikumar%20baskar/Downloads/PredictX/supabase_schema.sql) and paste into the editor.
4. Click **Run**.
5. Go to **Project Settings** -> **API**, copy your **Project URL** and **anon/public API key**.
6. Paste them into Render as `SUPABASE_URL` and `SUPABASE_KEY`.
7. Click **Create Web Service**.
8. Once deployed, copy your Render service URL (e.g., `https://predictx-backend.onrender.com`).

> **Tip**: Alternatively, Render can auto-configure using the included `render.yaml` file via **New +** -> **Blueprint**.

---

## 3. Deploying the Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `PredictX` repository.
4. In the Project Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. In **Environment Variables** (Optional):
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://<your-render-backend-url>/api` *(e.g., `https://predictx-tczk.onrender.com/api`)*
   - *Note*: This is optional. The included `vercel.json` automatically proxies `/api` requests directly to Render. If you do set this variable in Vercel, ensure it is pasted as a single line without duplicate URLs.
6. Click **Deploy**.
7. Once finished, your application will be live at `https://<your-project>.vercel.app`.
