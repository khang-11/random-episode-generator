# Random Episode Generator

A full-stack app for generating random TV show episodes. Add your favorite shows (via TMDB or manually), and the app will pick a random unwatched episode for you — ensuring you cycle through every episode before repeating.

## Features

- **TMDB Integration** — Search for TV shows with poster art, episode images, and metadata
- **Manual Show Entry** — Add shows manually if they're not on TMDB
- **Smart Random Picker** — Picks from unwatched episodes only; auto-resets when all are watched
- **Episode Blacklist** — Per-user blacklist for episodes you never want to see
- **User Profiles** — Simple name-based profiles, no authentication required
- **Splash Art** — Episode reveal with still images from TMDB

## Tech Stack

- **Backend:** Go (Chi router, pgx)
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS v4
- **Database:** PostgreSQL (Neon free tier)
- **API:** TMDB (The Movie Database)

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- [TMDB API key](https://www.themoviedb.org/settings/api) (free)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and TMDB_API_KEY
go run ./cmd/server/
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8080`.

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                        |
| -------------- | ---------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string       |
| `TMDB_API_KEY` | TMDB API key (v3)                  |
| `PORT`         | Server port (default: 8080)        |

## Deployment

### Database — Neon (Free)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project and copy the connection string
3. Set as `DATABASE_URL`

### Backend — Fly.io or Render

**Fly.io:**
```bash
cd backend
fly launch
fly secrets set DATABASE_URL="..." TMDB_API_KEY="..."
fly deploy
```

**Render:**
1. Create a new Web Service
2. Set build command: `go build -o server ./cmd/server/`
3. Set start command: `./server`
4. Add environment variables

### Frontend — Vercel or Netlify

**Vercel:**
```bash
cd frontend
npx vercel
```

Set the `VITE_API_URL` environment variable to your backend URL, and update the Vite config proxy or use the full URL in production.

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
4. If all non-blacklisted episodes are watched → reset the cycle (clear watched list)
5. Pick a random episode from the remaining pool
6. Mark it as watched and return it
