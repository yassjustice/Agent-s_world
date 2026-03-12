/* ============================================
   Agent World Bridge Server
   Zero-dependency Node.js server.
   
   Usage:  node server.js
   Serves: http://localhost:3777
   
   API:
     GET  /api/status         → current agent statuses + sessions
     POST /api/status         → update agent status (from CLI)
     POST /api/session        → register a CLI session
     DELETE /api/session/:id  → deregister a CLI session
     GET  /api/history        → recent activity log
   ============================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3777;

// ── State ──────────────────────────────────────────────
const state = {
  agents: {},      // { agentId: { status, task, session, updatedAt } }
  sessions: {},    // { sessionId: { name, workspace, startedAt, lastSeen } }
  history: []      // last 200 events
};

const STATE_FILE = path.join(__dirname, '.agent-state.json');

// Load persisted state on startup
try {
  if (fs.existsSync(STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    Object.assign(state, saved);
    // Mark old sessions as stale
    const now = Date.now();
    for (const [id, s] of Object.entries(state.sessions)) {
      if (now - s.lastSeen > 5 * 60 * 1000) {
        s.stale = true;
      }
    }
  }
} catch (e) { /* start fresh */ }

function persistState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) { /* non-critical */ }
}

function addHistory(event) {
  state.history.unshift({ ...event, timestamp: Date.now() });
  if (state.history.length > 200) state.history.length = 200;
}

// ── MIME types ─────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ── Request helpers ────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// ── Server ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ── API Routes ──
  if (pathname === '/api/status' && req.method === 'GET') {
    return json(res, {
      agents: state.agents,
      sessions: state.sessions,
      serverTime: Date.now()
    });
  }

  if (pathname === '/api/status' && req.method === 'POST') {
    const body = await readBody(req);
    // body: { agentId, status, task?, session? }
    // or batch: { updates: [{ agentId, status, task? }], session? }
    const updates = body.updates || [body];
    const sessionId = body.session || 'unknown';

    for (const u of updates) {
      if (!u.agentId) continue;
      state.agents[u.agentId] = {
        status: u.status || 'working',
        task: u.task || null,
        session: sessionId,
        updatedAt: Date.now()
      };
      addHistory({
        type: 'status',
        agentId: u.agentId,
        status: u.status || 'working',
        task: u.task,
        session: sessionId
      });
    }
    persistState();
    return json(res, { ok: true, updated: updates.length });
  }

  if (pathname === '/api/session' && req.method === 'POST') {
    const body = await readBody(req);
    // body: { id, name?, workspace? }
    if (!body.id) return json(res, { error: 'id required' }, 400);
    state.sessions[body.id] = {
      name: body.name || body.id,
      workspace: body.workspace || 'unknown',
      startedAt: Date.now(),
      lastSeen: Date.now(),
      stale: false
    };
    addHistory({ type: 'session_start', sessionId: body.id, name: body.name });
    persistState();
    return json(res, { ok: true, sessionId: body.id });
  }

  if (pathname.startsWith('/api/session/') && req.method === 'DELETE') {
    const id = pathname.split('/api/session/')[1];
    if (state.sessions[id]) {
      // Mark all agents from this session as idle
      for (const [agentId, info] of Object.entries(state.agents)) {
        if (info.session === id) info.status = 'idle';
      }
      delete state.sessions[id];
      addHistory({ type: 'session_end', sessionId: id });
      persistState();
    }
    return json(res, { ok: true });
  }

  // Heartbeat — sessions ping to stay alive
  if (pathname === '/api/heartbeat' && req.method === 'POST') {
    const body = await readBody(req);
    if (body.session && state.sessions[body.session]) {
      state.sessions[body.session].lastSeen = Date.now();
      state.sessions[body.session].stale = false;
    }
    return json(res, { ok: true });
  }

  if (pathname === '/api/history' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return json(res, state.history.slice(0, limit));
  }

  // Reset all
  if (pathname === '/api/reset' && req.method === 'POST') {
    state.agents = {};
    state.sessions = {};
    state.history = [];
    persistState();
    return json(res, { ok: true });
  }

  // ── Static file serving ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath);
      const mime = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🌍 Agent World Bridge Server          ║
  ║   http://localhost:${PORT}                 ║
  ║                                          ║
  ║   API:                                   ║
  ║     GET  /api/status    → live state     ║
  ║     POST /api/status    → update agent   ║
  ║     POST /api/session   → register CLI   ║
  ║     GET  /api/history   → activity log   ║
  ╚══════════════════════════════════════════╝
  `);
});
