/* ============================================
   Pixel Renderer — Sprite Generation & Drawing
   ============================================ */

const PixelRenderer = (() => {
  const TILE_W = 48;
  const TILE_H = 24;
  const spriteCache = {};

  // Generate a unique pixel art character from agent properties
  function generateSprite(agent) {
    if (spriteCache[agent.id]) return spriteCache[agent.id];

    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const color = agent.color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Deterministic hash from agent id for unique body shapes
    let hash = 0;
    for (let i = 0; i < agent.id.length; i++) {
      hash = ((hash << 5) - hash) + agent.id.charCodeAt(i);
      hash = hash & hash;
    }
    const h = Math.abs(hash);

    // Darker shade for outline/details
    const dr = Math.max(0, r - 60);
    const dg = Math.max(0, g - 60);
    const db = Math.max(0, b - 60);

    // Lighter shade for highlights
    const lr = Math.min(255, r + 60);
    const lg = Math.min(255, g + 60);
    const lb = Math.min(255, b + 60);

    const main = `rgb(${r},${g},${b})`;
    const dark = `rgb(${dr},${dg},${db})`;
    const light = `rgb(${lr},${lg},${lb})`;
    const skin = '#fcd5b4';
    const skinDark = '#d4a574';
    const eyeColor = '#1a1a2e';

    ctx.imageSmoothingEnabled = false;

    // Head (skin)
    const headW = 6 + (h % 3);
    const headX = Math.floor((size - headW) / 2);
    ctx.fillStyle = skin;
    ctx.fillRect(headX, 2, headW, 4);
    ctx.fillStyle = skinDark;
    ctx.fillRect(headX, 5, headW, 1); // chin shadow

    // Eyes
    ctx.fillStyle = eyeColor;
    const eyeY = 3;
    ctx.fillRect(headX + 1, eyeY, 1, 1);
    ctx.fillRect(headX + headW - 2, eyeY, 1, 1);

    // Hair/hat based on hash
    const hairStyle = h % 5;
    ctx.fillStyle = dark;
    if (hairStyle === 0) {
      ctx.fillRect(headX, 1, headW, 2); // flat top
    } else if (hairStyle === 1) {
      ctx.fillRect(headX - 1, 1, headW + 2, 1); // wide hat
      ctx.fillRect(headX, 0, headW, 1);
    } else if (hairStyle === 2) {
      ctx.fillRect(headX, 1, headW, 1); // beanie
      ctx.fillStyle = light;
      ctx.fillRect(headX + 1, 1, headW - 2, 1);
    } else if (hairStyle === 3) {
      ctx.fillRect(headX - 1, 2, 1, 3); // side hair
      ctx.fillRect(headX + headW, 2, 1, 3);
      ctx.fillRect(headX, 1, headW, 1);
    } else {
      ctx.fillRect(headX, 0, headW, 2); // tall hat
      ctx.fillStyle = light;
      ctx.fillRect(headX + 1, 0, headW - 2, 1);
    }

    // Body
    const bodyW = 6 + (h % 2);
    const bodyX = Math.floor((size - bodyW) / 2);
    ctx.fillStyle = main;
    ctx.fillRect(bodyX, 6, bodyW, 5);

    // Body detail
    const detailStyle = (h >> 3) % 4;
    ctx.fillStyle = light;
    if (detailStyle === 0) {
      ctx.fillRect(bodyX + 1, 7, bodyW - 2, 1); // stripe
    } else if (detailStyle === 1) {
      ctx.fillRect(bodyX + Math.floor(bodyW / 2), 7, 1, 3); // center line
    } else if (detailStyle === 2) {
      ctx.fillRect(bodyX + 1, 8, 1, 1); // pocket
      ctx.fillRect(bodyX + bodyW - 2, 8, 1, 1);
    }

    // Arms
    ctx.fillStyle = skin;
    ctx.fillRect(bodyX - 1, 7, 1, 3);
    ctx.fillRect(bodyX + bodyW, 7, 1, 3);

    // Legs
    ctx.fillStyle = dark;
    ctx.fillRect(bodyX + 1, 11, 2, 3);
    ctx.fillRect(bodyX + bodyW - 3, 11, 2, 3);

    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(bodyX, 14, 3, 1);
    ctx.fillRect(bodyX + bodyW - 3, 14, 3, 1);

    spriteCache[agent.id] = canvas;
    return canvas;
  }

  // Generate a status indicator
  function drawStatusIndicator(ctx, x, y, status, frame) {
    const colors = { idle: '#4ade80', working: '#fbbf24', error: '#f87171' };
    const color = colors[status] || colors.idle;

    if (status === 'working') {
      const alpha = 0.5 + 0.5 * Math.sin(frame * 0.1);
      ctx.globalAlpha = alpha;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw a single agent on canvas
  function drawAgent(ctx, agent, screenX, screenY, frame, isSelected, scale) {
    const sprite = generateSprite(agent);
    const drawSize = 16 * scale;
    const bobY = Math.sin((frame + agent.bobOffset * 60) * 0.05) * 1.5 * scale;

    ctx.save();

    // Selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#7c5cfc';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7c5cfc';
      ctx.shadowBlur = 10;
      ctx.strokeRect(
        screenX - drawSize / 2 - 2,
        screenY - drawSize + bobY - 2,
        drawSize + 4,
        drawSize + 4
      );
      ctx.shadowBlur = 0;
    }

    // Draw sprite (flipped if facing left)
    if (agent.facing < 0) {
      ctx.translate(screenX + drawSize / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, screenY - drawSize + bobY, drawSize, drawSize);
    } else {
      ctx.drawImage(sprite, screenX - drawSize / 2, screenY - drawSize + bobY, drawSize, drawSize);
    }

    ctx.restore();

    // Status dot
    drawStatusIndicator(ctx, screenX, screenY - drawSize - 4 + bobY, agent.status, frame);

    // Name tag
    ctx.save();
    ctx.font = `${Math.max(8, 9 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const textY = screenY + 6 * scale;
    const textWidth = ctx.measureText(agent.name).width;
    ctx.fillRect(screenX - textWidth / 2 - 3, textY - 8, textWidth + 6, 11);
    ctx.fillStyle = agent.color;
    ctx.fillText(agent.name, screenX, textY);
    ctx.restore();
  }

  // Draw isometric tile
  function drawTile(ctx, x, y, color, scale) {
    const w = TILE_W * scale;
    const h = TILE_H * scale;
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Draw zone label
  function drawZoneLabel(ctx, x, y, icon, name, color, scale) {
    ctx.save();
    ctx.font = `${14 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fillText(`${icon} ${name}`, x, y);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Tile coords to screen coords (isometric)
  function tileToScreen(tx, ty, camera) {
    const sx = (tx - ty) * (TILE_W / 2) * camera.zoom;
    const sy = (tx + ty) * (TILE_H / 2) * camera.zoom;
    return {
      x: sx + camera.offsetX,
      y: sy + camera.offsetY
    };
  }

  // Screen coords to tile coords (inverse isometric)
  function screenToTile(sx, sy, camera) {
    const mx = (sx - camera.offsetX) / camera.zoom;
    const my = (sy - camera.offsetY) / camera.zoom;
    const tx = (mx / (TILE_W / 2) + my / (TILE_H / 2)) / 2;
    const ty = (my / (TILE_H / 2) - mx / (TILE_W / 2)) / 2;
    return { tx, ty };
  }

  return { generateSprite, drawAgent, drawTile, drawZoneLabel, tileToScreen, screenToTile, TILE_W, TILE_H };
})();
