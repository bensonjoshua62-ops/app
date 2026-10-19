# IGRIS Trading Platform - Complete Deployment Guide

This is your complete, step-by-step guide to deploying IGRIS. It covers everything from creating accounts to going live.

---

## Table of Contents

1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Step 1: Create a MongoDB Atlas Account (Free Database)](#2-step-1-create-a-mongodb-atlas-account)
3. [Step 2: Push Your Code to GitHub](#3-step-2-push-your-code-to-github)
4. [Step 3: Deploy the Backend](#4-step-3-deploy-the-backend)
   - [Option A: Deploy Backend to Vercel (Serverless)](#option-a-deploy-backend-to-vercel-serverless)
   - [Option B: Deploy Backend to Railway (Recommended)](#option-b-deploy-backend-to-railway-recommended)
5. [Step 4: Deploy the Frontend to Vercel](#5-step-4-deploy-the-frontend-to-vercel)
6. [Step 5: Connect Everything Together](#6-step-5-connect-everything-together)
7. [Step 6: Add a Custom Domain (Optional)](#7-step-6-add-a-custom-domain)
8. [Step 7: First Login and Admin Setup](#8-step-7-first-login-and-admin-setup)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Troubleshooting](#10-troubleshooting)
11. [Which Backend Host Should I Pick?](#11-which-backend-host-should-i-pick)

---

## 1. What You Need Before Starting

You will create free accounts on these services:

| Service | What It Does | Cost |
|---------|-------------|------|
| **GitHub** | Stores your code | Free |
| **MongoDB Atlas** | Cloud database | Free (M0 tier) |
| **Vercel** | Hosts your frontend (and optionally backend) | Free (Hobby tier) |
| **Railway** (optional) | Hosts your backend | Free trial ($5 credit), then ~$5/month |

You will also need these values from your current Emergent setup:
- Your **MetaAPI Token** (from the admin panel or backend `.env`)
- Your **Emergent LLM Key** (if using the AI chat feature)
- Your **SMTP credentials** (if using email notifications)

---

## 2. Step 1: Create a MongoDB Atlas Account

MongoDB Atlas is a free cloud database. Your app currently uses a local MongoDB — you need a cloud one for production.

### 1.1 Sign Up

1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with your email or Google account
3. Choose **"I'm building a new project"** if asked
4. Select the **FREE / M0** plan

### 1.2 Create a New Cluster

1. After signing in, you'll land on the **"Create a Deployment"** page
2. Select **M0 FREE** tier (the free option)
3. **Provider**: Choose **AWS** (or Google Cloud/Azure — any works)
4. **Region**: Pick the region closest to your users
   - Example: If your users are in the US, pick `us-east-1`
   - Example: If your users are in Europe, pick `eu-west-1`
5. **Cluster Name**: Leave as `Cluster0` or name it `igris-cluster`
6. Click **"Create Deployment"**
7. Wait 1-3 minutes for the cluster to provision

### 1.3 Create a Database User

After the cluster is created, Atlas will prompt you to set up security:

1. You'll see **"Create a Database User"**
2. **Authentication Method**: Select **Password**
3. **Username**: Enter a username (e.g., `igris_admin`)
4. **Password**: Click **"Autogenerate Secure Password"** — **COPY AND SAVE THIS PASSWORD SOMEWHERE SAFE**
   - If your password has special characters like `@`, `#`, `%`, you'll need to URL-encode them later
   - Tip: Use only letters and numbers in the password to avoid issues (e.g., `MySecure123Password`)
5. Click **"Create Database User"**

### 1.4 Set Up Network Access (Allow Connections)

1. You'll see **"Where would you like to connect from?"**
2. Click **"Add My Current IP Address"** if you want to test locally
3. **IMPORTANT**: You also need to allow Vercel/Railway to connect:
   - Go to **Network Access** in the left sidebar
   - Click **"+ Add IP Address"**
   - Click **"Allow Access from Anywhere"** — this sets it to `0.0.0.0/0`
   - Click **"Confirm"**

   > This is necessary because Vercel and Railway use dynamic IPs. Without this, your deployed app cannot reach the database.

### 1.5 Get Your Connection String

1. Go to **Database** in the left sidebar
2. Click **"Connect"** on your cluster
3. Select **"Drivers"** (Connect your application)
4. You'll see a connection string like:
   ```
   mongodb+srv://igris_admin:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you saved in step 1.3
6. **Add the database name** `igris` after `mongodb.net/`:
   ```
   mongodb+srv://igris_admin:MySecure123Password@cluster0.abc123.mongodb.net/igris?retryWrites=true&w=majority
   ```
7. **SAVE THIS FULL CONNECTION STRING** — you'll need it for both Vercel and Railway

### 1.6 Verify It Works (Optional)

1. In Atlas, go to **Database** → click your cluster name
2. Click **"Browse Collections"**
3. You should see an empty database — that's correct. Collections will be created automatically when the app first runs.

---

## 3. Step 2: Push Your Code to GitHub

### 2.1 Download Code from Emergent

1. In your Emergent chat, use the **"Save to GitHub"** button in the chat input
   - OR click **"Download Code"** to get a ZIP file

### 2.2 If Using "Save to GitHub" (Easiest)

Emergent can push directly to GitHub for you. Follow the on-screen prompts. Skip to [Step 3](#4-step-3-deploy-the-backend).

### 2.3 If Using Manual Upload (ZIP Download)

1. Extract the downloaded ZIP to a local folder
2. Go to [github.com/new](https://github.com/new) and create a new repository:
   - **Repository name**: `igris-trading-platform`
   - **Visibility**: Private (recommended — your code has API references)
   - Do NOT check "Add a README" (your code already has one)
   - Click **"Create repository"**
3. Open your terminal/command prompt in the extracted project folder:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - IGRIS Trading Platform"

# Connect to your GitHub repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/igris-trading-platform.git

# Push the code
git push -u origin main
```

> **If you get an error about `main` vs `master`**: Try `git push -u origin master` instead.

4. Refresh your GitHub repo page — you should see all your files there.

### 2.4 Verify Your Repository

Make sure these folders exist in your repo:
- `backend/` — Contains `server.py`, `requirements.txt`, `vercel.json`
- `frontend/` — Contains `package.json`, `src/`

Make sure `.env` files are **NOT** visible (they contain secrets and are excluded by `.gitignore`).

---

## 4. Step 3: Deploy the Backend

You have two options for the backend. Read the comparison at the [bottom of this guide](#11-which-backend-host-should-i-pick) if unsure.

---

### Option A: Deploy Backend to Vercel (Serverless)

Vercel runs your Python backend as serverless functions. This is free but has limitations (see comparison table below).

#### A.1 Create a New Vercel Project for the Backend

1. Go to [vercel.com](https://vercel.com) and sign up / log in (use "Continue with GitHub" for easiest setup)
2. Click **"Add New..."** → **"Project"**
3. You'll see your GitHub repositories. Click **"Import"** next to `igris-trading-platform`

#### A.2 Configure the Backend Project

On the configuration screen:

1. **Project Name**: Enter `igris-backend` (or any name you like)
2. **Framework Preset**: Select **"Other"**
3. **Root Directory**: Click **"Edit"** and type `backend` → click **"Continue"**
   > This tells Vercel to look inside the `backend/` folder
4. Leave **Build Command** and **Output Directory** empty

#### A.3 Add Environment Variables

Still on the same configuration page, scroll down to **"Environment Variables"**. Add each of these one by one:

| Key | Value |
|-----|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string from Step 1.5 |
| `DB_NAME` | `igris` |
| `JWT_SECRET_KEY` | Any long random string (e.g., `xK9m2Pq7vR4nT8wL3jF6hB1dG5sY0cA`) |
| `METAAPI_TOKEN` | Your MetaAPI token |
| `EMERGENT_LLM_KEY` | Your Emergent LLM key (for AI features) |
| `WEBHOOK_API_KEY` | Any secret string (e.g., `IGRIS_WEBHOOK_2024`) |

**Optional email variables** (add these if you want email notifications):

| Key | Value |
|-----|-------|
| `SMTP_HOST` | Your SMTP server (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | `465` (for SSL) or `587` (for TLS) |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Your email app password |
| `SMTP_SENDER_EMAIL` | Your email address |
| `SMTP_SENDER_NAME` | `IGRIS Trading` |

> **Generating a random JWT secret**: Open your terminal and run:
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(32))"
> ```
> Or just type a long random string of letters and numbers.

#### A.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (this may take 2-5 minutes)
3. Once done, you'll see a URL like: `https://igris-backend.vercel.app`
4. **Test it**: Open `https://igris-backend.vercel.app/api/` in your browser
   - You should see: `{"message": "IGRIS API Server", "version": "1.0.0"}`
5. **SAVE THIS URL** — you need it for the frontend deployment

> **If the build fails**: Check the build logs. Common issues:
> - Missing dependency: Make sure `requirements.txt` is complete
> - Python version: Vercel uses Python 3.12 by default

---

### Option B: Deploy Backend to Railway (Recommended)

Railway runs your backend as a persistent server (not serverless). This is better for the MetaAPI integration and background tasks.

#### B.1 Create a Railway Account

1. Go to [railway.com](https://railway.com)
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

#### B.2 Create a New Project

1. After logging in, click **"New Project"**
2. Select **"Deploy from GitHub Repo"**
3. Find and select your `igris-trading-platform` repository
4. Railway will auto-detect the project. Click **"Add Service"** if needed.

#### B.3 Configure the Service

1. Click on the service that was created
2. Go to the **"Settings"** tab
3. Under **"Source"**:
   - **Root Directory**: Set to `/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`

#### B.4 Add Environment Variables

1. Go to the **"Variables"** tab
2. Click **"+ New Variable"** and add each of these:

| Key | Value |
|-----|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string from Step 1.5 |
| `DB_NAME` | `igris` |
| `JWT_SECRET_KEY` | Any long random string (e.g., `xK9m2Pq7vR4nT8wL3jF6hB1dG5sY0cA`) |
| `METAAPI_TOKEN` | Your MetaAPI token |
| `EMERGENT_LLM_KEY` | Your Emergent LLM key (for AI features) |
| `WEBHOOK_API_KEY` | Any secret string (e.g., `IGRIS_WEBHOOK_2024`) |
| `PORT` | `8001` |

**Optional email variables** (same as the Vercel table in Option A):

| Key | Value |
|-----|-------|
| `SMTP_HOST` | Your SMTP server (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Your email app password |
| `SMTP_SENDER_EMAIL` | Your email address |
| `SMTP_SENDER_NAME` | `IGRIS Trading` |

#### B.5 Generate a Public URL

1. Go to the **"Settings"** tab
2. Under **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Railway will give you a URL like: `https://igris-backend-production.up.railway.app`
5. **Test it**: Open `https://YOUR-RAILWAY-URL/api/` in your browser
   - You should see: `{"message": "IGRIS API Server", "version": "1.0.0"}`
6. **SAVE THIS URL** — you need it for the frontend deployment

#### B.6 Deploy

Railway auto-deploys when you push to GitHub. If it hasn't deployed yet:
1. Go to the **"Deployments"** tab
2. Click **"Deploy"** or wait for the automatic deployment
3. Check the logs to make sure the server started successfully
4. Look for: `Started IGRIS API Server...` in the logs

---

## 5. Step 4: Deploy the Frontend to Vercel

Regardless of whether you chose Vercel or Railway for the backend, the frontend always goes on Vercel.

### 4.1 Create a New Vercel Project for the Frontend

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import"** next to your `igris-trading-platform` repository
   > If you already imported this repo for the backend, Vercel will still let you create another project from the same repo.

### 4.2 Configure the Frontend Project

1. **Project Name**: Enter `igris-frontend` (or `igris-app`)
2. **Framework Preset**: Select **"Create React App"**
3. **Root Directory**: Click **"Edit"** and type `frontend` → click **"Continue"**
4. **Build Command**: `yarn build` (should auto-fill)
5. **Output Directory**: `build` (should auto-fill)

### 4.3 Add Environment Variables

Add this single variable:

| Key | Value |
|-----|-------|
| `REACT_APP_BACKEND_URL` | Your backend URL from Step 3 |

Use the URL from whichever backend option you chose:
- **If Vercel backend**: `https://igris-backend.vercel.app`
- **If Railway backend**: `https://igris-backend-production.up.railway.app`

> **IMPORTANT**: Do NOT add a trailing slash. Use `https://example.com` not `https://example.com/`

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for the build (2-5 minutes)
3. Once done, your frontend is live at: `https://igris-frontend.vercel.app`

### 4.5 Verify the Frontend

1. Open your frontend URL in a browser
2. You should see the IGRIS login page
3. Try signing in with admin credentials (see Step 7)

---

## 6. Step 5: Connect Everything Together

### 5.1 Update CORS (If Using Custom Domain)

The backend currently allows all origins (`*`), so CORS should work out of the box. If you want to restrict it later for security, you can update the `server.py` CORS settings.

### 5.2 Verify the Connection

1. Open your frontend URL
2. Open browser DevTools (F12) → **Console** tab
3. Try to sign in
4. If you see CORS errors, check that your `REACT_APP_BACKEND_URL` is correct

### 5.3 Test the API Directly

Open these URLs in your browser to verify:

| Test | URL |
|------|-----|
| Backend health | `https://YOUR-BACKEND-URL/api/` |
| Frontend loads | `https://YOUR-FRONTEND-URL` |

---

## 7. Step 6: Add a Custom Domain

### For Vercel (Frontend)

1. Go to your **frontend project** in Vercel
2. Go to **Settings** → **Domains**
3. Enter your domain (e.g., `igris.jcelerita.com`)
4. Vercel will show you DNS records to add
5. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):
   - Add a **CNAME** record pointing to `cname.vercel-dns.com`
   - Or add an **A** record pointing to `76.76.21.21`
6. Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)
7. Vercel will auto-provision an SSL certificate

### For Railway (Backend)

1. Go to your **backend service** in Railway
2. Go to **Settings** → **Networking** → **Public Networking**
3. Click **"Custom Domain"**
4. Enter your subdomain (e.g., `api.jcelerita.com`)
5. Add the CNAME record Railway provides to your DNS settings
6. Update your frontend's `REACT_APP_BACKEND_URL` to use the new backend domain

---

## 8. Step 7: First Login and Admin Setup

### 8.1 Create the Admin Account

The app automatically creates a default admin on first login:

1. Go to `https://YOUR-FRONTEND-URL/signin`
2. Log in with:
   - **Email**: `admin@igris.com`
   - **Password**: `admin123`
3. You should be redirected to the admin dashboard

### 8.2 Configure Admin Settings

Once logged in as admin:

1. Go to the **Admin Panel** (sidebar)
2. **API Settings**: Enter your MetaAPI token if not set via env vars
3. **CopyFactory Settings**: Enter your master strategy ID
4. **User Management**: You'll see and approve new user signups here

### 8.3 Change the Admin Password

1. Go to your **Profile** page
2. Change the default password to something secure

---

## 9. Environment Variables Reference

### Backend — Complete List

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `MONGO_URL` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster0.abc.mongodb.net/igris?retryWrites=true&w=majority` |
| `DB_NAME` | Yes | Database name | `igris` |
| `JWT_SECRET_KEY` | Yes | Secret for signing auth tokens | `xK9m2Pq7vR4nT8wL3jF6hB1dG5sY0cA` |
| `METAAPI_TOKEN` | Yes | MetaAPI authentication token | `eyJhbGci...` (your token) |
| `EMERGENT_LLM_KEY` | For AI | Emergent LLM key for voice/chat AI | `sk-emergent-xxx` |
| `WEBHOOK_API_KEY` | Yes | Secret for webhook authentication | `IGRIS_WEBHOOK_2024` |
| `SMTP_HOST` | For email | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | For email | SMTP port number | `465` |
| `SMTP_USER` | For email | SMTP login username | `your@gmail.com` |
| `SMTP_PASSWORD` | For email | SMTP login password | `abcd efgh ijkl mnop` |
| `SMTP_SENDER_EMAIL` | For email | "From" email address | `your@gmail.com` |
| `SMTP_SENDER_NAME` | For email | "From" display name | `IGRIS Trading` |
| `PORT` | Railway only | Port for the server | `8001` |

### Frontend — Complete List

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `REACT_APP_BACKEND_URL` | Yes | Full URL to your backend | `https://igris-backend.vercel.app` |

### How to Get Gmail App Password (for SMTP)

If you want to use Gmail for sending emails:

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Go to **Security** → **2-Step Verification** (must be enabled)
3. At the bottom, click **"App passwords"**
4. Select **"Mail"** and **"Other"** (enter "IGRIS")
5. Click **"Generate"**
6. Google gives you a 16-character password like `abcd efgh ijkl mnop`
7. Use that as your `SMTP_PASSWORD` (remove spaces: `abcdefghijklmnop`)

---

## 10. Troubleshooting

### "Unable to connect to server" on Sign In

| Cause | Fix |
|-------|-----|
| Backend URL wrong | Check `REACT_APP_BACKEND_URL` in frontend Vercel settings. Must include `https://` |
| Backend not running | Open `YOUR_BACKEND_URL/api/` in browser. Should show JSON response. |
| CORS error | Check browser console (F12). Backend allows `*` by default, so this is rare. |
| Backend crashed | Check Vercel/Railway deployment logs for errors. |

### MongoDB Connection Failed

| Cause | Fix |
|-------|-----|
| Wrong password | Re-check the password in your connection string. Special chars must be URL-encoded. |
| IP not whitelisted | Go to Atlas → Network Access → make sure `0.0.0.0/0` is listed. |
| Wrong connection string | Make sure it starts with `mongodb+srv://` and includes the database name `/igris?`. |

### Backend Build Fails on Vercel

| Cause | Fix |
|-------|-----|
| Missing dependency | Check error log for the package name. Add it to `requirements.txt`. |
| Python version issue | Create a `runtime.txt` in `backend/` with content: `python-3.12` |
| Root directory wrong | Make sure you set the root directory to `backend` in project settings. |

### Frontend Build Fails on Vercel

| Cause | Fix |
|-------|-----|
| `yarn build` errors | Check logs. Usually a missing env var or import error. |
| Root directory wrong | Make sure you set the root directory to `frontend` in project settings. |
| Node version issue | Go to Settings → General → Node.js Version → select `18.x`. |

### Railway-Specific Issues

| Cause | Fix |
|-------|-----|
| App crashes on start | Check logs. Make sure start command is: `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| No public URL | Go to Settings → Networking → Generate Domain |
| Runs out of credits | Add a payment method. Railway's free tier gives $5, enough for ~500 hours. |

### MetaAPI / Copy Trading Not Working

| Cause | Fix |
|-------|-----|
| Token not set | Check `METAAPI_TOKEN` is set correctly in your environment variables. |
| Strategy ID not set | Log in as admin → Admin Panel → CopyFactory Settings → enter your strategy ID. |
| Serverless timeout | If on Vercel, MetaAPI calls may time out (10s limit). Consider Railway for backend. |

---

## 11. Which Backend Host Should I Pick?

| Feature | Vercel (Serverless) | Railway (Persistent Server) |
|---------|--------------------|-----------------------------|
| **Cost** | Free (Hobby plan) | Free trial ($5), then ~$5/mo |
| **Setup Difficulty** | Easy | Easy |
| **Cold Starts** | Yes (1-5 sec delay on first request) | No (always running) |
| **Background Tasks** | Not supported (cron won't work) | Fully supported |
| **MetaAPI Integration** | May timeout on long operations | Works perfectly |
| **WebSocket Support** | No | Yes |
| **Max Request Duration** | 10 sec (free), 60 sec (Pro) | No limit |
| **Best For** | Simple APIs, low traffic | Full trading platform features |

**Recommendation**: Use **Railway for the backend** if you plan to use MetaAPI copy trading actively. The persistent server handles long-running MetaAPI connections and background tasks properly. Use **Vercel for the backend** only if you want everything free and are okay with some limitations.

---

## Quick Reference: Deployment Checklist

- [ ] Created MongoDB Atlas account and cluster (free M0 tier)
- [ ] Created database user with password
- [ ] Set network access to `0.0.0.0/0` (allow all)
- [ ] Copied MongoDB connection string with password and `/igris` database name
- [ ] Pushed code to GitHub
- [ ] Deployed backend (Vercel or Railway) with all environment variables
- [ ] Tested backend URL returns `{"message": "IGRIS API Server"}`
- [ ] Deployed frontend to Vercel with `REACT_APP_BACKEND_URL` set
- [ ] Tested frontend loads and sign-in works
- [ ] Logged in as admin and configured settings
- [ ] Changed default admin password

---

**You're all set! Your IGRIS Trading Platform is now live.**
