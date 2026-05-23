# MainStreet

A community business succession platform that matches retiring small business owners with community-rooted buyers — veterans, immigrants, long-tenured employees, and first-generation owners. MainStreet solves both halves of the succession gap at once: sellers raise their **Transferability Score**, buyers raise their **Readiness Score**, and a matching engine pairs them on industry, geography, capital, values, and mentorship fit.

---

## Quick start (local dev)

```bash
# Requires Node 22+
npm run setup   # install all deps (root + client + server)
npm run dev     # API on :3001  ·  Vite client on :5173
```

Open <http://localhost:5173>.

The database seeds automatically on first run.

## Demo accounts

Password for all: **`demo1234`**

| Role   | Email                              | Name             |
| ------ | ---------------------------------- | ---------------- |
| Seller | `owner@mainstreet.com`             | Margaret Alvarez |
| Buyer  | `buyer@mainstreet.com`             | Marcus Reed      |

Four more seeded sellers (auto repair, landscaping, bookkeeping, hardware) and four more seeded buyers (immigrant entrepreneur, long-tenured employee, first-gen CPA, career changer from finance) with realistic match scores between them.

---

## Deploying to the web

### Option A — Render.com (recommended, easiest)

Render has a generous free tier. The `render.yaml` in this repo makes it one-click.

1. Push this repo to GitHub.
2. Go to <https://render.com> → **New → Blueprint**.
3. Connect your repo — Render reads `render.yaml` automatically.
4. Click **Apply**. Render will:
   - Install deps and build the React app (`npm run setup && npm run build`)
   - Start the server (`npm start`)
   - Generate a secure `JWT_SECRET` for you
   - Mount a 1 GB persistent disk at `/data` for the SQLite database

> **Free tier note:** The free web service spins down after 15 min of inactivity (cold start ~30 s). Upgrade to Starter ($7/mo) to keep it always-on.

### Option B — Railway.app

1. Push to GitHub.
2. <https://railway.app> → **New Project → Deploy from GitHub repo**.
3. Add environment variables in the Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate a long random string>
   DB_PATH=/data/mainstreet.db
   ```
4. Add a **Volume** mounted at `/data` for the database.
5. Railway reads `railway.json` for build/start commands automatically.

### Option C — Fly.io

```bash
# install flyctl first: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch          # picks up fly.toml, asks you to confirm settings
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly volumes create mainstreet_data --size 1 --region ord
fly deploy
```

### Option D — Any VPS / Docker (coming soon)

You can run `npm run build && npm start` on any Linux server. Point `DB_PATH` to a persistent path and set `JWT_SECRET`. Works on DigitalOcean, AWS EC2, Hetzner, etc.

---

## Environment variables

| Variable     | Required in prod | Default (dev)                   | Notes                                  |
| ------------ | ---------------- | ------------------------------- | -------------------------------------- |
| `JWT_SECRET` | **Yes**          | insecure dev fallback           | Use `openssl rand -hex 32` to generate |
| `PORT`       | No               | `3001`                          | Most platforms set this automatically  |
| `NODE_ENV`   | No               | `development`                   | Set to `production` to enable SPA mode |
| `DB_PATH`    | No               | `server/db/mainstreet.db`       | Point to a persistent disk in prod     |
| `APP_URL`    | For email        | `http://localhost:5173`         | Public URL used to build links in emails |
| `EMAIL_FROM` | For email        | `MainStreet <noreply@mainstreet.local>` | "From" header — must match your verified sender in SendGrid |
| `SMTP_HOST`  | For email        | _(unset → console fallback)_    | `smtp.sendgrid.net`                    |
| `SMTP_PORT`  | No               | `587`                           | Leave at 587 for SendGrid              |
| `SMTP_USER`  | For email        | —                               | Literal string `apikey` for SendGrid   |
| `SMTP_PASS`  | For email        | —                               | Your SendGrid API key (starts with `SG.`) |

Copy `.env.example` to `.env` for local overrides (never commit `.env`).

> Without the `SMTP_*` vars, the app logs would-be emails to stdout instead of sending — handy for local dev, fine for an initial deploy where you only want demo accounts. See the section below to wire up real email.

---

