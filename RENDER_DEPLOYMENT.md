# Hosting HostelOS on Render (Complete Guide)

HostelOS is configured for **Unified Single-Service Hosting** on [Render](https://render.com). This means both the FastAPI backend and React frontend are hosted together on a **100% Free Tier** Web Service with:
- Zero CORS headaches (Frontend and API share the exact same domain)
- 1 single Render Web Service (stays within the free tier quota)
- Cloud Firestore support via Render environment variables or Secret Files
- Automatic SQLite fallback if Firestore is not configured

---

## ⚠️ Important Security Notice: Firebase Private Key

Your `backend/serviceAccountKey.json` contains a private key.
- It has been added to `.gitignore` so it **will NOT be leaked** to GitHub.
- Instead of committing `serviceAccountKey.json`, you will paste its content directly into Render's secure **Environment Variables** (or upload as a Secret File).

---

## Step 1: Initialize Git and Push to GitHub

If you haven't pushed this project to GitHub yet, run the following commands in your project root terminal:

```bash
git init
git add .
git commit -m "Configure HostelOS for Render deployment"
```

Create a new repository on [GitHub](https://github.com/new) (e.g. `hostelos`), then push your code:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/hostelos.git
git push -u origin main
```

---

## Step 2: Deploy on Render

### Method A: Blueprint Deployment (Fastest & Recommended)

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** at the top right and select **Blueprint**.
3. Connect your GitHub repository (`hostelos`).
4. Render will automatically detect [`render.yaml`](./render.yaml).
5. Click **Apply**. Render will run `bash build.sh` and launch your service!

---

### Method B: Manual Web Service Setup

If you prefer setting it up manually without Blueprints:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `hostelos` (or your preferred name)
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Runtime**: `Python`
   - **Build Command**: `bash build.sh`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Under **Health Check Path**, enter: `/api/health`

---

## Step 3: Configure Cloud Firestore (Firebase) Credentials

To enable Google Cloud Firestore in production on Render:

1. Open your project in Render Dashboard.
2. Go to the **Environment** tab.
3. Click **Add Environment Variable**:
   - **Key**: `FIREBASE_CREDENTIALS_JSON`
   - **Value**: Open your local `backend/serviceAccountKey.json`, copy the entire JSON content, and paste it here.
4. Click **Save Changes**. Render will automatically redeploy with Firestore active!

*(Note: If you do not add this variable, HostelOS will automatically fall back to its local SQLite database).*

---

## Step 4: Verification

Once the deployment status shows **Live**:
1. Click your Render service URL (e.g., `https://hostelos.onrender.com`).
2. You will see the HostelOS landing and login page.
3. Test logging in with sample role accounts:
   - **Student**: `u_student1` / `password123`
   - **Warden**: `u_warden` / `password123`
   - **Admin**: `u_admin` / `password123`
   - **Security**: `u_security` / `password123`
   - **Mess Manager**: `u_mess` / `password123`
4. Check health endpoint: `https://<your-render-url>/api/health`

