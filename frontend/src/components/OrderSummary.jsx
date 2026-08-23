import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const LOGO_ORANGE_BW = "https://customer-assets.emergentagent.com/job_05150bc4-88aa-4e9a-896e-5539167675b6/artifacts/7ya3k493_file_000000004f1c7208af6230c9fb48198f.png";
const LOGO_MANGO_BW = "https://customer-assets.emergentagent.com/job_05150bc4-88aa-4e9a-896e-5539167675b6/artifacts/z8fo0ta7_file_00000000de64720883878d55f66921aa.png";
const LOGO_NC_SMALL = "https://customer-assets.emergentagent.com/job_05150bc4-88aa-4e9a-896e-5539167675b6/artifacts/ixe98bq8_file_0000000005a8720b8c6b6dc842afffb3.png";

const S = {
  page: { background: '#fff', fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", color: '#1a1a1a', width: '100%', maxWidth: 430, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 20px 16px', borderBottom: '2px solid #111' },
  logo: { height: 36 },
  title: { textAlign: 'right' },
  titleText: { fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#111', margin: 0 },
  orderId: { fontSize: 11, color: '#666', marginTop: 4, fontFamily: "'DM Mono', monospace" },
  section: { padding: '14px 20px' },
  sectionBorder: { padding: '14px 20px', borderBottom: '1px solid #e5e7eb' },
  label: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  value: { fontSize: 13, color: '#111', fontWeight: 500, marginTop: 2 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 8px', textAlign: 'left', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, borderBottom: '2px solid #111', background: '#fafafa' },
  thRight: { padding: '10px 8px', textAlign: 'right', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, borderBottom: '2px solid #111', background: '#fafafa' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f0f0f0', color: '#333', fontSize: 13 },
  tdRight: { padding: '10px 8px', borderBottom: '1px solid #f0f0f0', color: '#333', fontSize: 13, textAlign: 'right', fontWeight: 600 },
  tdBold: { padding: '10px 8px', borderBottom: '1px solid #f0f0f0', color: '#111', fontSize: 13, fontWeight: 700 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0' },
  summaryLabel: { fontSize: 13, color: '#666' },
  summaryValue: { fontSize: 13, color: '#111', fontWeight: 600 },
  totalRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #111', marginTop: 4 },
  totalLabel: { fontSize: 15, color: '#111', fontWeight: 800 },
  totalValue: { fontSize: 15, fontWeight: 800 },
  disclaimer: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', margin: '0 20px 16px', fontSize: 12, color: '#92400e', lineHeight: 1.5 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px', borderTop: '1px solid #e5e7eb' },
  footerLogo: { width: 20, height: 20, borderRadius: 4 },
  footerText: { fontSize: 11, color: '#999' },
};

const OrderSummary = ({ type, orderDetails = {}, paymentMethod = 'cod', collectionMode = 'home', onClose }) => {
  const billRef = useRef(null);
  const isPharmacy = type === 'orange' || type === 'pharmacy';
  const isMango = type === 'mango';

  const bookingId = orderDetails.orderId || orderDetails.bookingId || orderDetails.booking_id || '---';
  const dateObj = (() => { try { return orderDetails.date ? new Date(orderDetails.date) : new Date(); } catch { return new Date(); } })();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const items = (orderDetails.items?.length ? orderDetails.items : null) || orderDetails.tests || [];
  const accentColor = isPharmacy ? '#ea580c' : '#059669';

  // Pharmacy calculations
  const sub = Number(orderDetails.totalAmount || orderDetails.amount || 0);
  const deliveryCharge = Number(orderDetails.deliveryCharge || 49);
  const freeDelivery = sub >= 1000;
  const total = isPharmacy ? sub + (freeDelivery ? 0 : deliveryCharge) : sub;

  const handleDownload = async () => {
    if (!billRef.current) return;
    try {
      toast.loading('Generating...', { id: 'dl' });
      const canvas = await html2canvas(billRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const link = document.createElement('a');
      link.download = `${bookingId}-order-summary.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Downloaded!', { id: 'dl' });
    } catch {
      toast.error('Download failed', { id: 'dl' });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px 0' }} data-testid="order-summary-overlay">
      {/* Action bar */}
      <div style={{ width: '100%', maxWidth: 430, display: 'flex', justifyContent: 'space-between', padding: '0 8px 12px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} data-testid="close-summary-btn">Close</button>
        <button onClick={handleDownload} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} data-testid="download-summary-btn">Download</button>
      </div>

      {/* Bill */}
      <div ref={billRef} style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <img src={isPharmacy ? LOGO_ORANGE_BW : LOGO_MANGO_BW} alt="" style={S.logo} />
          <div style={S.title}>
            <p style={S.titleText}>Order Summary</p>
            <p style={S.orderId}>{bookingId}</p>
          </div>
        </div>

        {/* Customer info */}
        <div style={S.sectionBorder}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={S.label}>Patient Name</div>
              <div style={S.value}>{orderDetails.patientName || '—'}</div>
            </div>
            <div>
              <div style={S.label}>Date</div>
              <div style={S.value}>{dateStr}</div>
            </div>
            {orderDetails.phone && <div>
              <div style={S.label}>Phone</div>
              <div style={S.value}>{orderDetails.phone}</div>
            </div>}
            {isPharmacy && <div>
              <div style={S.label}>Payment</div>
              <div style={S.value}>{paymentMethod?.toUpperCase() === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</div>
            </div>}
            {isMango && <div>
              <div style={S.label}>Collection</div>
              <div style={S.value}>{collectionMode === 'home' ? 'Home Collection' : 'Visit Lab'}</div>
            </div>}
          </div>
          {isPharmacy && orderDetails.address && (
            <div style={{ marginTop: 10 }}>
              <div style={S.label}>Delivery Address</div>
              <div style={S.value}>{orderDetails.address}</div>
            </div>
          )}
        </div>

        {/* Items table */}
        <div style={S.section}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 30 }}>No.</th>
                <th style={S.th}>{isPharmacy ? 'Medicine' : 'Test Name'}</th>
                {isPharmacy && <th style={{ ...S.thRight, width: 40 }}>Qty</th>}
                {isPharmacy && <th style={{ ...S.thRight, width: 70 }}>MRP</th>}
                <th style={{ ...S.thRight, width: 70 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const name = typeof item === 'string' ? item : (item.name || item);
                const qty = item?.quantity || item?.qty || 1;
                const price = item?.price || item?.mrp || '';
                const mrp = item?.mrp || item?.price || '';
                return (
                  <tr key={i}>
                    <td style={S.td}>{i + 1}</td>
                    <td style={S.tdBold}>{name}</td>
                    {isPharmacy && <td style={S.tdRight}>{qty}</td>}
                    {isPharmacy && <td style={S.tdRight}>{mrp ? `₹${mrp}` : '—'}</td>}
                    <td style={S.tdRight}>{price ? `₹${Number(price) * (isPharmacy ? qty : 1)}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ ...S.section, borderTop: '1px solid #e5e7eb' }}>
          <div style={S.summaryRow}>
            <span style={S.summaryLabel}>Subtotal</span>
            <span style={S.summaryValue}>₹{sub}</span>
          </div>
          {isPharmacy && (
            <div style={S.summaryRow}>
              <span style={S.summaryLabel}>Delivery Charges</span>
              <span style={S.summaryValue}>{freeDelivery ? 'FREE' : `₹${deliveryCharge}`}</span>
            </div>
          )}
          <div style={S.totalRow}>
            <span style={S.totalLabel}>Total</span>
            <span style={{ ...S.totalValue, color: accentColor }}>₹{total}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={S.disclaimer}>
          This is a provisional order summary. {isPharmacy ? 'Final invoice will be sent with your order delivery.' : 'Final invoice will be sent after sample collection.'}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <img src={LOGO_NC_SMALL} alt="" style={S.footerLogo} />
          <span style={S.footerText}>Nevika Cura — Healthcare, Simplified</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
