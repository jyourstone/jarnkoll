# Järnkoll

Järnkoll is a mobile-first PWA for logging strength workouts in Swedish. It is built as a standalone app from `WTP`, but follows the same easy deployment model: one Docker container, one mounted appdata directory, and SQLite for local persistence.

## Highlights

- Create reusable exercises (`Ovningar`)
- Build workout templates (`Traningspass`) from those exercises
- Log a session with multiple sets per exercise
- Compare current performance with the last matching workout
- Clone a previous workout and use it as the starting point for the next session
- Follow progression over time with graphs for max weight, estimated 1RM, and total volume
- Installable PWA for iPhone home screen use

## Tech Stack

- React + TypeScript + Vite
- Express.js API
- SQLite via `better-sqlite3`
- Static web app manifest for installability

## Local Development

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

## Production

```bash
npm install
npm run build
npm start
```

The production server listens on `PORT` and serves the built client from `dist/`.

## Docker

```bash
docker compose up --build -d
```

### Persistent Data

The SQLite database lives outside the image:

- `DATA_DIR=/app/data`
- `DB_PATH=/app/data/jarnkoll.db`

Mount `/app/data` to your Unraid appdata path so database files survive container updates.

## API Overview

- `GET /api/dashboard`
- `GET /api/exercises`
- `POST /api/exercises`
- `PUT /api/exercises/:id`
- `DELETE /api/exercises/:id`
- `GET /api/templates`
- `GET /api/templates/:id`
- `GET /api/templates/:id/log-context`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `DELETE /api/templates/:id`
- `GET /api/logs`
- `GET /api/logs/:id`
- `POST /api/logs`
- `GET /api/progress/exercises/:exerciseId`

## PWA Notes

The app includes:

- a web app manifest
- standalone display mode
- home screen install metadata

For iPhone users not running in standalone mode, the UI shows a lightweight "Add to Home Screen" hint.
