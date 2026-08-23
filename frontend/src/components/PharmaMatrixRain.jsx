import React, { useRef, useEffect, useCallback } from 'react';

const PHARMA_SYMBOLS = [
  // Pills
  '\u{1F48A}', // pill emoji as fallback reference
  // We use SVG-drawn symbols instead for crisp rendering
];

// Draw pharmacy items as crisp vector shapes
const drawPharmaIcon = (ctx, type, x, y, size, opacity, color) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);

  const roundedRect = (rx, ry, rw, rh, r) => {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
  };

  switch (type) {
    case 0: // Capsule pill - top half
      ctx.beginPath();
      const capW = size * 0.35, capH = size * 0.85;
      roundedRect(-capW / 2, -capH / 2, capW, capH / 2, capW / 3);
      ctx.fillStyle = color;
      ctx.fill();
      // Bottom half
      ctx.beginPath();
      roundedRect(-capW / 2, 0, capW, capH / 2, capW / 3);
      ctx.fillStyle = shiftColor(color, -30);
      ctx.fill();
      break;

    case 1: // Round tablet
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      // Score line
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, 0);
      ctx.lineTo(size * 0.2, 0);
      ctx.strokeStyle = shiftColor(color, -40);
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 2: // Syringe
      ctx.fillStyle = color;
      // Barrel
      ctx.fillRect(-size * 0.08, -size * 0.35, size * 0.16, size * 0.55);
      // Plunger
      ctx.fillRect(-size * 0.04, -size * 0.5, size * 0.08, size * 0.15);
      // Needle
      ctx.fillRect(-size * 0.015, size * 0.2, size * 0.03, size * 0.25);
      ctx.fillStyle = shiftColor(color, 20);
      ctx.fillRect(-size * 0.015, size * 0.2, size * 0.03, size * 0.25);
      // Flanges
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.15, -size * 0.36, size * 0.3, size * 0.03);
      break;

    case 3: // Syrup bottle
      ctx.fillStyle = color;
      // Body
      ctx.beginPath();
      roundedRect(-size * 0.18, -size * 0.15, size * 0.36, size * 0.45, 4);
      ctx.fill();
      // Neck
      ctx.fillRect(-size * 0.08, -size * 0.3, size * 0.16, size * 0.15);
      // Cap
      ctx.fillStyle = shiftColor(color, -50);
      ctx.fillRect(-size * 0.1, -size * 0.4, size * 0.2, size * 0.1);
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-size * 0.12, -size * 0.02, size * 0.24, size * 0.15);
      break;

    case 4: // Heart rate / Rx symbol
      ctx.font = `bold ${size * 0.5}px monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', 0, 0);
      break;

    case 5: // Bandage / cross
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.06, -size * 0.25, size * 0.12, size * 0.5);
      ctx.fillRect(-size * 0.25, -size * 0.06, size * 0.5, size * 0.12);
      break;

    case 6: // Dropper
      ctx.fillStyle = color;
      // Bulb
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.25, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tube
      ctx.fillRect(-size * 0.04, -size * 0.1, size * 0.08, size * 0.35);
      // Tip
      ctx.beginPath();
      ctx.moveTo(-size * 0.04, size * 0.25);
      ctx.lineTo(size * 0.04, size * 0.25);
      ctx.lineTo(0, size * 0.38);
      ctx.closePath();
      ctx.fill();
      break;

    default: // Small pill dot
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
  }

  ctx.restore();
};

const shiftColor = (hex, amount) => {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `rgb(${r},${g},${b})`;
};

const COLORS = [
  '#F97316', // orange-500
  '#FB923C', // orange-400
  '#FDBA74', // orange-300
  '#EA580C', // orange-600
  '#22D3EE', // cyan-400 (for syringe accents)
  '#34D399', // emerald-400
  '#FBBF24', // amber-400
  '#F472B6', // pink-400
];

const PharmaMatrixRain = ({ className = '', style = {} }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const columnsRef = useRef([]);

  const initColumns = useCallback((width, height) => {
    const colWidth = 28;
    const numCols = Math.ceil(width / colWidth);
    const cols = [];

    for (let i = 0; i < numCols; i++) {
      const numDrops = 3 + Math.floor(Math.random() * 3);
      for (let d = 0; d < numDrops; d++) {
        cols.push({
          x: i * colWidth + colWidth / 2 + (Math.random() - 0.5) * 14,
          y: Math.random() * height, // Start scattered across the screen
          speed: 0.5 + Math.random() * 1.5,
          size: 18 + Math.random() * 14,
          type: Math.floor(Math.random() * 8),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 0.12 + Math.random() * 0.2,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02,
          trail: [],
          trailLen: 3 + Math.floor(Math.random() * 4),
        });
      }
    }
    return cols;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.parentElement.clientWidth;
      h = canvas.parentElement.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      columnsRef.current = initColumns(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      columnsRef.current.forEach(drop => {
        // Update trail
        drop.trail.unshift({ x: drop.x, y: drop.y, opacity: drop.opacity });
        if (drop.trail.length > drop.trailLen) drop.trail.pop();

        // Draw trail (fading)
        drop.trail.forEach((t, idx) => {
          const fadeOp = t.opacity * (1 - idx / drop.trailLen) * 0.4;
          drawPharmaIcon(ctx, drop.type, t.x, t.y, drop.size * 0.7, fadeOp, drop.color);
        });

        // Draw main icon
        drawPharmaIcon(ctx, drop.type, drop.x, drop.y, drop.size, drop.opacity, drop.color);

        // Move down
        drop.y += drop.speed;
        drop.rotation += drop.rotSpeed;

        // Reset when off screen
        if (drop.y > h + 50) {
          drop.y = -30 - Math.random() * 100;
          drop.x = drop.x + (Math.random() - 0.5) * 20;
          drop.type = Math.floor(Math.random() * 8);
          drop.color = COLORS[Math.floor(Math.random() * COLORS.length)];
          drop.opacity = 0.15 + Math.random() * 0.35;
          drop.trail = [];
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initColumns]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ ...style, zIndex: 5, mixBlendMode: 'screen' }}
      data-testid="pharma-matrix-rain"
    />
  );
};

export default PharmaMatrixRain;
