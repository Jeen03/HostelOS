# HostelOS Google Cloud Firestore Setup Guide

HostelOS supports **Google Cloud Firestore** via the official `firebase-admin` SDK with automatic seeding and SQLite fallback mode.

---

## 1. Get your Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (or click **Add Project** to create one, e.g. `hostelos-campus`).
3. In the left sidebar, click the **Gear Icon (⚙)** next to Project Overview $\rightarrow$ **Project settings**.
4. Navigate to the **Service accounts** tab.
5. Under Firebase Admin SDK, ensure **Python** is selected.
6. Click **Generate new private key**, then click **Generate key** to download the JSON credentials file.
7. Rename the downloaded file to:
   ```text
   serviceAccountKey.json
   ```
8. Move it into the `backend/` directory:
   ```text
   c:\projecthostelos\backend\serviceAccountKey.json
   ```

*(Alternatively, set the environment variable `FIREBASE_CREDENTIALS_PATH=/path/to/your/key.json`)*

---

## 2. Enable Cloud Firestore in Firebase Console

1. In the Firebase Console left menu, navigate to **Build** $\rightarrow$ **Firestore Database**.
2. Click **Create database**.
3. Choose a server location closest to your users (e.g. `asia-south1` for Mumbai / India).
4. Select **Start in production mode** (or test mode for immediate testing).

---

## 3. One-Click Migration from SQLite (Optional)

If you already have existing local records in `hostelos.db` that you want to upload into Cloud Firestore:

```bash
cd backend
python migrate_sqlite_to_firestore.py
```

This will automatically read all rows across all 14 tables (`users`, `rooms`, `leave_requests`, `qr_tokens`, `movement_records`, `complaints`, `safety_assets`, `kitchen_inventory`, `meal_consumption`, `account_transactions`, `payments`, `bookings`, `sos_incidents`, `audit_logs`) and batch-write them directly into corresponding Firestore collections.

---

## 4. Run the Backend & Verify

Start the FastAPI server:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

1. **Console confirmation**:
   ```text
   [Firebase] Successfully connected to Cloud Firestore (Project: your-project-id)
   ```
2. **API Status check**:
   Visit `http://localhost:8000/api/database/status` to see:
   ```json
   {
     "provider": "firestore",
     "connected": true,
     "credentials_path": "...\\backend\\serviceAccountKey.json",
     "credentials_exist": true,
     "project_id": "your-firebase-project-id"
   }
   ```
3. **Admin Dashboard badge**:
   Log in to the Admin Portal (`admin` / `password123`) to view the live `🔥 Cloud Firestore (your-project-id)` status indicator.

---

## 5. Automatic Fallback Mode

If `serviceAccountKey.json` is missing or contains placeholder values, HostelOS automatically runs in **SQLite Local Fallback Mode** (`hostelos.db`), ensuring zero downtime during development and testing until you are ready to connect your live Firebase project.
