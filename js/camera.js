/* ============================================
   Camera — Pan, Zoom, and Input Handling
   ============================================ */

const Camera = (() => {
  let state = {
    offsetX: 0,
    offsetY: 0,
    zoom: 2,
    minZoom: 0.5,
    maxZoom: 5,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    targetZoom: 2,
    smoothing: 0.15
  };

  let canvas = null;

  function init(canvasEl) {
    canvas = canvasEl;
    // Center the world
    state.offsetX = canvas.width / 2;
    state.offsetY = canvas.height / 4;
    state.targetOffsetX = state.offsetX;
    state.targetOffsetY = state.offsetY;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

    // Touch support
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
  }

  function onMouseDown(e) {
    state.isDragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  }

  function onMouseMove(e) {
    if (state.isDragging) {
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.targetOffsetX += dx;
      state.targetOffsetY += dy;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
    }
  }

  function onMouseUp(e) {
    if (!state.isDragging) return;
    state.isDragging = false;
    canvas.style.cursor = 'grab';
  }

  function onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const newZoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.targetZoom * (1 + delta * 5)));

    // Zoom toward cursor
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomRatio = newZoom / state.targetZoom;
    state.targetOffsetX = mx - (mx - state.targetOffsetX) * zoomRatio;
    state.targetOffsetY = my - (my - state.targetOffsetY) * zoomRatio;
    state.targetZoom = newZoom;
  }

  function onDblClick(e) {
    // Reset view
    state.targetZoom = 2;
    state.targetOffsetX = canvas.width / 2;
    state.targetOffsetY = canvas.height / 4;
  }

  let lastTouchDist = 0;
  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      state.isDragging = true;
      state.lastX = e.touches[0].clientX;
      state.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && state.isDragging) {
      const dx = e.touches[0].clientX - state.lastX;
      const dy = e.touches[0].clientY - state.lastY;
      state.targetOffsetX += dx;
      state.targetOffsetY += dy;
      state.lastX = e.touches[0].clientX;
      state.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / lastTouchDist;
      state.targetZoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.targetZoom * scale));
      lastTouchDist = dist;
    }
  }

  function onTouchEnd() {
    state.isDragging = false;
  }

  function update() {
    state.offsetX += (state.targetOffsetX - state.offsetX) * state.smoothing;
    state.offsetY += (state.targetOffsetY - state.offsetY) * state.smoothing;
    state.zoom += (state.targetZoom - state.zoom) * state.smoothing;
  }

  function getState() { return state; }

  function focusOn(tx, ty) {
    const screen = PixelRenderer.tileToScreen(tx, ty, { zoom: state.targetZoom, offsetX: 0, offsetY: 0 });
    state.targetOffsetX = canvas.width / 2 - screen.x;
    state.targetOffsetY = canvas.height / 2 - screen.y;
  }

  return { init, update, getState, focusOn };
})();
