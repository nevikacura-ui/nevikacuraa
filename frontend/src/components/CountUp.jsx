import { useState, useEffect, useRef } from 'react';

const CountUp = ({ end, duration = 800, className = '', style = {} }) => {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(end);
  const rafRef = useRef(null);

  useEffect(() => {
    const startVal = prevEnd.current !== end ? 0 : count;
    prevEnd.current = end;
    if (end === 0) { setCount(0); return; }

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (end - startVal) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration]);

  return <span className={className} style={style}>{count}</span>;
};

export default CountUp;
