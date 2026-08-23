import React, { useRef, useEffect, useCallback } from 'react';

const shiftColor = (hex, amount) => {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `rgb(${r},${g},${b})`;
};

const ICON_COUNT = 7;

const drawLabIcon = (ctx, type, x, y, size, opacity, color) => {
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
    case 0: { // Collection vial — open top, no cap
      ctx.fillStyle = color;
      // Tube body
      ctx.beginPath();
      roundedRect(-size * 0.08, -size * 0.3, size * 0.16, size * 0.55, 2);
      ctx.fill();
      // Round bottom
      ctx.beginPath();
      ctx.arc(0, size * 0.25, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // Open top rim
      ctx.strokeStyle = shiftColor(color, 30);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-size * 0.09, -size * 0.3);
      ctx.lineTo(size * 0.09, -size * 0.3);
      ctx.stroke();
      // Blood/sample level inside
      ctx.fillStyle = 'rgba(220,38,38,0.45)';
      ctx.fillRect(-size * 0.06, size * 0.02, size * 0.12, size * 0.18);
      break;
    }

    case 1: { // HIV rapid test card
      ctx.fillStyle = color;
      // Card body
      roundedRect(-size * 0.22, -size * 0.32, size * 0.44, size * 0.64, 4);
      ctx.fill();
      // Test strip channel
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-size * 0.03, -size * 0.22, size * 0.06, size * 0.35);
      // Result window (oval)
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.08, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // C and T markers
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `bold ${size * 0.08}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', -size * 0.12, -size * 0.08);
      ctx.fillText('T', size * 0.12, -size * 0.08);
      // Sample well at bottom
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(0, size * 0.18, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `bold ${size * 0.1}px monospace`;
      ctx.fillText('HIV', 0, -size * 0.22);
      break;
    }

    case 2: { // Sample container / specimen cup
      ctx.fillStyle = color;
      // Cup body
      ctx.beginPath();
      ctx.moveTo(-size * 0.12, -size * 0.15);
      ctx.lineTo(size * 0.12, -size * 0.15);
      ctx.lineTo(size * 0.14, size * 0.25);
      ctx.lineTo(-size * 0.14, size * 0.25);
      ctx.closePath();
      ctx.fill();
      // Lid
      ctx.fillStyle = shiftColor(color, -50);
      roundedRect(-size * 0.14, -size * 0.25, size * 0.28, size * 0.1, 2);
      ctx.fill();
      // Sample level
      ctx.fillStyle = 'rgba(251,191,36,0.35)';
      ctx.fillRect(-size * 0.09, size * 0.02, size * 0.18, size * 0.18);
      // Label stripe
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-size * 0.08, -size * 0.08, size * 0.16, size * 0.06);
      break;
    }

    case 3: { // Microscope
      ctx.fillStyle = color;
      // Base plate
      ctx.fillRect(-size * 0.16, size * 0.2, size * 0.32, size * 0.05);
      // Vertical stand
      ctx.fillRect(-size * 0.03, -size * 0.1, size * 0.06, size * 0.3);
      // Eyepiece top
      ctx.fillRect(-size * 0.05, -size * 0.3, size * 0.1, size * 0.12);
      // Arm extending right
      ctx.fillRect(size * 0.03, -size * 0.15, size * 0.12, size * 0.04);
      // Objective lens
      ctx.fillStyle = shiftColor(color, 25);
      ctx.fillRect(size * 0.12, -size * 0.12, size * 0.04, size * 0.1);
      // Stage
      ctx.fillStyle = shiftColor(color, -20);
      ctx.fillRect(-size * 0.1, size * 0.1, size * 0.2, size * 0.03);
      break;
    }

    case 4: { // DNA double helix
      ctx.lineWidth = 2;
      // Strand 1
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let t = -size * 0.38; t < size * 0.38; t += 2) {
        const xOff = Math.sin(t * 0.14) * size * 0.13;
        if (t === -size * 0.38) ctx.moveTo(xOff, t);
        else ctx.lineTo(xOff, t);
      }
      ctx.stroke();
      // Strand 2
      ctx.strokeStyle = shiftColor(color, -35);
      ctx.beginPath();
      for (let t = -size * 0.38; t < size * 0.38; t += 2) {
        const xOff = -Math.sin(t * 0.14) * size * 0.13;
        if (t === -size * 0.38) ctx.moveTo(xOff, t);
        else ctx.lineTo(xOff, t);
      }
      ctx.stroke();
      // Rungs connecting the strands
      ctx.strokeStyle = `rgba(255,255,255,0.2)`;
      ctx.lineWidth = 1;
      for (let t = -size * 0.34; t < size * 0.34; t += size * 0.1) {
        const x1 = Math.sin(t * 0.14) * size * 0.13;
        const x2 = -Math.sin(t * 0.14) * size * 0.13;
        ctx.beginPath();
        ctx.moveTo(x1, t);
        ctx.lineTo(x2, t);
        ctx.stroke();
      }
      break;
    }

    case 5: { // Sonography / Ultrasound machine
      ctx.fillStyle = color;
      // Monitor body
      roundedRect(-size * 0.18, -size * 0.35, size * 0.36, size * 0.3, 3);
      ctx.fill();
      // Screen
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundedRect(-size * 0.14, -size * 0.31, size * 0.28, size * 0.2, 2);
      ctx.fill();
      // Scan wave on screen
      ctx.strokeStyle = shiftColor(color, 40);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let sx = -size * 0.12; sx < size * 0.12; sx += 2) {
        const sy = -size * 0.21 + Math.sin(sx * 0.4) * size * 0.04;
        if (sx === -size * 0.12) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      // Stand / pole
      ctx.fillStyle = shiftColor(color, -30);
      ctx.fillRect(-size * 0.025, -size * 0.05, size * 0.05, size * 0.2);
      // Base
      ctx.fillRect(-size * 0.1, size * 0.15, size * 0.2, size * 0.04);
      // Probe (handheld transducer)
      ctx.fillStyle = shiftColor(color, 15);
      ctx.beginPath();
      ctx.moveTo(size * 0.18, -size * 0.15);
      ctx.lineTo(size * 0.25, -size * 0.05);
      ctx.lineTo(size * 0.22, size * 0.05);
      ctx.lineTo(size * 0.15, size * 0.02);
      ctx.closePath();
      ctx.fill();
      // Probe cable
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size * 0.17, -size * 0.07);
      ctx.quadraticCurveTo(size * 0.1, -size * 0.02, size * 0.02, -size * 0.05);
      ctx.stroke();
      break;
    }

    default: { // ECG machine
      ctx.fillStyle = color;
      // Machine body
      roundedRect(-size * 0.2, -size * 0.25, size * 0.4, size * 0.35, 3);
      ctx.fill();
      // Screen area
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundedRect(-size * 0.16, -size * 0.21, size * 0.32, size * 0.18, 2);
      ctx.fill();
      // ECG waveform (PQRST)
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const baseY = -size * 0.12;
      ctx.moveTo(-size * 0.14, baseY);
      // P wave
      ctx.lineTo(-size * 0.1, baseY);
      ctx.quadraticCurveTo(-size * 0.08, baseY - size * 0.03, -size * 0.06, baseY);
      // PR segment
      ctx.lineTo(-size * 0.04, baseY);
      // QRS complex
      ctx.lineTo(-size * 0.03, baseY + size * 0.02);
      ctx.lineTo(-size * 0.01, baseY - size * 0.09);
      ctx.lineTo(size * 0.01, baseY + size * 0.04);
      ctx.lineTo(size * 0.03, baseY);
      // ST segment
      ctx.lineTo(size * 0.06, baseY);
      // T wave
      ctx.quadraticCurveTo(size * 0.08, baseY - size * 0.03, size * 0.1, baseY);
      ctx.lineTo(size * 0.14, baseY);
      ctx.stroke();
      // Paper feed slot at bottom
      ctx.fillStyle = shiftColor(color, -40);
      ctx.fillRect(-size * 0.15, size * 0.08, size * 0.3, size * 0.03);
      // Paper strip coming out
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-size * 0.12, size * 0.11, size * 0.24, size * 0.12);
      // ECG line on paper
      ctx.strokeStyle = shiftColor(color, 20);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, size * 0.17);
      ctx.lineTo(-size * 0.06, size * 0.17);
      ctx.lineTo(-size * 0.04, size * 0.14);
      ctx.lineTo(-size * 0.02, size * 0.2);
      ctx.lineTo(0, size * 0.17);
      ctx.lineTo(size * 0.06, size * 0.17);
      ctx.lineTo(size * 0.08, size * 0.15);
      ctx.lineTo(size * 0.1, size * 0.17);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
};

const COLORS = [
  '#C8F56A', // lime green (mango brand)
  '#A3D944', // muted lime
  '#10B981', // emerald
  '#34D399', // emerald-400
  '#22D3EE', // cyan-400
  '#67E8F9', // cyan-300
  '#FBBF24', // amber
];

const LabMatrixRain = ({ className = '', style = {} }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const columnsRef = useRef([]);

  const initColumns = useCallback((width, height) => {
    const colWidth = 30;
    const numCols = Math.ceil(width / colWidth);
    const cols = [];

    for (let i = 0; i < numCols; i++) {
      const numDrops = 3 + Math.floor(Math.random() * 3);
      for (let d = 0; d < numDrops; d++) {
        cols.push({
          x: i * colWidth + colWidth / 2 + (Math.random() - 0.5) * 14,
          y: Math.random() * height,
          speed: 0.4 + Math.random() * 1.3,
          size: 18 + Math.random() * 14,
          type: Math.floor(Math.random() * ICON_COUNT),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 0.12 + Math.random() * 0.2,
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
        drop.trail.unshift({ x: drop.x, y: drop.y, opacity: drop.opacity });
        if (drop.trail.length > drop.trailLen) drop.trail.pop();

        drop.trail.forEach((t, idx) => {
          const fadeOp = t.opacity * (1 - idx / drop.trailLen) * 0.35;
          drawLabIcon(ctx, drop.type, t.x, t.y, drop.size * 0.7, fadeOp, drop.color);
        });

        drawLabIcon(ctx, drop.type, drop.x, drop.y, drop.size, drop.opacity, drop.color);

        drop.y += drop.speed;

        if (drop.y > h + 50) {
          drop.y = -30 - Math.random() * 100;
          drop.x = drop.x + (Math.random() - 0.5) * 20;
          drop.type = Math.floor(Math.random() * ICON_COUNT);
          drop.color = COLORS[Math.floor(Math.random() * COLORS.length)];
          drop.opacity = 0.2 + Math.random() * 0.4;
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
      data-testid="lab-matrix-rain"
    />
  );
};

export default LabMatrixRain;