## Sending real email (SendGrid)

The app uses generic SMTP via nodemailer, so any SMTP provider works. SendGrid is the easiest free option (100 emails/day, no credit card). **You do not need to set up DNS or domain authentication** — Single Sender Verification is enough to start.

### One-time setup (5 minutes)

1. **Sign up** at <https://signup.sendgrid.com>.
2. **Verify a single sender.** SendGrid dashboard → **Settings → Sender Authentication → Verify a Single Sender**. Use an email address you control (your personal Gmail is fine). Click the verification link SendGrid emails you.
3. **Create an API key.** **Settings → API Keys → Create API Key** → name it `mainstreet-prod` → choose **Restricted Access** → grant **only** the "Mail Send" permission → copy the key (you only see it once — starts with `SG.`).
4. **Set env vars** in your host (Render dashboard → your service → Environment):
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.your-api-key-here
   EMAIL_FROM=MainStreet <the-email-you-verified@example.com>
   APP_URL=https://your-app.onrender.com
   ```
   `SMTP_USER` is the literal string `apikey`, not your username. `EMAIL_FROM` must use the exact address you verified in step 2 or SendGrid will reject the send.
5. Save — Render redeploys automatically. Register a test account on your live site; you should receive a verification email within seconds.

### Upgrading later: your own domain

When you have a real domain (e.g. `mainstreet.co`), redo Sender Authentication as **Domain Authentication** instead of Single Sender. That's the screen that asks you to paste CNAME records into your DNS — and it only works once you actually own the domain. Then change `EMAIL_FROM` to `MainStreet <hello@mainstreet.co>` and you're done.

### Troubleshooting

- **Emails not arriving:** check server logs. If you see `[email/console] Would have sent email`, your SMTP env vars aren't loaded. If you see an SMTP auth error, double-check `SMTP_USER=apikey` (literal) and that `SMTP_PASS` is the full key including the `SG.` prefix.
- **Emails landing in spam:** expected with Single Sender Verification because the From address (your Gmail) doesn't match the actual sender (SendGrid). Move to Domain Authentication on a real domain to fix.

---

## NPM scripts

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Concurrently run API (:3001) + Vite client (:5173)        |
| `npm run build`   | Vite production build → `client/dist/`                    |
| `npm start`       | Production: one process serves API + built React on $PORT |
| `npm run setup`   | Install all deps (root + client + server)                 |
| `npm run seed`    | Seed the database if empty                                |
| `npm run reset`   | Delete the DB and re-seed from scratch                    |

---

## Features

**Dual onboarding wizards**

- *Sellers* (5 steps): business basics → retirement situation → transferability quiz (5 questions, 1–5 / Yes/Partial/No scale) → preferred buyer type → mentorship willingness. Generates a 0–100 **Transferability Score** with letter grade, prioritized action list, and 8-step roadmap.
- *Buyers* (4 steps): background/identity → acquisition readiness (capital, SBA eligibility, credit, experience) → industry + geography preferences → 500-char motivation statement. Generates a 0–100 **Readiness Score** with a 6-item readiness checklist.

**Matching engine** — weighted compatibility combining industry overlap (30), geography (10–20), preferred buyer type (25), capital vs. estimated valuation (10–15), and mentorship alignment (10). Top 5 matches displayed with reason tags.

**Seller dashboard** — Transferability Score gauge, estimated valuation range (industry SDE multiples × revenue range), prioritized improvement recommendations with priority badges, interactive 8-step roadmap, matched buyer cards with one-click introduction requests, and mentor network cards.

**Buyer dashboard** — Readiness Score gauge, acquisition snapshot, interactive readiness checklist (SBA link included), matched business listings colour-coded by Transferability Score, and a learning centre with 4 module placeholders.

**Marketing homepage** — Deep forest green hero, stats bar (2.9M / 70% / $1.4T), "How it works" columns, seller/buyer side-by-side value props, testimonials, Playfair Display + DM Sans typography.

---

## API reference

All routes except `register`, `login`, and `health` require `Authorization: Bearer <token>`.

| Method | Path                       | Description                                     |
| ------ | -------------------------- | ----------------------------------------------- |
| GET    | `/api/health`              | Liveness check                                  |
| POST   | `/api/auth/register`       | Create account (`email`, `password`, `role`)    |
| POST   | `/api/auth/login`          | Login → returns JWT + user object               |
| GET    | `/api/auth/me`             | Current user from token                         |
| POST   | `/api/sellers/profile`     | Save seller onboarding data                     |
| GET    | `/api/sellers/profile`     | Profile + score + recs + valuation + roadmap    |
| PUT    | `/api/sellers/roadmap`     | Advance a roadmap task status                   |
| GET    | `/api/sellers/mentors`     | Mentor network cards                            |
| POST   | `/api/buyers/profile`      | Save buyer onboarding data                      |
| GET    | `/api/buyers/profile`      | Profile + score + checklist + learning modules  |
| PUT    | `/api/buyers/checklist`    | Toggle a checklist item                         |
| GET    | `/api/matches/:userId`     | Top 5 matches for either role                   |
| POST   | `/api/connections`         | Request introduction between buyer and seller   |
| GET    | `/api/connections`         | List your introduction requests                 |

---

## Project layout

```
mainstreet/
├── client/                        # Vite + React (port 5173 in dev)
│   ├── src/
│   │   ├── api/client.js          # Axios wrappers for every API route
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── ScoreGauge.jsx     # SVG arc gauge with gradient stroke
│   │   │   ├── RoadmapChecklist.jsx
│   │   │   ├── BuyerChecklist.jsx
│   │   │   ├── MatchCard.jsx      # Buyer card or seller listing card
│   │   │   ├── OnboardingWizard.jsx
│   │   │   └── Navbar.jsx
│   │   ├── pages/                 # Home · Login · Register · Onboardings · Dashboards
│   │   └── App.jsx                # Routes + role-protected guards + SPA redirects
│   ├── dist/                      # Built by `npm run build` (gitignored)
│   └── tailwind.config.js         # Brand palette + fonts
│
├── server/                        # Express API (port 3001 in dev, $PORT in prod)
│   ├── db/
│   │   ├── schema.sql             # 4 tables: users, seller_profiles, buyer_profiles, connections
│   │   ├── index.js               # node:sqlite wrapper (mimics better-sqlite3 API)
│   │   └── seed.js                # 5 sellers + 5 buyers, runs auto on first launch
│   ├── routes/                    # auth · sellers · buyers · matches+connections
│   ├── middleware/auth.js         # JWT sign + verify + requireAuth + requireRole
│   ├── scoring.js                 # Transferability + readiness scoring + valuation
│   ├── matching.js                # Compatibility scoring engine
│   └── index.js                   # App entry — serves API + React build in prod
│
├── .env.example                   # Copy to .env, fill JWT_SECRET
├── render.yaml                    # One-click Render.com deploy
├── railway.json                   # Railway deploy config
├── fly.toml                       # Fly.io deploy config
└── .vscode/                       # Editor settings, debug launch, recommended extensions
```

---

## Tech stack

- **Frontend**: React 18 · Vite · Tailwind CSS · React Router v6 · Axios
- **Backend**: Node.js ≥22 · Express · JWT (jsonwebtoken) · bcrypt
- **Database**: SQLite via Node's built-in `node:sqlite` (no native compile step)
- **Auth**: JWT in localStorage, 14-day expiry, role-gated routes

---

## Extending the platform

| Feature | What to add |
| --- | --- |
| **Document upload** | S3 / Cloudflare R2 + a `documents` table; NDA gate on buyer access |
| **Email / SMS** | Postmark + Twilio — connection requests, mentor intros, weekly match digest |
| **Video mentorship** | Cal.com or Calendly embed replacing the placeholder modal |
| **KYC / background check** | Persona or Stripe Identity before connections surface |
| **Real payments** | Stripe Connect for earnest money + platform fee |
| **Formal valuation** | CPA partner API (DueDilio, BizBuySell) upgrading the estimate range |
| **PostgreSQL** | Swap `node:sqlite` wrapper for `pg` when you need concurrent writes at scale |
| **Admin panel** | A `/admin` route (role: `admin`) for moderating listings and connections |

---

*Built for Main Street, not Wall Street.*
