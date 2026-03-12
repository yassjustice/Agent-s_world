/* ============================================
   Main — Bootstrap & Game Loop
   ============================================ */

(function () {
  'use strict';

  // Initialize everything
  AgentRegistry.init();

  const canvas = document.getElementById('world-canvas');
  World.init(canvas);
  Camera.init(canvas);
  UI.init();

  // Set a few agents as "working" initially for visual interest
  const agents = AgentRegistry.getAgents();
  const workingIds = ['code-fixer', 'gsd-executor', 'security-auditor', 'seo-technical', 'browser-qa'];
  workingIds.forEach(id => AgentRegistry.setStatus(id, 'working'));
  AgentRegistry.setStatus('dep-auditor', 'error');

  // Main game loop
  let lastUIRefresh = 0;
  function gameLoop(timestamp) {
    Camera.update();
    World.updateAgents();
    World.render();

    // Refresh minimap and UI less frequently
    if (timestamp - lastUIRefresh > 2000) {
      World.renderMinimap();
      UI.refresh();
      lastUIRefresh = timestamp;
    }

    requestAnimationFrame(gameLoop);
  }

  // Start
  requestAnimationFrame(gameLoop);
  World.renderMinimap();

  // Keyboard shortcuts
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

  console.log(`
  ╔══════════════════════════════════════╗
  ║   🌍 Yassir's Agent World v1.0     ║
  ║   ${agents.length} agents loaded                ║
  ║   Press F to search, Esc to close   ║
  ║   Scroll to zoom, drag to pan       ║
  ╚══════════════════════════════════════╝
  `);
})();
