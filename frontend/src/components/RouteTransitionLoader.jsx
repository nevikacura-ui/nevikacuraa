import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BrandedLoader from './BrandedLoader';

/* ─── Route → Loader variant mapping ─── */
const ORANGE_PATHS = ['/orange', '/pharmacy', '/nutricare', '/pharmacy-staff', '/prescription-scanner'];
const MANGO_PATHS = ['/mango', '/labs', '/proton', '/nexugene', '/lab-reports', '/mango-staff'];
const DIAGYN_PATHS = ['/diagyn', '/doctors', '/teleconsult', '/appointment-calendar', '/queue', '/diagyn-staff', '/doctor-portal', '/doctor-login'];
const CURAPAY_PATHS = ['/cura-wallet'];
const CURAONE_PATHS = ['/cura-one'];
const HOME_PATHS = ['/', '/portals', '/my-cura'];
const SKIP_PATHS = ['/loader-preview', '/payment/cancel', '/payment-success', '/payment/success', '/booking-confirmation', '/online-appointment-success'];

function getVariant(path) {
  if (SKIP_PATHS.some(p => path === p)) return null;
  if (CURAPAY_PATHS.some(p => path.startsWith(p))) return 'curapay';
  if (CURAONE_PATHS.some(p => path.startsWith(p))) return 'curaone';
  if (HOME_PATHS.includes(path)) return 'default';
  if (ORANGE_PATHS.some(p => path.startsWith(p))) return 'orange';
  if (MANGO_PATHS.some(p => path.startsWith(p))) return 'mango';
  if (DIAGYN_PATHS.some(p => path.startsWith(p))) return 'diagyn';
  return 'default';
}

/* Route transitions — 1500ms for all routes */
const DURATION_MAP = { default: 1500, orange: 1500, mango: 1500, diagyn: 1500, curapay: 1500, curaone: 1500 };

export default function RouteTransitionLoader() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [show, setShow] = useState(false);
  const [variant, setVariant] = useState('default');
  const timerRef = useRef(null);

  useEffect(() => {
    const newPath = location.pathname;
    if (newPath !== prevPath.current) {
      prevPath.current = newPath;
      const v = getVariant(newPath);
      if (!v) return; // skip
      setVariant(v);
      setShow(true);
      const dur = DURATION_MAP[v] || 1200;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShow(false), dur);
    }
    return () => clearTimeout(timerRef.current);
  }, [location.pathname]);

  if (!show) return null;

  const dur = DURATION_MAP[variant] || 1200;

  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: 99999,
        animation: `rtlFadeOut .35s ease-in ${dur - 350}ms forwards`,
      }}
      data-testid="route-transition-loader"
    >
      <BrandedLoader variant={variant} />
      <style>{`
        @keyframes rtlFadeOut { from { opacity: 1; } to { opacity: 0; pointer-events: none; } }
      `}</style>
    </div>
  );
}
