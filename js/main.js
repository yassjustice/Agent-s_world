/* ============================================
   Main — Bootstrap & Game Loop
   ============================================ */

(function () {
  'use strict';

  AgentRegistry.init();

  const canvas = document.getElementById('world-canvas');
  World.init(canvas);
  Camera.init(canvas);
  UI.init();

  // ── Live Bridge Connection ──────────────────────
  const BRIDGE_URL = `${location.protocol}//${location.host}/api/status`;
  let bridgeConnected = false;
  let lastBridgeData = null;

  async function pollBridge() {
    try {
      const res = await fetch(BRIDGE_URL);
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      lastBridgeData = data;
      bridgeConnected = true;

      // Apply real statuses from bridge
      const agents = AgentRegistry.getAgents();
      const liveIds = new Set(Object.keys(data.agents || {}));

      agents.forEach(a => {
        const live = data.agents[a.id];
        if (live) {
          a.status = live.status;
          a.currentTask = live.task;
          a.liveSession = live.session;
        }
      });

      // Update session count in UI
      const sessionCount = Object.keys(data.sessions || {}).length;
      updateConnectionStatus(true, sessionCount);
    } catch {
      bridgeConnected = false;
      updateConnectionStatus(false, 0);
      // Fallback: simulate when no server
      AgentRegistry.simulateActivity();
    }
  }

  function updateConnectionStatus(connected, sessions) {
    let badge = document.getElementById('bridge-status');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'bridge-status';
      badge.style.cssText = 'font-size:11px;padding:2px 8px;border-radius:10px;margin-left:8px;cursor:help;';
      document.querySelector('.logo').appendChild(badge);
    }
    if (connected) {
      badge.style.background = '#4ade8022';
      badge.style.color = '#4ade80';
      badge.textContent = `🟢 Live · ${sessions} session${sessions !== 1 ? 's' : ''}`;
      badge.title = 'Connected to bridge server at ' + BRIDGE_URL;
    } else {
      badge.style.background = '#fbbf2422';
      badge.style.color = '#fbbf24';
      badge.textContent = '🟡 Simulated';
      badge.title = 'No bridge server detected. Run: node server.js';
    }
  }

  // Poll every 2 seconds
  setInterval(pollBridge, 2000);
  pollBridge();

  // ── Game Loop ───────────────────────────────────
  let lastUIRefresh = 0;
  function gameLoop(timestamp) {
    Camera.update();
    World.updateAgents();
    World.render();

    if (timestamp - lastUIRefresh > 2000) {
      World.renderMinimap();
      UI.refresh();
      lastUIRefresh = timestamp;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  World.renderMinimap();

  // ── Keyboard shortcuts ──────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('agent-detail').classList.add('hidden');
      AgentRegistry.setSelected(null);
    }
    if (e.key === 'f' && !e.ctrlKey && document.activeElement.tagName !== 'INPUT') {
      document.getElementById('agent-search').focus();
      e.preventDefault();
    }
  });

  const agents = AgentRegistry.getAgents();
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🌍 Yassir's Agent World v1.1     ║
  ║   ${agents.length} agents loaded                ║
  ║   Bridge: ${BRIDGE_URL.replace('http://', '')}     ║
  ║   Press F to search, Esc to close   ║
  ╚══════════════════════════════════════╝
  `);
})();
