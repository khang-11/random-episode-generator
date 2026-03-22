# Random Episode Generator

A full-stack app for generating random TV show episodes. Add your favorite shows (via TMDB or manually), and the app will pick a random unwatched episode for you — ensuring you cycle through every episode before repeating.

## Features

- **TMDB Integration** — Search for TV shows with poster art, episode images, and metadata
- **Manual Show Entry** — Add shows manually if they're not on TMDB
- **Smart Random Picker** — Picks from unwatched episodes only; auto-resets when all are watched
- **Episode Blacklist** — Per-user blacklist for episodes you never want to see (persists across watch resets)
- **User Profiles** — Simple name-based profiles, no authentication required
- **Splash Art** — Episode reveal with still images from TMDB

## Tech Stack

- **Backend:** Go (Chi router, pgx)
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS v4
- **Database:** PostgreSQL
- **API:** TMDB (The Movie Database)

---

## Running Locally

### Option 1: Docker Compose (recommended)

The easiest way — runs frontend, backend, and Postgres all in containers.

**Prerequisites:** Docker and Docker Compose

```bash
# 1. Create .env at the project root with your TMDB API key
cp .env.example .env
# Edit .env → set TMDB_API_KEY=your_key_here

# 2. Build and start everything
docker compose up --build
```

Open **http://localhost:3000**. That's it.

To stop: `docker compose down`
To wipe the database: `docker compose down -v`

### Option 2: Manual (dev mode)

**Prerequisites:** Go 1.24+, Node.js 18+, a PostgreSQL database

**Backend:**
```bash
cd backend
# Create .env with DATABASE_URL and TMDB_API_KEY
cat > .env <<EOF
DATABASE_URL=postgres://user:pass@localhost:5432/random_episode?sslmode=disable
TMDB_API_KEY=your_key_here
PORT=8080
EOF
go run ./cmd/server/
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/` to the backend at `:8080`.

---

## Deploying for Free

### 1. Database — Neon (free PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the connection string
3. This is your `DATABASE_URL`

### 2. Backend — Fly.io (free tier, 3 shared VMs)

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/
cd backend

# First time: create the app
fly launch --no-deploy

# Set secrets
fly secrets set \
  DATABASE_URL="postgres://user:pass@your-neon-host/dbname?sslmode=require" \
  TMDB_API_KEY="your_tmdb_key" \
  CORS_ORIGINS="https://your-app.vercel.app"

# Deploy
fly deploy
```

Your backend URL will be something like `https://random-episode.fly.dev`.

### 3. Frontend — Vercel (free tier)

```bash
cd frontend

# Install Vercel CLI if needed
npm i -g vercel

# Deploy (follow prompts: Framework=Vite, Build=npm run build, Output=dist)
vercel

# Set the backend URL as an env var
vercel env add VITE_API_URL  # enter: https://random-episode.fly.dev

# Redeploy with the env var
vercel --prod
```

Your frontend URL will be something like `https://your-app.vercel.app`.

### 4. Update CORS

After you have both URLs, update the backend's CORS setting:

```bash
cd backend
fly secrets set CORS_ORIGINS="https://your-app.vercel.app"
```

---

## Environment Variables

| Variable       | Where           | Description                                          |
| -------------- | --------------- | ---------------------------------------------------- |
| `DATABASE_URL` | Backend         | PostgreSQL connection string                         |
| `TMDB_API_KEY` | Backend / root  | TMDB API key (v3) — free at themoviedb.org           |
| `PORT`         | Backend         | Server port (default: 8080)                          |
| `CORS_ORIGINS` | Backend         | Comma-separated allowed origins for CORS             |
| `VITE_API_URL` | Frontend        | Backend URL for production (empty in dev, Vite proxies) |

## API Endpoints

| Method | Endpoint                                    | Description                    |
| ------ | ------------------------------------------- | ------------------------------ |
| GET    | `/api/users`                                | List all profiles              |
| POST   | `/api/users`                                | Create profile                 |
| GET    | `/api/shows/search?q=`                      | Search TMDB                    |
| POST   | `/api/shows/tmdb`                           | Add show from TMDB             |
| POST   | `/api/shows/manual`                         | Add show manually              |
| GET    | `/api/users/:uid/shows`                     | List user's shows              |
| POST   | `/api/users/:uid/shows/:sid`                | Add show to user               |
| DELETE | `/api/users/:uid/shows/:sid`                | Remove show from user          |
| GET    | `/api/users/:uid/shows/:sid/episodes`       | Episodes with watch status     |
| POST   | `/api/users/:uid/episodes/:eid/watched`     | Mark watched                   |
| DELETE | `/api/users/:uid/episodes/:eid/watched`     | Unmark watched                 |
| POST   | `/api/users/:uid/episodes/:eid/blacklist`   | Blacklist episode              |
| DELETE | `/api/users/:uid/episodes/:eid/blacklist`   | Remove from blacklist          |
| POST   | `/api/users/:uid/shows/:sid/random`         | Generate random episode        |

## How the Random Picker Works

1. Get all episodes for the show
2. Exclude blacklisted episodes (per user)
3. Exclude already-watched episodes (per user)
4. If all non-blacklisted episodes are watched → reset the cycle (clear watched list, blacklist stays)
5. Pick a random episode from the remaining pool
6. Mark it as watched and return it
