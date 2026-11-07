# CodeMate AI — Standalone Next.js Frontend

A high-performance, standalone Next.js 14 frontend for **CodeMate AI**, featuring modern Silicon Valley aesthetics (inspired by Linear, Supabase, and Vercel), complete responsive dark mode, Tailwind CSS, Lucide icons, and zero-latency client-side authentication.

---

## 🚀 Features

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS + Custom Glassmorphism + Inter Typography
- **Zero AI Jargon / Universal Positioning**: Clean, benefits-focused copy for all modern problem solvers.
- **Client-Side Auth**: Connects directly to the FastAPI backend on Render (`https://codemate-backend-wsi1.onrender.com`).
- **One-Click Extension Token Sync**: Copy session token to link Chrome extension in seconds.
- **Instant Email Self-Verification**: 1-click email verification without waiting for emails.
- **Interactive Quota & Device Governance**: Real-time daily solve tracking and hardware-bound device revocation.

---

## 🛠️ Local Development

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🌐 1-Click Deployment on Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your `CodeMateAI` repository.
4. Set the **Root Directory** to `frontend`.
5. Add the Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://codemate-backend-wsi1.onrender.com`
6. Click **Deploy**. Your custom frontend will be live on Vercel Edge CDN with instantaneous page loads!
