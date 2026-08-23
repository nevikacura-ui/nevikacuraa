import React, { useRef, useState, useEffect, useCallback } from 'react';

const TiltCard = ({
  children,
  className = '',
  style = {},
  onClick,
  maxTilt = 6,
  glareOpacity = 0.1,
  perspective = 900,
  ...rest
}) => {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const isHovering = useRef(false);
  const rafRef = useRef(null);

  const applyTilt = useCallback((tiltX, tiltY) => {
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`,
    });
    const gx = 50 + tiltY * 3;
    const gy = 50 - tiltX * 3;
    setGlare({ x: gx, y: gy, opacity: glareOpacity });
  }, [perspective, glareOpacity]);

  const resetTilt = useCallback(() => {
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`,
    });
    setGlare(prev => ({ ...prev, opacity: 0 }));
  }, [perspective]);

  // Mouse tilt (desktop only)
  const handleMouseMove = useCallback((e) => {
    isHovering.current = true;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (0.5 - y) * maxTilt * 2;
    const tiltY = (x - 0.5) * maxTilt * 2;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyTilt(tiltX, tiltY));
  }, [maxTilt, applyTilt]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    resetTilt();
  }, [resetTilt]);

  // Gyroscope tilt (mobile) — gentle, with dead zone
  useEffect(() => {
    // Only enable gyro on touch devices
    if (!('ontouchstart' in window)) return;

    let smoothBeta = 0;
    let smoothGamma = 0;
    let frameId = null;
    let hasPermission = false;

    const handleOrientation = (e) => {
      if (e.beta === null || e.gamma === null) return;
      hasPermission = true;

      const rawBeta = (e.beta - 40) * 0.2; // normalize around ~40deg holding angle
      const rawGamma = e.gamma * 0.2;

      // Dead zone: ignore tiny movements
      const beta = Math.abs(rawBeta) < 0.3 ? 0 : Math.max(-maxTilt, Math.min(maxTilt, rawBeta));
      const gamma = Math.abs(rawGamma) < 0.3 ? 0 : Math.max(-maxTilt, Math.min(maxTilt, rawGamma));

      // Smooth interpolation (faster convergence)
      smoothBeta += (beta - smoothBeta) * 0.08;
      smoothGamma += (gamma - smoothGamma) * 0.08;

      // Snap to zero when very close
      if (Math.abs(smoothBeta) < 0.1) smoothBeta = 0;
      if (Math.abs(smoothGamma) < 0.1) smoothGamma = 0;

      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        applyTilt(-smoothBeta, smoothGamma);
      });
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [maxTilt, applyTilt]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        ...style,
        ...(tiltStyle.transform ? { transform: tiltStyle.transform } : { transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)` }),
        transition: 'transform 0.35s cubic-bezier(0.03, 0.98, 0.52, 0.99)',
        willChange: 'transform',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...rest}
    >
      {children}
      {/* Glare overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'inherit',
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
          transition: 'opacity 0.3s ease',
          zIndex: 20,
        }}
      />
    </div>
  );
};

export default TiltCard;
