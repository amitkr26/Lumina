# Lumina Platform Deployment Guide

The Lumina monorepo is now **Production-Ready**. Follow this specific guide to deploy using **Supabase**, **Render**, and **Vercel**.

## 🚀 Pre-Deployment Status
- [x] **Type Integrity**: 0 TypeScript errors.
- [x] **Build Verification**: Successful production builds for API and Web.
- [x] **Cloud Config**: `render.yaml` created for automated backend deployment.

---

## 🛠️ Step-by-Step Deployment

### 1. Database: Supabase
1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > Database**.
3. Copy the **Connection String (URI)**.
   > [!TIP]
   > Use the **Transaction Connection Pooler** (Port 6543) for better performance with Prisma.
   > Format: `postgresql://postgres.[USER]:[PASS]@[HOST]:6543/postgres?pgbouncer=true`

### 2. Backend (API & Redis): Render
1. Create a new account at [render.com](https://render.com).
2. Click **New > Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file and create:
   - **lumina-api**: The Express backend.
   - **lumina-redis**: The internal Redis instance.
5. In the Render Dashboard for **lumina-api**, go to **Environment** and add:
   - `DATABASE_URL`: Your Supabase connection string.
6. Once deployed, copy your Render service URL (e.g., `https://lumina-api.onrender.com`).

### 3. Frontend (Web): Vercel
1. Create a new project at [vercel.com](https://vercel.com).
2. Import your GitHub repository.
3. **Important Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
4. In the **Environment Variables** section, add:
   - `API_URL`: Your Render service URL (e.g., `https://lumina-api.onrender.com`).
5. Click **Deploy**.

---

## 🏗️ Environment Variable Mapping
| Service | Variable | Value Source |
| :--- | :--- | :--- |
| **Render** | `DATABASE_URL` | Supabase (Database URI) |
| **Render** | `REDIS_URL` | Render (Auto-filled by Blueprint) |
| **Vercel** | `API_URL` | Render (Service URL) |

---

## 👮 Orchestrator Final Audit
> [!IMPORTANT]
> The `next.config.ts` is already configured with a rewrite rule that forwards `/api/:path*` to your `API_URL`. This eliminates CORS issues and ensures a seamless frontend-backend connection.

**Deployment Readiness: 100%**
