/* ============================================
   Dispatch — Future Task Dispatch System
   ============================================ */

const Dispatch = (() => {
  // Placeholder for future orchestration integration
  // When ready, this will connect to Claude CLI to dispatch real tasks

  function init() {
    // Uncomment when ready to enable dispatch bar
    // document.getElementById('dispatch-bar').classList.remove('hidden');
  }

  function sendTask(agentId, taskDescription) {
    console.log(`[Dispatch] Would send to ${agentId}: ${taskDescription}`);
    // Future: integrate with Claude CLI task() API
    return { status: 'queued', agentId, task: taskDescription };
  }

  return { init, sendTask };
})();
