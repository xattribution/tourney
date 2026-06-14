# Tourney — World Cup 2026 Tracker

A fast, mobile-first web app for tracking the **FIFA World Cup 2026**: enter match
results, watch the 12 group standings and the third-place race recalculate live,
and follow the full 32 → 1 knockout bracket built with FIFA's official
third-place allocation. Run your own *what-if* predictions in a separate sandbox,
then compare the **Actual** and **Predicted** brackets side by side.

Built to be self-hosted on a home server in a single Docker container, with state
**shared and synced across every device** on your network.

## Features

- **Live standings** for all 12 groups with full FIFA tie-break rules
  (points → goal difference → goals for → head-to-head → drawing of lots).
- **Third-place race** ranking the 12 group thirds; the best 8 qualify.
- **Knockout bracket** (Round of 32 → Final) auto-built from the official
  third-place allocation table. Tap a team to advance them; double-tap to enter a
  knockout score; mark penalty-shootout winners on level ties.
- **Two independent datasets** — *Actual* (real results) and *Predictor*
  (sandbox) — each feeding its own bracket.
- **Shared state**: a small backend persists everything to SQLite, so the tablet
  in the kitchen and the phone on the couch always agree. Edits sync on save and
  refresh when you return to the tab.
- **Installable PWA**: add to your home screen for a full-screen, app-like feel.
  Works offline against the last-loaded state.
- **Light / dark theme**, zoomable bracket, and JSON import/export for backups or
  sharing scenarios.

## Tech stack

| Layer    | Choice                                              |
|----------|-----------------------------------------------------|
| Frontend | React 18 + TypeScript + Vite, hand-tuned CSS, `vite-plugin-pwa` |
| Backend  | Node 22 + Express, `better-sqlite3` (single shared state document) |
| Packaging| Multi-stage Docker image, `docker compose`, named data volume |

## Quick start (Docker — recommended for your home server)

```bash
git clone <this-repo> tourney && cd tourney
docker compose up -d --build
```

Then open **http://<your-server-ip>:8080** from any device on your network. On a
phone, use *Add to Home Screen* to install it as an app.

State is stored in the `tourney-data` Docker volume and survives restarts and
rebuilds. To change the port, edit the `ports` mapping in `docker-compose.yml`
(e.g. `"3000:8080"`).

### Updating

```bash
git pull
docker compose up -d --build
```

### Backing up the data

```bash
# Copy the SQLite database out of the volume
docker run --rm -v tourney-data:/data -v "$PWD":/backup busybox \
  cp /data/tourney.db /backup/tourney-backup.db
```

You can also use the in-app **Export JSON** button on each dataset.

## Local development

Requires Node 22+. Run the API and the Vite dev server in two terminals:

```bash
# Terminal 1 — backend (http://localhost:8080)
cd server && npm install && npm run dev

# Terminal 2 — frontend with hot reload (http://localhost:5173)
cd client && npm install && npm run dev
```

The Vite dev server proxies `/api/*` to the backend automatically. To point it at
a different backend, set `VITE_API_TARGET`.

To build the production client bundle:

```bash
cd client && npm run build   # outputs client/dist, served by the backend
```

## Configuration

The server reads these environment variables:

| Variable     | Default                      | Purpose                              |
|--------------|------------------------------|--------------------------------------|
| `PORT`       | `8080`                       | HTTP port to listen on               |
| `DATA_DIR`   | `./data` (`/data` in Docker) | Where `tourney.db` is stored         |
| `CLIENT_DIR` | `../client/dist`             | Built SPA to serve (set in the image)|

## API

| Method | Route          | Description                                   |
|--------|----------------|-----------------------------------------------|
| `GET`  | `/api/health`  | Liveness check                                |
| `GET`  | `/api/state`   | Returns the shared `{ datasets, updatedAt }`  |
| `PUT`  | `/api/state`   | Replaces the shared state (last write wins)   |

## Project structure

```
client/            React + Vite frontend
  src/
    data/          Tournament reference data (groups, knockout tree, FIFA ANNEX)
    lib/           Pure logic: standings + bracket resolution
    components/    UI components
    hooks/         State + server sync
  scripts/         PWA icon generation (sharp; icons are pre-committed)
server/            Express + SQLite backend (also serves the built client)
legacy/            The original single-file HTML prototype this was built from
Dockerfile         Multi-stage build → single runtime image
docker-compose.yml One-command deploy with a persistent data volume
```

## Regenerating PWA icons

Icons live in `client/public` and are committed. To regenerate them from the
source SVG (requires the optional `sharp` dependency):

```bash
cd client && npm install && npm run icons
```

## Notes on the tournament logic

The team list reflects a representative 48-team field across Groups A–L. The
group tie-break order and the eight-best-third-placed allocation (the `ANNEX`
table in `client/src/data/tournament.ts`) follow FIFA's published format and were
ported verbatim from the original prototype in `legacy/`. Update the team names,
flags, and codes in that file as qualification concludes.
