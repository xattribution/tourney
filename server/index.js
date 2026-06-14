// Tourney backend: serves the built client and a tiny JSON state API backed
// by SQLite. State is a single shared document so every device on the home
// network sees the same results, standings and bracket.
import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 8080;
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const CLIENT_DIR = process.env.CLIENT_DIR || join(__dirname, '..', 'client', 'dist');
const STATE_KEY = 'tournament';

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'tourney.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);`);

const getStmt = db.prepare('SELECT value, updated_at FROM kv WHERE key = ?');
const putStmt = db.prepare(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Read the shared tournament state.
app.get('/api/state', (_req, res) => {
  const row = getStmt.get(STATE_KEY);
  if (!row) return res.json({ datasets: null, updatedAt: null });
  res.json({ datasets: JSON.parse(row.value), updatedAt: row.updated_at });
});

// Replace the shared tournament state (last write wins).
app.put('/api/state', (req, res) => {
  const datasets = req.body && req.body.datasets;
  if (!datasets || typeof datasets !== 'object' || !datasets.actual || !datasets.predict) {
    return res.status(400).json({ error: 'expected { datasets: { actual, predict } }' });
  }
  const updatedAt = Date.now();
  putStmt.run(STATE_KEY, JSON.stringify(datasets), updatedAt);
  res.json({ ok: true, updatedAt });
});

// Serve the built SPA (production). API routes above take precedence.
if (existsSync(CLIENT_DIR)) {
  app.use(express.static(CLIENT_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(CLIENT_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`tourney listening on http://0.0.0.0:${PORT}`);
  console.log(`  data dir:   ${DATA_DIR}`);
  console.log(`  client dir: ${CLIENT_DIR}${existsSync(CLIENT_DIR) ? '' : ' (not built — API only)'}`);
});
