/* ============================================
   Agent World Bridge — CLI Reporter
   
   Drop-in module for any Claude CLI / Copilot CLI session.
   Reports agent dispatches to the pixel world in real-time.
   
   Usage from CLI:
     node bridge/report.js session-start "My Workspace"
     node bridge/report.js agent-start code-fixer "Fixing auth bug"
     node bridge/report.js agent-done code-fixer
     node bridge/report.js agent-error security-auditor "Timeout"
     node bridge/report.js session-end
   ============================================ */

const http = require('http');
const os = require('os');
const path = require('path');

const SERVER = 'http://localhost:3777';
const SESSION_ID = process.env.AGENT_WORLD_SESSION || `cli-${os.hostname()}-${process.pid}`;

function post(endpoint, data) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, SERVER);
    const body = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', () => resolve({ ok: false, error: 'Server not running' }));
    req.write(body);
    req.end();
  });
}

function del(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, SERVER);
    const req = http.request(url, { method: 'DELETE' }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', () => resolve({ ok: false }));
    req.end();
  });
}

async function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'session-start': {
      const name = args[0] || path.basename(process.cwd());
      await post('/api/session', { id: SESSION_ID, name, workspace: process.cwd() });
      console.log(`[AgentWorld] Session registered: ${SESSION_ID} (${name})`);
      break;
    }
    case 'agent-start': {
      const [agentId, ...taskParts] = args;
      await post('/api/status', { agentId, status: 'working', task: taskParts.join(' ') || null, session: SESSION_ID });
      console.log(`[AgentWorld] ${agentId} → working`);
      break;
    }
    case 'agent-done': {
      await post('/api/status', { agentId: args[0], status: 'idle', task: null, session: SESSION_ID });
      console.log(`[AgentWorld] ${args[0]} → idle`);
      break;
    }
    case 'agent-error': {
      const [agentId, ...errParts] = args;
      await post('/api/status', { agentId, status: 'error', task: errParts.join(' ') || 'Error', session: SESSION_ID });
      console.log(`[AgentWorld] ${agentId} → error`);
      break;
    }
    case 'heartbeat': {
      await post('/api/heartbeat', { session: SESSION_ID });
      break;
    }
    case 'session-end': {
      await del(`/api/session/${SESSION_ID}`);
      console.log(`[AgentWorld] Session ended: ${SESSION_ID}`);
      break;
    }
    default:
      console.log(`
Agent World CLI Reporter
========================
  session-start [name]        Register CLI session
  agent-start <id> [task]     Mark agent working
  agent-done <id>             Mark agent idle
  agent-error <id> [msg]      Mark agent errored
  heartbeat                   Keep session alive
  session-end                 Deregister session
      `);
  }
}

main();
