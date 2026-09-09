# 🚀 Maceral AI - Production Deployment Guide
### Complete Setup: Supabase (Database) + Render (Backend) + Vercel (Frontend)

This guide walks you through deploying **Maceral AI** to the cloud so that you have a live, single production website accessible worldwide.

---

## 🏗️ Architecture Overview

| Layer | Provider | Free Tier Available? | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | [Supabase](https://supabase.com) | ✅ Yes (Free 500MB PostgreSQL) | Stores users, coal mines, RAG chunks, and compliance scores |
| **Backend API** | [Render](https://render.com) | ✅ Yes (Free Web Service) | Runs FastAPI, Groq extraction engine, and OCR |
| **Frontend** | [Vercel](https://vercel.com) | ✅ Yes (Free Global Edge CDN) | Serves the React + Vite UI at your `.vercel.app` or custom domain |

---

## Step 1: Set Up Supabase Database (PostgreSQL)

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**:
   - **Name:** `maceral-ai-db`
   - **Database Password:** Enter a strong password and **save it safely**.
   - **Region:** Choose the region closest to your users (e.g., *South Asia (Mumbai)* or *Southeast Asia (Singapore)*).
3. Once your project finishes creating, go to **Project Settings** (gear icon) ➔ **Database**.
4. Scroll down to **Connection parameters** / **Connection string**:
   - Select the **URI** tab.
   - Choose **Session** (Port 5432) or **Transaction** (Port 6543).
   - Copy the URI:
     ```text
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with the password you created in step 2.

> 💡 **Tip:** SQLAlchemy will automatically create all tables (`users`, `mines`, `documents`, `compliance_scores`, etc.) and seed realistic Indian coal mining data the first time your backend boots up!

---

## Step 2: Deploy Backend to Render

1. Push your project code to a **GitHub repository** (if not already done).
2. Log in to [render.com](https://render.com).
3. Click **New +** ➔ **Web Service**.
4. Connect your GitHub repository.
5. Fill in the settings:
   - **Name:** `maceral-ai-backend` (or your choice)
   - **Region:** Choose the same or closest region to Supabase (e.g., *Oregon* or *Frankfurt*).
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
6. Scroll down to **Environment Variables** and add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres...` | Your Supabase connection string from Step 1 |
   | `GROQ_API_KEY` | `gsk_...` | Your Groq API Key for AI synthesis |
   | `ENVIRONMENT` | `production` | Production mode |
   | `JWT_SECRET_KEY` | *(Click "Generate")* | Auto-generate a secure random secret key |
   | `CORS_ORIGINS` | `*` | Allows your frontend to make API calls |
7. Click **Create Web Service**.
8. Render will build and deploy the service in ~2 minutes.
   - Once it shows **Live**, copy your service URL (e.g., `https://maceral-ai-backend.onrender.com`).
   - Test it by opening: `https://your-service.onrender.com/healthz` in your browser. You should see `{"status":"healthy",...}`.

---

## Step 3: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click *Edit* and select `frontend` (or leave default if importing the whole monorepo, as root `vercel.json` is already configured).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://maceral-ai-backend.onrender.com` *(your Render backend URL from Step 2)* |
6. Click **Deploy**.
7. In ~30 seconds, Vercel will give you a live production URL:
   ```text
   https://maceral-ai.vercel.app
   ```

---

## Step 4: Verification & Live Checklist

1. Open your live Vercel URL (e.g., `https://maceral-ai.vercel.app`).
2. **Sign In:**
   - Default seeded admin: `admin@coalindia.gov.in` / `Admin@12345`
   - Or click **Sign Up** to create a fresh mining officer account directly in Supabase!
3. **Explore Modules:**
   - **Overview & GIS Map:** Check real-time production targets and live telemetry.
   - **CoalGPT Q&A:** Ask a parliamentary question to verify the Groq neural engine.
   - **Document Intelligence:** Upload a test PDF to verify OCR extraction.
   - **Ministry Report Generator:** Generate a certified PDF or DOCX report.
   - **Compliance & Alerts:** Review automated DGMS health scores.

---

## ⚡ Important Production Tips

* **Render Free Tier Spin-Down:** Free Render services sleep after 15 minutes of inactivity and take ~30–40 seconds to wake up on first visit. If you want zero delay, you can set up a free 5-minute ping using [cron-job.org](https://cron-job.org) targeting `https://your-backend.onrender.com/healthz`.
* **Custom Domain:** You can easily add your own domain (e.g., `maceral.ai` or `coalindia.tech`) in Vercel's *Settings ➔ Domains* tab for free.
