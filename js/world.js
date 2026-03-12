/* ============================================
   World — Scene Rendering & Agent Simulation
   ============================================ */

const World = (() => {
  let canvas, ctx;
  let frame = 0;
  const WORLD_SIZE = 20;
  let hoveredAgent = null;
  let dragMoved = false;
  let mouseDownPos = null;

  // Zone definitions — ground tile colors
  const ZONE_COLORS = {
    code:   { base: '#1a2e1a', highlight: '#223822' },
    arch:   { base: '#1a1a2e', highlight: '#222238' },
    web:    { base: '#2e1a2a', highlight: '#381a34' },
    devops: { base: '#2e2a1a', highlight: '#38341a' },
    seo:    { base: '#1a1a2e', highlight: '#281a38' },
    gsd:    { base: '#2e1a1a', highlight: '#381a1a' },
    data:   { base: '#1a2e2e', highlight: '#1a3838' },
    other:  { base: '#2e2e1a', highlight: '#38381a' },
    empty:  { base: '#131320', highlight: '#181828' }
  };

  // Map tile → zone
  function getZoneAt(tx, ty) {
    const categories = AgentRegistry.getCategories();
    let closest = null;
    let minDist = Infinity;
    for (const cat of categories) {
      const cx = cat.zone.x + 2.5;
      const cy = cat.zone.y + 2.5;
      const dist = Math.abs(tx - cx) + Math.abs(ty - cy);
      if (dist < 5 && dist < minDist) {
        minDist = dist;
        closest = cat.id;
      }
    }
    return closest || 'empty';
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Click handler
    canvas.addEventListener('mousedown', (e) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
      dragMoved = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (mouseDownPos) {
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);
        if (dx > 5 || dy > 5) dragMoved = true;
      }

      // Hover detection
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      hoveredAgent = findAgentAt(mx, my);

      const tooltip = document.getElementById('tooltip');
      if (hoveredAgent) {
        tooltip.classList.remove('hidden');
        tooltip.textContent = `${hoveredAgent.categoryIcon} ${hoveredAgent.name} — ${hoveredAgent.status}`;
        tooltip.style.left = (mx + 15) + 'px';
        tooltip.style.top = (my - 10) + 'px';
        canvas.style.cursor = 'pointer';
      } else {
        tooltip.classList.add('hidden');
        if (!Camera.getState().isDragging) canvas.style.cursor = 'grab';
      }
    });

    canvas.addEventListener('click', (e) => {
      if (dragMoved) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const agent = findAgentAt(mx, my);
      if (agent) {
        AgentRegistry.setSelected(agent.id);
        UI.showAgentDetail(agent);
        UI.scrollToAgent(agent.id);
      }
    });
  }

  function resize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  function findAgentAt(mx, my) {
    const cam = Camera.getState();
    const agents = AgentRegistry.getAgents();
    let closest = null;
    let closestDist = 20 * cam.zoom;

    for (const agent of agents) {
      const screen = PixelRenderer.tileToScreen(agent.tx, agent.ty, cam);
      const dist = Math.hypot(mx - screen.x, my - (screen.y - 8 * cam.zoom));
      if (dist < closestDist) {
        closestDist = dist;
        closest = agent;
      }
    }
    return closest;
  }

  function updateAgents() {
    const agents = AgentRegistry.getAgents();
    agents.forEach(a => {
      a.animFrame++;
      a.wanderTimer--;

      if (a.wanderTimer <= 0) {
        // Pick new wander target near home zone
        const cat = AgentRegistry.getCategories().find(c => c.id === a.category);
        if (cat) {
          const zoneAgents = AgentRegistry.getAgentsByCategory(a.category);
          const idx = zoneAgents.indexOf(a);
          const cols = Math.ceil(Math.sqrt(zoneAgents.length));
          const homeX = cat.zone.x + (idx % cols) * 1.5;
          const homeY = cat.zone.y + Math.floor(idx / cols) * 1.5;

          a.wanderTarget = {
            x: homeX + (Math.random() - 0.5) * 3,
            y: homeY + (Math.random() - 0.5) * 3
          };
        }
        a.wanderTimer = 100 + Math.random() * 200;
      }

      // Move toward wander target
      if (a.wanderTarget) {
        const dx = a.wanderTarget.x - a.tx;
        const dy = a.wanderTarget.y - a.ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.1) {
          const speed = a.status === 'working' ? 0.015 : 0.008;
          a.tx += (dx / dist) * speed;
          a.ty += (dy / dist) * speed;
          a.facing = dx > 0 ? 1 : -1;
        } else {
          a.wanderTarget = null;
        }
      }
    });

    // Simulate random status changes
    AgentRegistry.simulateActivity();
  }

  function render() {
    const cam = Camera.getState();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground tiles
    for (let ty = 0; ty < WORLD_SIZE; ty++) {
      for (let tx = 0; tx < WORLD_SIZE; tx++) {
        const screen = PixelRenderer.tileToScreen(tx, ty, cam);
        // Frustum culling
        if (screen.x < -100 || screen.x > canvas.width + 100 ||
            screen.y < -100 || screen.y > canvas.height + 100) continue;

        const zone = getZoneAt(tx, ty);
        const colors = ZONE_COLORS[zone];
        const isHighlight = (tx + ty) % 2 === 0;
        PixelRenderer.drawTile(ctx, screen.x, screen.y, isHighlight ? colors.highlight : colors.base, cam.zoom);
      }
    }

    // Draw zone labels
    const categories = AgentRegistry.getCategories();
    categories.forEach(cat => {
      const screen = PixelRenderer.tileToScreen(cat.zone.x + 2.5, cat.zone.y - 0.5, cam);
      if (screen.x > -200 && screen.x < canvas.width + 200 &&
          screen.y > -100 && screen.y < canvas.height + 100) {
        PixelRenderer.drawZoneLabel(ctx, screen.x, screen.y, cat.icon, cat.name, cat.color, cam.zoom);
      }
    });

    // Draw agents (sorted by Y for depth)
    const agents = [...AgentRegistry.getAgents()].sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty));
    const selectedId = AgentRegistry.getSelected();

    agents.forEach(agent => {
      const screen = PixelRenderer.tileToScreen(agent.tx, agent.ty, cam);
      // Frustum culling
      if (screen.x < -50 || screen.x > canvas.width + 50 ||
          screen.y < -50 || screen.y > canvas.height + 50) return;

      PixelRenderer.drawAgent(
        ctx, agent,
        screen.x, screen.y,
        frame,
        agent.id === selectedId,
        cam.zoom
      );
    });

    // Draw connection lines for working agents to zone center
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 1;
    agents.forEach(agent => {
      if (agent.status === 'working') {
        const cat = categories.find(c => c.id === agent.category);
        if (!cat) return;
        const agentScreen = PixelRenderer.tileToScreen(agent.tx, agent.ty, cam);
        const zoneScreen = PixelRenderer.tileToScreen(cat.zone.x + 2.5, cat.zone.y + 2.5, cam);
        ctx.strokeStyle = agent.color;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(agentScreen.x, agentScreen.y);
        ctx.lineTo(zoneScreen.x, zoneScreen.y);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);
    ctx.restore();

    frame++;
  }

  function renderMinimap() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return;
    const mCtx = minimapCanvas.getContext('2d');
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;

    mCtx.clearRect(0, 0, mw, mh);
    mCtx.fillStyle = '#0a0a14';
    mCtx.fillRect(0, 0, mw, mh);

    const scale = Math.min(mw, mh) / WORLD_SIZE;

    // Draw zones
    AgentRegistry.getCategories().forEach(cat => {
      mCtx.fillStyle = cat.color + '33';
      mCtx.fillRect(cat.zone.x * scale * 0.5, cat.zone.y * scale * 0.5, 5 * scale, 5 * scale);
    });

    // Draw agents as dots
    AgentRegistry.getAgents().forEach(a => {
      const colors = { idle: '#4ade80', working: '#fbbf24', error: '#f87171' };
      mCtx.fillStyle = colors[a.status] || '#4ade80';
      mCtx.fillRect(a.tx * scale * 0.5, a.ty * scale * 0.5, 2, 2);
    });

    // Camera viewport
    const cam = Camera.getState();
    const vpLeft = (-cam.offsetX / cam.zoom / (PixelRenderer.TILE_W / 2)) * scale * 0.25;
    const vpTop = (-cam.offsetY / cam.zoom / (PixelRenderer.TILE_H / 2)) * scale * 0.25;
    const vpW = (canvas.width / cam.zoom / (PixelRenderer.TILE_W / 2)) * scale * 0.25;
    const vpH = (canvas.height / cam.zoom / (PixelRenderer.TILE_H / 2)) * scale * 0.25;

    mCtx.strokeStyle = '#7c5cfc';
    mCtx.lineWidth = 1;
    mCtx.strokeRect(vpLeft + mw * 0.3, vpTop + mh * 0.1, vpW, vpH);
  }

  return { init, resize, updateAgents, render, renderMinimap };
})();
