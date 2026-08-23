import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingConfirmed } from '@/utils/haptics';
import { Copy, Check, ChevronRight, Share2, Download, Home, CalendarPlus, FlaskConical, Package, Truck, Clock, AlertTriangle, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import InvoiceStatusAnimation from './InvoiceStatusAnimation';
import html2canvas from 'html2canvas';
import Barcode from 'react-barcode';
import OrderSummary from './OrderSummary';

const LOGO_NC = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/13v9ngkp_5_20260311_124451_0004.png";
const LOGO_NC_ICON = "https://customer-assets.emergentagent.com/job_05150bc4-88aa-4e9a-896e-5539167675b6/artifacts/ixe98bq8_file_0000000005a8720b8c6b6dc842afffb3.png";
const LOGO_MANGO = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/28cub72l_Add%20a%20subheading_20260311_123952_0000.png";
const LOGO_ORANGE = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/c2fcemnx_4_20260311_124451_0003.png";
const DOC_IMAGES = {
  vikas: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
  neha: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg',
};
const getDocImg = (name) => {
  if (!name) return DOC_IMAGES.vikas;
  const n = name.toLowerCase();
  if (n.includes('neha')) return DOC_IMAGES.neha;
  return DOC_IMAGES.vikas;
};

const BookingConfirmation = ({
  type = 'diagyn',
  paymentMethod = 'free',
  collectionMode = 'home',
  orderDetails = {},
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const cardRef = useRef(null);
  const [showSplash, setShowSplash] = useState(true);
  const normalizedType = type === 'orange' ? 'pharmacy' : type;

  useEffect(() => { bookingConfirmed(); }, []);
  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2200); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!showSplash) setTimeout(() => launchConfetti(), 400); }, [showSplash]);

  /* ── Theme config ── */
  const themes = {
    diagyn: {
      accent: '#a3e635', accentMuted: 'rgba(163,230,53,0.15)', accentGlow: 'rgba(163,230,53,0.3)',
      logo: LOGO_NC, brandName: 'DiaGyn', brandSub: 'Nevika Cura',
      headerLabel: 'Clinic', confirmTitle: 'Booking Confirmation',
      topRightLabel: 'Booking ID',
      hasCalendar: true, homeRoute: '/diagyn',
      trackLabel: 'View Queue Position', trackPath: orderDetails.trackingPath || '/queue',
      barcodeInstruction: 'Show this Booking ID at clinic reception',
    },
    mango: {
      accent: '#059669', accentMuted: 'rgba(5,150,105,0.15)', accentGlow: 'rgba(5,150,105,0.3)',
      logo: LOGO_MANGO, brandName: 'Mango Labs', brandSub: 'Nevika Cura',
      headerLabel: 'Lab', confirmTitle: 'Test Booking Confirmed',
      topRightLabel: 'Total Amount',
      hasCalendar: true, homeRoute: '/mango',
      trackLabel: 'Track Order', trackPath: orderDetails.trackingPath || '/my-orders',
      barcodeInstruction: 'Show this at sample collection for verification',
    },
    pharmacy: {
      accent: '#ea580c', accentMuted: 'rgba(234,88,12,0.15)', accentGlow: 'rgba(234,88,12,0.3)',
      logo: LOGO_ORANGE, brandName: 'Orange Pharmacy', brandSub: 'Nevika Cura',
      headerLabel: 'Pharmacy', confirmTitle: 'Order Confirmation',
      topRightLabel: 'Order Total',
      hasCalendar: false, homeRoute: '/pharmacy',
      trackLabel: 'Track Delivery', trackPath: orderDetails.trackingPath || '/track',
      barcodeInstruction: 'Show Delivery Code to receive your order',
    },
  };

  const theme = themes[normalizedType] || themes.diagyn;
  const bookingId = orderDetails.orderId || orderDetails.bookingId || orderDetails.booking_id || '------';
  const displayTime = orderDetails.time || orderDetails.timeSlot || orderDetails.session || '';
  const dateObj = (() => { try { return orderDetails.date ? new Date(orderDetails.date) : new Date(); } catch { return new Date(); } })();
  const dateFormatted = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString('en-IN', { month: 'short' });
  const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
  const patientShort = (orderDetails.patientName || 'PAT').split(' ')[0].toUpperCase().slice(0, 6);
  const clinicRaw = orderDetails.clinic || orderDetails.doctor || theme.brandName;
  const clinicClean = clinicRaw.replace(/,\s*(Thane|Naigaon|Vasai|Virar|Mumbai|Nalasopara).*/i, '');
  const clinicShort = clinicClean.split(/[\s\-]+/).map(w => w[0]).join('').toUpperCase().slice(0, 4);

  const topRightValue = normalizedType === 'pharmacy'
    ? `₹${orderDetails.totalAmount || orderDetails.amount || '—'}`
    : normalizedType === 'mango'
      ? `₹${orderDetails.amount || '—'}`
      : bookingId;

  /* ── Handlers ── */
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(String(bookingId)); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); } catch { toast.error('Failed'); }
  };

  const handleAddToCalendar = () => {
    if (!orderDetails.date && !orderDetails.time) return;
    let s;
    try {
      const ds = orderDetails.date; const ts = orderDetails.time?.split(' - ')?.[0] || orderDetails.time;
      const p = ds?.includes('/') ? ds.split('/').map(Number) : null;
      const [d, m, y] = p || [new Date(ds).getDate(), new Date(ds).getMonth() + 1, new Date(ds).getFullYear()];
      let h = 10, mi = 0;
      if (ts) { const tp = ts.match(/(\d+):(\d+)\s*(AM|PM)?/i); if (tp) { h = parseInt(tp[1]); mi = parseInt(tp[2]); if (tp[3]?.toUpperCase() === 'PM' && h !== 12) h += 12; if (tp[3]?.toUpperCase() === 'AM' && h === 12) h = 0; } }
      s = new Date(y, m - 1, d, h, mi);
    } catch { s = new Date(); }
    const e = new Date(s.getTime() + 30 * 60000);
    const f = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const t = normalizedType === 'diagyn' ? `Appointment - ${orderDetails.doctor || 'DiaGyn'}` : normalizedType === 'mango' ? 'Lab Test - Mango Labs' : 'Order - Orange Pharmacy';
    window.open(`https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: t, dates: `${f(s)}/${f(e)}`, sf: 'true' })}`, '_blank');
    toast.success('Opening Calendar...');
  };

  const handleSaveAsImage = async () => {
    if (!cardRef.current) return;
    try {
      toast.loading('Saving...', { id: 'si' });
      const c = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0a0a0a', logging: false });
      const l = document.createElement('a'); l.download = `${bookingId}-pass.png`; l.href = c.toDataURL('image/png'); l.click();
      toast.success('Saved!', { id: 'si' });
    } catch { toast.error('Failed', { id: 'si' }); }
  };

  const handleShare = async () => {
    const t = normalizedType === 'diagyn' ? 'DiaGyn Appointment' : normalizedType === 'mango' ? 'Mango Labs Booking' : 'Orange Pharmacy Order';
    const txt = [`*${t}*`, `Booking: *${bookingId}*`, orderDetails.patientName && `Patient: ${orderDetails.patientName}`, orderDetails.doctor && `Doctor: ${orderDetails.doctor}`, orderDetails.date && `Date: ${dateFormatted}`, displayTime && `Time: ${displayTime}`, '', 'Nevika Cura'].filter(Boolean).join('\n');
    if (navigator.share) {
      try {
        const c = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0a0a0a', logging: false });
        const b = await new Promise(r => c.toBlob(r, 'image/png'));
        await navigator.share({ title: t, text: txt, files: [new File([b], `${bookingId}.png`, { type: 'image/png' })] }); return;
      } catch { try { await navigator.share({ title: t, text: txt }); return; } catch {} }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  };

  const launchConfetti = () => {
    const c = [theme.accent, '#fff', '#555'];
    const e = Date.now() + 1500;
    (function f() {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors: c, gravity: 0.9 });
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors: c, gravity: 0.9 });
      if (Date.now() < e) requestAnimationFrame(f);
    }());
  };

  if (showSplash) {
    const t = { diagyn: 'Appointment Booked!', mango: 'Test Confirmed!', pharmacy: 'Order Placed!' };
    return <InvoiceStatusAnimation variant="success" show title={t[normalizedType]} subtitle={`Booking ID: ${bookingId}`} />;
  }

  /* ── Platform-specific: info grid items ── */
  const getInfoGrid = () => {
    if (normalizedType === 'diagyn') {
      return [
        { label: 'Date', value: `${dayNum} ${monthShort}` },
        { label: 'Time', value: displayTime || '—' },
        { label: 'Type', value: orderDetails.session || 'OPD' },
        { label: 'Fees', value: 'At Clinic' },
      ];
    }
    if (normalizedType === 'mango') {
      return [
        { label: 'Date', value: `${dayNum} ${monthShort}` },
        { label: 'Time', value: displayTime || '—' },
        { label: 'Collection', value: collectionMode === 'home' ? 'Home' : 'Visit Lab' },
        { label: 'Total', value: `₹${orderDetails.amount || '—'}` },
      ];
    }
    const sub = Number(orderDetails.totalAmount || orderDetails.amount || 0);
    const del = Number(orderDetails.deliveryCharge || 49);
    const free = sub >= 1000;
    const total = sub + (free ? 0 : del);
    return [
      { label: 'Est. Delivery', value: '45-60 min' },
      { label: 'Items', value: `${(orderDetails.items || []).length}` },
      { label: 'Payment', value: paymentMethod === 'cod' ? 'COD' : 'Paid' },
      { label: 'Total', value: `₹${total}` },
    ];
  };

  /* ── Platform-specific: detail section (Card 2 middle) ── */
  const renderDetails = () => {
    if (normalizedType === 'diagyn') {
      return (
        <>
          {/* Doctor row */}
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={getDocImg(orderDetails.doctor)}
              alt=""
              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.accent}`, flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none'; }}
              data-testid="doctor-photo"
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{orderDetails.doctor || 'Doctor'}</div>
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{clinicClean}</div>
            </div>
            <div style={{ background: theme.accent, color: '#111', fontWeight: 700, fontSize: 11, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.04em' }} data-testid="status-badge">CONFIRMED</div>
          </div>
          {/* Live indicator */}
          <div style={{ margin: '0 20px 14px' }}>
            <div style={{ background: '#222', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ color: '#ccc', fontSize: 12 }}>Appointment on {weekday}, {dayNum} {monthShort} {dateObj.getFullYear()}, {displayTime || '—'}</span>
            </div>
          </div>
          {/* Patient details */}
          {(orderDetails.patientName || orderDetails.phone) && (
            <div style={{ padding: '0 20px 12px' }}>
              {orderDetails.patientName && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Patient</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.patientName}</span></div>}
              {orderDetails.phone && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ color: '#aaa', fontSize: 12 }}>Phone</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.phone}</span></div>}
            </div>
          )}
        </>
      );
    }

    if (normalizedType === 'mango') {
      const tests = (orderDetails.items?.length ? orderDetails.items : null) || orderDetails.tests || [];
      return (
        <>
          {/* Lab header row */}
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: theme.accentMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FlaskConical style={{ width: 22, height: 22, color: theme.accent }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{orderDetails.patientName || 'Patient'}</div>
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{tests.length} test{tests.length !== 1 ? 's' : ''} booked</div>
            </div>
            <div style={{ background: theme.accent, color: '#fff', fontWeight: 700, fontSize: 11, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.04em' }} data-testid="status-badge">CONFIRMED</div>
          </div>
          {/* Tests list */}
          {tests.length > 0 && (
            <div style={{ padding: '0 20px 14px' }}>
              <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tests Included</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tests.map((t, i) => {
                  const n = typeof t === 'string' ? t : t.name;
                  const p = t?.price;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#222', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FlaskConical style={{ width: 14, height: 14, color: theme.accent }} />
                        <span style={{ color: '#ddd', fontSize: 13, fontWeight: 500 }}>{n}</span>
                      </div>
                      {p && <span style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>₹{p}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Collection info */}
          <div style={{ padding: '0 20px 12px' }}>
            {orderDetails.patientName && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Patient</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.patientName}</span></div>}
            {orderDetails.phone && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Phone</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.phone}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ color: '#aaa', fontSize: 12 }}>Reports</span><span style={{ color: theme.accent, fontSize: 13, fontWeight: 600 }}>Within 24-48 hrs</span></div>
          </div>
        </>
      );
    }

    // Pharmacy
    const items = orderDetails.items || [];
    const sub = Number(orderDetails.totalAmount || orderDetails.amount || 0);
    const del = Number(orderDetails.deliveryCharge || 49);
    const free = sub >= 1000;
    const total = sub + (free ? 0 : del);
    return (
      <>
        {/* Order header row */}
        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: theme.accentMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package style={{ width: 22, height: 22, color: theme.accent }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{orderDetails.patientName || 'Customer'}</div>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''} ordered</div>
          </div>
          <div style={{ background: theme.accent, color: '#fff', fontWeight: 700, fontSize: 11, padding: '5px 12px', borderRadius: 20, letterSpacing: '0.04em' }} data-testid="status-badge">CONFIRMED</div>
        </div>
        {/* Delivery progress */}
        <div style={{ margin: '0 20px 14px' }}>
          <div style={{ background: '#222', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck style={{ width: 16, height: 16, color: theme.accent }} />
            <span style={{ color: '#ccc', fontSize: 12 }}>Estimated delivery: 45-60 mins</span>
          </div>
        </div>
        {/* Items list */}
        {items.length > 0 && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Medicine Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((it, i) => {
                const n = typeof it === 'string' ? it : it.name;
                const q = it?.quantity || it?.qty;
                const p = it?.price;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#222', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <Package style={{ width: 14, height: 14, color: theme.accent, flexShrink: 0 }} />
                      <span style={{ color: '#ddd', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                      {q && <span style={{ color: '#aaa', fontSize: 11, flexShrink: 0 }}>x{q}</span>}
                    </div>
                    {p && <span style={{ color: '#aaa', fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>₹{p}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Order summary */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Subtotal</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>₹{sub}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Delivery</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{free ? 'FREE' : `₹${del}`}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Payment</span><span style={{ color: theme.accent, fontSize: 13, fontWeight: 600 }}>{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</span></div>
          {orderDetails.patientName && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Name</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.patientName}</span></div>}
          {orderDetails.phone && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: '#aaa', fontSize: 12 }}>Phone</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{orderDetails.phone}</span></div>}
          {orderDetails.address && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ color: '#aaa', fontSize: 12 }}>Address</span><span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{orderDetails.address}</span></div>}
        </div>
      </>
    );
  };

  /* ── Notice card content ── */
  const getNotice = () => {
    if (normalizedType === 'diagyn') return { icon: <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b' }} />, text: 'Consultation fees payable at clinic', color: '#f59e0b' };
    if (normalizedType === 'mango') return { icon: <Clock style={{ width: 18, height: 18, color: theme.accent }} />, text: 'Fasting may be required for some tests. Check instructions.', color: theme.accent };
    return { icon: <Truck style={{ width: 18, height: 18, color: theme.accent }} />, text: `Free delivery on orders above ₹1000`, color: theme.accent };
  };

  const notice = getNotice();
  const infoGrid = getInfoGrid();
  const PAGE_BG = '#f0f0f0';

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", paddingBottom: 40 }} data-testid="booking-confirmation-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes livePulse { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow:0 0 0 8px rgba(239,68,68,0); } }
        .card-anim { animation: slideUp 0.55s cubic-bezier(.22,.68,0,1.2) both; }
        .card-anim2 { animation: slideUp 0.55s 0.12s cubic-bezier(.22,.68,0,1.2) both; }
        .fade-in { animation: fadeIn 0.4s 0.35s both; }
        .live-dot { animation: livePulse 1.5s infinite; }
        .btn-dark { width:100%; padding:16px; border:none; border-radius:16px; font-family:inherit; font-size:15px; font-weight:600; cursor:pointer; transition:transform 0.15s,opacity 0.15s; letter-spacing:0.01em; }
        .btn-dark:active { transform:scale(0.97); opacity:0.85; }
      `}</style>

      {/* ── Top Nav Bar ── */}
      <div style={{ width: '100%', maxWidth: 430, background: '#111', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} data-testid="booking-header">
        <span style={{ color: '#aaa', fontSize: 22, cursor: 'pointer' }} onClick={() => navigate(theme.homeRoute)} data-testid="nav-back-btn">
          <ChevronRight style={{ width: 20, height: 20, transform: 'rotate(180deg)' }} />
        </span>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{theme.confirmTitle}</span>
        <span style={{ color: '#aaa', fontSize: 20, cursor: 'pointer' }} onClick={handleShare} data-testid="share-btn">
          <Share2 style={{ width: 18, height: 18 }} />
        </span>
      </div>

      {/* ── Page wrapper ── */}
      <div style={{ width: '100%', maxWidth: 430, padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }} ref={cardRef}>

        {/* ══ CARD 1 — Route Header ══ */}
        <div className="card-anim" style={{ background: '#1a1a1a', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }} data-testid="route-card">
          {/* Dark gradient header */}
          <div style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1e1e2e 100%)', padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
            {/* Dot texture */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Brand + Booking ID row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, position: 'relative' }}>
              <div>
                <div style={{ color: '#aaa', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{theme.headerLabel}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={theme.logo} alt="" style={{ height: 22, borderRadius: 4 }} onError={e => e.target.style.display = 'none'} />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{theme.brandName}</span>
                </div>
                <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{normalizedType === 'diagyn' ? clinicClean : theme.brandSub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#aaa', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{theme.topRightLabel}</div>
                <div style={{ color: theme.accent, fontWeight: 700, fontSize: 22, fontFamily: "'DM Mono', monospace" }} data-testid="top-right-value">{topRightValue}</div>
              </div>
            </div>

            {/* Booking ID centered */}
            <div style={{ textAlign: 'center', position: 'relative', paddingTop: 4 }}>
              <img src={LOGO_NC_ICON} alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', mixBlendMode: 'lighten', margin: '0 auto' }} onError={e => e.target.style.display = 'none'} />
            </div>
          </div>

          {/* Date + Time strip */}
          <div style={{ background: '#141414', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#e0e0e0', fontSize: 12, fontWeight: 500 }}>{dateFormatted}</div>
            <div style={{ color: '#e0e0e0', fontSize: 12, fontWeight: 500 }}>{displayTime || '—'}</div>
          </div>
        </div>

        {/* ══ CARD 2 — Details + Barcode ══ */}
        <div className="card-anim2" style={{ background: '#1a1a1a', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }} data-testid="details-card">

          {/* Platform-specific detail section */}
          {renderDetails()}

          {/* 4-column info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0 20px 16px', gap: 8 }} data-testid="info-grid">
            {infoGrid.map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Tear line */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', margin: '0 -4px' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: PAGE_BG, flexShrink: 0, margin: '0 -11px', zIndex: 2 }} />
            <div style={{ flex: 1, borderTop: '1.5px dashed rgba(255,255,255,0.18)' }} />
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: PAGE_BG, flexShrink: 0, margin: '0 -11px', zIndex: 2 }} />
          </div>

          {/* Barcode section */}
          <div style={{ padding: '16px 20px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reference No.</div>
                <div style={{ color: theme.accent, fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 18, marginTop: 2 }} data-testid="reference-number">{bookingId}</div>
              </div>
              <button
                onClick={handleCopy}
                style={{ background: copied ? theme.accent : '#2a2a2a', border: 'none', borderRadius: 8, padding: '7px 14px', color: copied ? '#111' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                data-testid="copy-booking-id"
              >
                {copied ? <><Check style={{ width: 14, height: 14 }} /> Copied</> : <><Copy style={{ width: 14, height: 14 }} /> Copy</>}
              </button>
            </div>
            <div data-testid="barcode-section" style={{ display: 'flex', justifyContent: 'center' }}>
              <Barcode value={String(bookingId).replace(/[^a-zA-Z0-9\-]/g, '') || 'NEVIKA'} format="CODE128" width={1.5} height={56} displayValue={false} background="transparent" lineColor="#ffffff" margin={0} />
            </div>
            <div style={{ textAlign: 'center', color: '#999', fontSize: 11, marginTop: 8, marginBottom: 4, fontFamily: "'DM Mono', monospace", letterSpacing: '1px' }}>{theme.barcodeInstruction}</div>
          </div>
        </div>

        {/* ══ Notice card ══ */}
        <div className="fade-in" style={{ background: '#1a1a1a', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #2a2a2a' }} data-testid="notice-card">
          {notice.icon}
          <span style={{ color: notice.color, fontSize: 13, fontWeight: 500 }}>{notice.text}</span>
        </div>

        {/* ══ CTA Buttons ══ */}
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {/* DiaGyn: Add to Calendar | Mango/Orange: Download Invoice */}
          {normalizedType === 'diagyn' ? (
            <button
              className="btn-dark"
              style={{ background: theme.accent, color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleAddToCalendar}
              data-testid="add-to-calendar-btn"
            >
              <CalendarPlus style={{ width: 16, height: 16 }} /> Add to Calendar
            </button>
          ) : (
            <button
              className="btn-dark"
              style={{ background: theme.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setShowInvoice(true)}
              data-testid="download-invoice-btn"
            >
              <FileText style={{ width: 16, height: 16 }} /> Download Invoice
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              className="btn-dark"
              style={{ background: '#2a2a2a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleSaveAsImage}
              data-testid="save-photo-btn"
            >
              <Download style={{ width: 16, height: 16 }} /> Save Photo
            </button>
            <button
              className="btn-dark"
              style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleShare}
              data-testid="share-whatsapp-btn"
            >
              <Share2 style={{ width: 16, height: 16 }} /> Share It
            </button>
          </div>
        </div>

        {/* ── Home link ── */}
        <div className="fade-in" style={{ textAlign: 'center', paddingTop: 4 }}>
          <span
            style={{ color: '#999', fontSize: 13, cursor: 'pointer' }}
            onClick={() => navigate('/')}
            data-testid="home-btn"
          >
            <Home style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Back to Home
          </span>
        </div>
      </div>
      {/* Order Summary overlay */}
      {showInvoice && (
        <OrderSummary
          type={normalizedType}
          orderDetails={orderDetails}
          paymentMethod={paymentMethod}
          collectionMode={collectionMode}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};

export default BookingConfirmation;
