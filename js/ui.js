/* ============================================
   UI — Sidebar, Detail Panel, Search, Stats
   ============================================ */

const UI = (() => {
  let activeTab = 'agents';

  function init() {
    setupTabs();
    setupSearch();
    setupFilters();
    setupSidebarToggle();
    setupDetailClose();
    renderAgentList();
    renderZoneList();
    renderStats();
    updateAgentCount();
  }

  function setupTabs() {
    document.querySelectorAll('.sidebar-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.getElementById(`tab-${activeTab}`).classList.add('active');
      });
    });
  }

  function setupSearch() {
    const input = document.getElementById('agent-search');
    input.addEventListener('input', () => {
      filterAgentList();
    });
  }

  function setupFilters() {
    // Populate category filter
    const catFilter = document.getElementById('category-filter');
    AgentRegistry.getCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon} ${cat.name}`;
      catFilter.appendChild(opt);
    });

    catFilter.addEventListener('change', filterAgentList);
    document.getElementById('status-filter').addEventListener('change', filterAgentList);
  }

  function setupSidebarToggle() {
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      setTimeout(() => World.resize(), 350);
    });
  }

  function setupDetailClose() {
    document.getElementById('close-detail').addEventListener('click', () => {
      document.getElementById('agent-detail').classList.add('hidden');
      AgentRegistry.setSelected(null);
    });
  }

  function renderAgentList(agentsToShow) {
    const list = document.getElementById('agent-list');
    const agents = agentsToShow || AgentRegistry.getAgents();

    list.innerHTML = agents.map(a => {
      const sprite = PixelRenderer.generateSprite(a);
      return `
        <div class="agent-card" data-id="${a.id}">
          <canvas class="avatar" width="16" height="16" data-agent-id="${a.id}"></canvas>
          <div class="info">
            <div class="name">${a.name}</div>
            <span class="category-tag" style="background:${a.color}22;color:${a.color};border:1px solid ${a.color}44">${a.categoryIcon} ${a.categoryName}</span>
          </div>
          <div class="status-dot ${a.status}"></div>
        </div>
      `;
    }).join('');

    // Draw avatar sprites
    list.querySelectorAll('.avatar').forEach(canvas => {
      const id = canvas.dataset.agentId;
      const agent = AgentRegistry.getAgent(id);
      if (agent) {
        const sprite = PixelRenderer.generateSprite(agent);
        const avCtx = canvas.getContext('2d');
        avCtx.imageSmoothingEnabled = false;
        avCtx.drawImage(sprite, 0, 0);
      }
    });

    // Click handlers
    list.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('click', () => {
        const agent = AgentRegistry.getAgent(card.dataset.id);
        if (agent) {
          AgentRegistry.setSelected(agent.id);
          showAgentDetail(agent);
          Camera.focusOn(agent.tx, agent.ty);
          highlightCard(agent.id);
        }
      });
    });
  }

  function highlightCard(id) {
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.agent-card[data-id="${id}"]`);
    if (card) card.classList.add('selected');
  }

  function scrollToAgent(id) {
    const card = document.querySelector(`.agent-card[data-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      highlightCard(id);
    }
  }

  function filterAgentList() {
    const query = document.getElementById('agent-search').value.toLowerCase();
    const catFilter = document.getElementById('category-filter').value;
    const statusFilter = document.getElementById('status-filter').value;

    let agents = AgentRegistry.getAgents();

    if (query) {
      agents = AgentRegistry.search(query);
    }
    if (catFilter !== 'all') {
      agents = agents.filter(a => a.category === catFilter);
    }
    if (statusFilter !== 'all') {
      agents = agents.filter(a => a.status === statusFilter);
    }

    renderAgentList(agents);
  }

  function showAgentDetail(agent) {
    const detail = document.getElementById('agent-detail');
    const content = document.getElementById('detail-content');

    const sprite = PixelRenderer.generateSprite(agent);
    // Create a larger version
    const largeCanvas = document.createElement('canvas');
    largeCanvas.width = 64;
    largeCanvas.height = 64;
    const lCtx = largeCanvas.getContext('2d');
    lCtx.imageSmoothingEnabled = false;
    lCtx.drawImage(sprite, 0, 0, 64, 64);

    const statusLabels = { idle: '🟢 Idle', working: '🟡 Working', error: '🔴 Error' };

    content.innerHTML = `
      <div class="detail-header">
        <img class="avatar-large" src="${largeCanvas.toDataURL()}" alt="${agent.name}" />
        <div class="title-area">
          <h2>${agent.name}</h2>
          <div class="subtitle">${agent.categoryIcon} ${agent.categoryName}</div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Status</h3>
        <span class="status-badge ${agent.status}">
          <span class="status-dot ${agent.status}"></span>
          ${statusLabels[agent.status]}
        </span>
      </div>

      <div class="detail-section">
        <h3>Description</h3>
        <p>${agent.description}</p>
      </div>

      <div class="detail-section">
        <h3>Personality</h3>
        <p class="personality">"${agent.personality}"</p>
      </div>

      <div class="detail-section">
        <h3>Capabilities</h3>
        <div class="capability-tags">
          ${agent.capabilities.map(c => `<span class="capability-tag">${c}</span>`).join('')}
        </div>
      </div>

      <div class="detail-section">
        <h3>Agent ID</h3>
        <p style="font-family: monospace; color: var(--text-dim); font-size: 12px;">${agent.id}</p>
      </div>
    `;

    detail.classList.remove('hidden');
  }

  function renderZoneList() {
    const list = document.getElementById('zone-list');
    const categories = AgentRegistry.getCategories();

    list.innerHTML = categories.map(cat => {
      const count = AgentRegistry.getAgentsByCategory(cat.id).length;
      return `
        <div class="zone-card" data-zone="${cat.id}">
          <div class="zone-header">
            <span class="zone-icon">${cat.icon}</span>
            <span class="zone-name" style="color:${cat.color}">${cat.name}</span>
            <span class="zone-count">${count} agents</span>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.zone-card').forEach(card => {
      card.addEventListener('click', () => {
        const cat = AgentRegistry.getCategories().find(c => c.id === card.dataset.zone);
        if (cat) {
          Camera.focusOn(cat.zone.x + 2.5, cat.zone.y + 2.5);
          // Switch to agents tab and filter
          document.getElementById('category-filter').value = cat.id;
          filterAgentList();
          document.querySelector('.tab[data-tab="agents"]').click();
        }
      });
    });
  }

  function renderStats() {
    const container = document.getElementById('stats-content');
    const stats = AgentRegistry.getStats();
    const categories = AgentRegistry.getCategories();

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total Agents</div>
      </div>

      <div style="display:flex;gap:6px">
        <div class="stat-card" style="flex:1">
          <div class="stat-value" style="color:var(--green)">${stats.byStatus.idle}</div>
          <div class="stat-label">Idle</div>
        </div>
        <div class="stat-card" style="flex:1">
          <div class="stat-value" style="color:var(--yellow)">${stats.byStatus.working}</div>
          <div class="stat-label">Working</div>
        </div>
        <div class="stat-card" style="flex:1">
          <div class="stat-value" style="color:var(--red)">${stats.byStatus.error}</div>
          <div class="stat-label">Error</div>
        </div>
      </div>

      <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin:14px 0 8px;">Agents by Zone</h3>

      ${categories.map(cat => {
        const count = stats.byCat[cat.id] || 0;
        const pct = Math.round((count / stats.total) * 100);
        return `
          <div class="stat-bar">
            <span class="bar-label">${cat.icon} ${cat.name}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pct}%;background:${cat.color}"></div>
            </div>
            <span class="bar-count">${count}</span>
          </div>
        `;
      }).join('')}

      <div class="stat-card" style="margin-top:14px">
        <div class="stat-label" style="font-size:13px;color:var(--text)">🌍 Yassir's Agent World</div>
        <div class="stat-label" style="margin-top:4px">v1.0 — Command Center</div>
      </div>
    `;
  }

  function updateAgentCount() {
    document.getElementById('agent-count').textContent = `${AgentRegistry.getAgents().length} agents`;
  }

  // Periodic UI refresh for status changes
  function refresh() {
    // Re-filter list to reflect status changes
    filterAgentList();
    // Update stats
    renderStats();
  }

  return { init, showAgentDetail, scrollToAgent, refresh, filterAgentList, renderAgentList };
})();
