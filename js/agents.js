/* ============================================
   Agent Registry — Data & State Management
   ============================================ */

const AgentRegistry = (() => {
  let agents = [];
  let categories = [];
  let selectedAgentId = null;

  // Full agent data embedded (from agents.json)
  const AGENT_DATA = {
    categories: [
      { id: 'code', name: 'Code Quality', color: '#4ade80', zone: { x: 2, y: 2 }, icon: '⚡' },
      { id: 'arch', name: 'Architecture', color: '#60a5fa', zone: { x: 8, y: 2 }, icon: '🏛️' },
      { id: 'web', name: 'Web / UI / QA', color: '#f472b6', zone: { x: 14, y: 2 }, icon: '🌐' },
      { id: 'devops', name: 'DevOps / Infra', color: '#fb923c', zone: { x: 2, y: 8 }, icon: '🔧' },
      { id: 'seo', name: 'SEO', color: '#a78bfa', zone: { x: 8, y: 8 }, icon: '🔍' },
      { id: 'gsd', name: 'GSD', color: '#f87171', zone: { x: 14, y: 8 }, icon: '🚀' },
      { id: 'data', name: 'Data / Research', color: '#2dd4bf', zone: { x: 8, y: 14 }, icon: '📊' },
      { id: 'other', name: 'Specialists', color: '#fbbf24', zone: { x: 2, y: 14 }, icon: '🎯' }
    ],
    agents: [
      { id: 'bug-auditor', name: 'Bug Auditor', category: 'code', description: 'Runtime bug scanner — error handling gaps, race conditions, memory leaks, null refs.', capabilities: ['Error handling', 'Race conditions', 'Memory leaks', 'Null refs'], personality: 'Paranoid detective — always suspecting something is broken' },
      { id: 'code-auditor', name: 'Code Auditor', category: 'code', description: 'Reviews patterns, maintainability, complexity, and consistency.', capabilities: ['Pattern review', 'Complexity', 'Maintainability', 'Consistency'], personality: 'Strict librarian — everything in its place' },
      { id: 'code-fixer', name: 'Code Fixer', category: 'code', description: 'Implements fixes from FIXES.md with production-quality code.', capabilities: ['Fix implementation', 'Pattern matching', 'Quality assurance'], personality: 'Skilled surgeon — precise cuts, clean stitches' },
      { id: 'perf-auditor', name: 'Perf Auditor', category: 'code', description: 'Bundle size, Core Web Vitals, slow queries, memory leaks.', capabilities: ['Bundle analysis', 'Web Vitals', 'Query optimization', 'Memory profiling'], personality: 'Speed demon — obsessed with milliseconds' },
      { id: 'security-auditor', name: 'Security Auditor', category: 'code', description: 'OWASP Top 10, injection, auth, secrets, headers.', capabilities: ['OWASP Top 10', 'Injection', 'Auth analysis', 'Secret scanning'], personality: 'Paranoid bodyguard — trusts nobody' },
      { id: 'test-runner', name: 'Test Runner', category: 'code', description: 'Runs tests and validates fixes across TypeScript, lint, unit tests.', capabilities: ['Test execution', 'Lint validation', 'TypeScript', 'Fix verification'], personality: 'Relentless QA — one more time, just to be sure' },
      { id: 'test-writer', name: 'Test Writer', category: 'code', description: 'Auto-generates unit tests, integration tests, finds coverage gaps.', capabilities: ['Unit tests', 'Integration tests', 'Coverage analysis', 'Edge cases'], personality: 'Creative pessimist — imagines every failure' },
      { id: 'architect-reviewer', name: 'Architect', category: 'arch', description: 'Supervisor: coordinates auditors, validates fixes, iterates until production-ready.', capabilities: ['Audit coordination', 'Fix validation', 'Quality gates', 'Production readiness'], personality: 'Wise elder — sees the big picture' },
      { id: 'doc-auditor', name: 'Doc Auditor', category: 'arch', description: 'Documentation coverage, missing docs, outdated comments, API gaps.', capabilities: ['Coverage analysis', 'Staleness check', 'API gaps', 'Comment quality'], personality: 'Meticulous historian — every change recorded' },
      { id: 'fix-planner', name: 'Fix Planner', category: 'arch', description: 'Prioritized fix plans from audit findings, FIXES.md generation.', capabilities: ['Priority scoring', 'Deduplication', 'Plan generation', 'Impact analysis'], personality: 'Strategic general — knows which battles first' },
      { id: 'pr-writer', name: 'PR Writer', category: 'arch', description: 'PR descriptions, change summaries, review checklists.', capabilities: ['PR description', 'Change summary', 'Checklist', 'Review prep'], personality: 'Eloquent storyteller — clear PR narratives' },
      { id: 'api-designer', name: 'API Designer', category: 'arch', description: 'REST/GraphQL API design, OpenAPI specs, endpoint structure.', capabilities: ['REST design', 'GraphQL', 'OpenAPI specs', 'Versioning'], personality: 'Perfectionist architect — every endpoint has purpose' },
      { id: 'api-tester', name: 'API Tester', category: 'web', description: 'Endpoint testing: discovery, validation, auth flows, error handling.', capabilities: ['Endpoint discovery', 'Auth testing', 'Error handling', 'Validation'], personality: 'Methodical hacker — probes every endpoint' },
      { id: 'browser-qa', name: 'Browser QA', category: 'web', description: 'Navigates web apps via Chrome to find UI bugs, console errors, UX issues.', capabilities: ['UI bugs', 'Console monitoring', 'UX evaluation', 'Cross-browser'], personality: 'Picky user — clicks everything, complains about pixels' },
      { id: 'console-monitor', name: 'Console Monitor', category: 'web', description: 'Real-time console monitoring for errors, warnings, logs.', capabilities: ['Error tracking', 'Warning alerts', 'Log aggregation', 'Real-time'], personality: 'Night watch — silently monitors, alerts on danger' },
      { id: 'fullstack-qa', name: 'Fullstack QA', category: 'web', description: 'Coordinates browser QA + code fixer for test-fix-verify cycles.', capabilities: ['Test orchestration', 'Fix coordination', 'Verify cycles', 'E2E'], personality: 'Drill sergeant — test, fix, verify, repeat!' },
      { id: 'ui-auditor', name: 'UI Auditor', category: 'web', description: 'UI/UX consistency, design patterns, accessibility (a11y).', capabilities: ['Consistency', 'A11y auditing', 'Pattern validation', 'Design review'], personality: 'Design critic — notices the 1px misalignment' },
      { id: 'visual-diff', name: 'Visual Diff', category: 'web', description: 'Screenshot comparison for visual regression testing.', capabilities: ['Screenshot capture', 'Pixel comparison', 'Regression detection', 'Visual reports'], personality: 'Eagle eye — spots invisible changes' },
      { id: 'db-auditor', name: 'DB Auditor', category: 'devops', description: 'Schema design, N+1 queries, indexes, connection pooling.', capabilities: ['Schema review', 'N+1 detection', 'Index optimization', 'Connection analysis'], personality: 'Data philosopher — queries are poetry' },
      { id: 'dep-auditor', name: 'Dep Auditor', category: 'devops', description: 'Outdated packages, vulnerabilities, licenses, unused deps.', capabilities: ['Version checks', 'CVE scanning', 'License audit', 'Unused detection'], personality: 'Supply chain inspector — checks everything' },
      { id: 'deploy-checker', name: 'Deploy Checker', category: 'devops', description: 'Pre-deploy validation: build, env vars, migrations, health checks.', capabilities: ['Build validation', 'Env check', 'Migration verify', 'Health checks'], personality: 'Launch control — everything green before liftoff' },
      { id: 'env-validator', name: 'Env Validator', category: 'devops', description: 'Compares .env.example vs .env, checks for missing secrets.', capabilities: ['Env comparison', 'Secret detection', 'Config validation', 'Missing vars'], personality: 'Config nerd — one missing var ruins the day' },
      { id: 'infra-auditor', name: 'Infra Auditor', category: 'devops', description: 'Infrastructure checker: env vars, headers, database config.', capabilities: ['Infra review', 'Header analysis', 'DB config', 'Deployment audit'], personality: 'Ops veteran — has seen every outage' },
      { id: 'migration-agent', name: 'Migration Agent', category: 'devops', description: 'Schema migrations, data transforms, rollback scripts, ORM patterns.', capabilities: ['Schema migrations', 'Data transforms', 'Rollback scripts', 'ORM patterns'], personality: 'Careful mover — never drops without backup' },
      { id: 'seo-auditor', name: 'SEO Auditor', category: 'seo', description: 'Meta tags, OpenGraph, sitemap, structured data audit.', capabilities: ['Meta tags', 'OpenGraph', 'Sitemap', 'Schema markup'], personality: 'Search whisperer — knows what Google wants' },
      { id: 'seo-content', name: 'SEO Content', category: 'seo', description: 'E-E-A-T signals, readability, content depth, AI citation readiness.', capabilities: ['E-E-A-T', 'Readability', 'Content depth', 'Citation ready'], personality: 'Content connoisseur — quality over quantity' },
      { id: 'seo-performance', name: 'SEO Performance', category: 'seo', description: 'Core Web Vitals and page load performance.', capabilities: ['Core Web Vitals', 'Load testing', 'Performance scoring'], personality: 'Speed oracle — predicts load times' },
      { id: 'seo-schema', name: 'SEO Schema', category: 'seo', description: 'Schema.org structured data: detect, validate, generate JSON-LD.', capabilities: ['Schema detection', 'JSON-LD', 'Validation', 'Rich results'], personality: 'Structured thinker — everything needs markup' },
      { id: 'seo-sitemap', name: 'SEO Sitemap', category: 'seo', description: 'XML sitemap validation and generation with industry templates.', capabilities: ['Sitemap validation', 'Generation', 'URL auditing', 'Templates'], personality: 'Map maker — charts every page' },
      { id: 'seo-technical', name: 'SEO Technical', category: 'seo', description: 'Crawlability, indexability, security, mobile, JS rendering.', capabilities: ['Crawlability', 'Indexability', 'Security', 'Mobile', 'JS rendering'], personality: 'Technical detective — reads robots.txt for fun' },
      { id: 'seo-visual', name: 'SEO Visual', category: 'seo', description: 'Screenshots, mobile rendering, above-the-fold content analysis.', capabilities: ['Screenshots', 'Mobile rendering', 'Above-fold analysis'], personality: 'Visual critic — judges every pixel' },
      { id: 'gsd-mapper', name: 'Codebase Mapper', category: 'gsd', description: 'Explores codebases, writes structured analysis for tech/arch/quality.', capabilities: ['Codebase exploration', 'Tech analysis', 'Architecture mapping', 'Quality assessment'], personality: 'Cartographer — maps unknown territory' },
      { id: 'gsd-debugger', name: 'GSD Debugger', category: 'gsd', description: 'Scientific debugging with sessions, checkpoints, root cause analysis.', capabilities: ['Scientific debugging', 'Session management', 'Checkpoints', 'Root cause'], personality: 'Forensic scientist — follows the evidence' },
      { id: 'gsd-executor', name: 'GSD Executor', category: 'gsd', description: 'Executes plans with atomic commits, deviation handling, state management.', capabilities: ['Plan execution', 'Atomic commits', 'Deviation handling', 'State management'], personality: 'Disciplined soldier — follows the plan' },
      { id: 'gsd-integration', name: 'Integration Checker', category: 'gsd', description: 'Verifies cross-phase integration and E2E flows.', capabilities: ['Integration testing', 'E2E flows', 'Phase connection', 'Workflow validation'], personality: 'Bridge builder — makes pieces fit' },
      { id: 'gsd-researcher', name: 'Phase Researcher', category: 'gsd', description: 'Researches implementation approaches before planning.', capabilities: ['Implementation research', 'Feasibility', 'Approach comparison'], personality: 'Scholar — reads everything before coding' },
      { id: 'gsd-plan-checker', name: 'Plan Checker', category: 'gsd', description: 'Goal-backward analysis to verify plans achieve objectives.', capabilities: ['Goal verification', 'Backward analysis', 'Plan quality', 'Gap detection'], personality: "Devil's advocate — challenges every assumption" },
      { id: 'gsd-planner', name: 'GSD Planner', category: 'gsd', description: 'Creates executable phase plans with task breakdown and dependencies.', capabilities: ['Task breakdown', 'Dependencies', 'Plan generation', 'Goal alignment'], personality: 'Master strategist — turns chaos into steps' },
      { id: 'gsd-proj-researcher', name: 'Project Researcher', category: 'gsd', description: 'Researches domain ecosystem before roadmap creation.', capabilities: ['Domain research', 'Ecosystem analysis', 'Best practices'], personality: 'Deep diver — surfaces with insights' },
      { id: 'gsd-synthesizer', name: 'Research Synthesizer', category: 'gsd', description: 'Synthesizes parallel research outputs into coherent summaries.', capabilities: ['Research synthesis', 'Pattern extraction', 'Summary generation'], personality: 'Editor-in-chief — distills volumes into clarity' },
      { id: 'gsd-roadmapper', name: 'GSD Roadmapper', category: 'gsd', description: 'Project roadmaps with phase breakdown and success criteria.', capabilities: ['Roadmap creation', 'Phase planning', 'Requirements', 'Success criteria'], personality: 'Visionary planner — sees path from here to done' },
      { id: 'gsd-verifier', name: 'GSD Verifier', category: 'gsd', description: 'Verifies phase goal achievement through codebase analysis.', capabilities: ['Goal verification', 'Codebase analysis', 'Achievement validation'], personality: 'Quality gate — nothing passes without proof' },
      { id: 'doc-writer', name: 'Doc Writer', category: 'other', description: 'README files, API docs, JSDoc/TSDoc, inline documentation.', capabilities: ['README', 'API docs', 'JSDoc/TSDoc', 'Inline docs'], personality: 'Technical author — explains complex things simply' },
      { id: 'refactoring-agent', name: 'Refactoring Agent', category: 'other', description: 'Extract functions, rename symbols, restructure files, reduce complexity.', capabilities: ['Extraction', 'Renaming', 'Restructuring', 'Complexity reduction'], personality: 'Marie Kondo of code — spark joy or refactor' },
      { id: 'seed-generator', name: 'Seed Generator', category: 'data', description: 'Creates realistic seed data based on database schemas.', capabilities: ['Seed generation', 'Schema analysis', 'Realistic data', 'Relationships'], personality: 'Data chef — cooks up test data on demand' }
    ]
  };

  function init() {
    categories = AGENT_DATA.categories;
    agents = AGENT_DATA.agents.map((a, i) => {
      const cat = categories.find(c => c.id === a.category);
      const zoneAgents = AGENT_DATA.agents.filter(ag => ag.category === a.category);
      const idxInZone = zoneAgents.indexOf(a);
      const cols = Math.ceil(Math.sqrt(zoneAgents.length));
      const row = Math.floor(idxInZone / cols);
      const col = idxInZone % cols;

      return {
        ...a,
        color: cat?.color || '#888',
        categoryName: cat?.name || 'Unknown',
        categoryIcon: cat?.icon || '❓',
        status: 'idle',
        // World position (tile coords)
        tx: (cat?.zone.x || 0) + col * 1.5 + Math.random() * 0.5,
        ty: (cat?.zone.y || 0) + row * 1.5 + Math.random() * 0.5,
        // Animation state
        animFrame: Math.floor(Math.random() * 60),
        wanderTarget: null,
        wanderTimer: Math.random() * 200,
        facing: Math.random() > 0.5 ? 1 : -1,
        bobOffset: Math.random() * Math.PI * 2
      };
    });
  }

  function getAgents() { return agents; }
  function getCategories() { return categories; }
  function getAgent(id) { return agents.find(a => a.id === id); }

  function setStatus(id, status) {
    const agent = agents.find(a => a.id === id);
    if (agent) agent.status = status;
  }

  function getSelected() { return selectedAgentId; }
  function setSelected(id) { selectedAgentId = id; }

  function getAgentsByCategory(catId) {
    return agents.filter(a => a.category === catId);
  }

  function search(query) {
    const q = query.toLowerCase();
    return agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.categoryName.toLowerCase().includes(q) ||
      a.capabilities.some(c => c.toLowerCase().includes(q))
    );
  }

  function getStats() {
    const byStatus = { idle: 0, working: 0, error: 0 };
    const byCat = {};
    agents.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byCat[a.category] = (byCat[a.category] || 0) + 1;
    });
    return { total: agents.length, byStatus, byCat };
  }

  // Simulate random status changes
  function simulateActivity() {
    agents.forEach(a => {
      if (Math.random() < 0.003) {
        const r = Math.random();
        if (r < 0.7) a.status = 'idle';
        else if (r < 0.95) a.status = 'working';
        else a.status = 'error';
      }
    });
  }

  return { init, getAgents, getCategories, getAgent, setStatus, getSelected, setSelected, getAgentsByCategory, search, getStats, simulateActivity };
})();
