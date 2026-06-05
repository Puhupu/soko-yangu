# 🛍️ Soko Yangu — Kenyan Marketplace MVP

A hyper-simple marketplace: buyers order with no account (cash on delivery), sellers manage products & orders, and a single admin oversees everything.

**Stack:** Next.js + Supabase (Postgres, Auth, Storage, Realtime) → deploy on Vercel.

---

## Setup (about 15 minutes)

### 1. Database
1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste everything from `supabase/schema.sql` and click **Run**.
   This creates the tables, security rules, realtime, and the image storage bucket.

### 2. Disable email confirmation (so signup is instant)
Supabase → **Authentication → Sign In / Providers → Email** → turn **OFF** "Confirm email" → Save.
(Optional, but without it new sellers must click an email link before logging in.)

### 3. Create the admin account
1. `npm install`
2. Copy `.env.local.example` to `.env.local` (values are pre-filled for your project).
3. `npm run dev` and open http://localhost:3000
4. Go to `/seller/signup`, register with the admin email (`admin@sokoyangu.co.ke` by default — change it in `.env.local` if you want).
   Logging in with that email automatically lands you in the **admin dashboard** at `/admin`.

### 4. Test the flow
- Sign up a normal seller (different email) → add a product with an image.
- Open the homepage as a buyer → search, open a product, place an order.
- Watch the order appear live in the admin dashboard with a 🔔 badge.

---

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Under **Environment Variables**, add the three values from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
4. Click **Deploy**. Done — you get a live `https://your-app.vercel.app` URL.

No CLI needed. Pushing new commits to GitHub auto-redeploys.

---

## Routes
| Path | Who | What |
|------|-----|------|
| `/` | Buyers | Browse & search products |
| `/product/[id]` | Buyers | Product detail + COD order form |
| `/seller/signup`, `/seller/login` | Sellers | Auth |
| `/seller/dashboard` | Sellers | Add/edit/delete products, view their orders |
| `/admin` | Admin | Login |
| `/admin/dashboard` | Admin | All orders (status toggle + live alerts), all sellers |
