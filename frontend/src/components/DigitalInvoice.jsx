import React, { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  FileText, Download, Mail, MessageCircle, Share2, 
  Loader2, CheckCircle2, Building2, Phone 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Digital Invoice Component
 * Generates and sends PDF invoice via Email/WhatsApp
 */

// Generate invoice HTML for PDF
const generateInvoiceHTML = (order) => {
  const date = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const items = order.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const discount = order.discount || 0;
  const delivery = order.delivery_fee || 0;
  const total = order.total || (subtotal - discount + delivery);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
    .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #e5e5e5; }
    .header { background: linear-gradient(135deg, #EA580C, #F59E0B); color: white; padding: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .invoice-meta { display: flex; justify-content: space-between; padding: 20px 30px; background: #f9f9f9; border-bottom: 1px solid #e5e5e5; }
    .invoice-meta div { }
    .invoice-meta label { font-size: 12px; color: #666; text-transform: uppercase; }
    .invoice-meta p { font-size: 16px; font-weight: 600; margin-top: 5px; }
    .addresses { display: flex; padding: 20px 30px; gap: 40px; }
    .addresses > div { flex: 1; }
    .addresses h3 { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
    .addresses p { line-height: 1.6; }
    .items { padding: 20px 30px; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th { text-align: left; padding: 12px 0; border-bottom: 2px solid #EA580C; color: #666; font-size: 12px; text-transform: uppercase; }
    .items td { padding: 15px 0; border-bottom: 1px solid #e5e5e5; }
    .items .item-name { font-weight: 500; }
    .items .item-qty { text-align: center; }
    .items .item-price { text-align: right; }
    .totals { padding: 20px 30px; background: #f9f9f9; }
    .totals table { width: 300px; margin-left: auto; }
    .totals td { padding: 8px 0; }
    .totals .label { color: #666; }
    .totals .value { text-align: right; font-weight: 500; }
    .totals .total-row td { font-size: 18px; font-weight: 700; color: #EA580C; border-top: 2px solid #EA580C; padding-top: 15px; }
    .footer { padding: 20px 30px; text-align: center; background: #333; color: white; font-size: 12px; }
    .footer a { color: #F59E0B; }
    .gst-note { padding: 15px 30px; background: #FEF3C7; font-size: 12px; color: #92400E; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>Nevika Cura</h1>
      <p>Your Health Partner</p>
    </div>
    
    <div class="invoice-meta">
      <div>
        <label>Invoice Number</label>
        <p>#${order.order_id || order.id || 'INV-' + Date.now()}</p>
      </div>
      <div>
        <label>Invoice Date</label>
        <p>${date}</p>
      </div>
      <div>
        <label>Payment Status</label>
        <p style="color: ${order.payment_status === 'paid' ? '#22C55E' : '#EA580C'}">${order.payment_status === 'paid' ? 'PAID' : 'PENDING'}</p>
      </div>
    </div>
    
    <div class="addresses">
      <div>
        <h3>Billed To</h3>
        <p>
          <strong>${order.customer?.name || 'Customer'}</strong><br>
          ${order.customer?.phone ? '+91 ' + order.customer.phone : ''}<br>
          ${order.customer?.email || ''}
        </p>
      </div>
      <div>
        <h3>Delivery Address</h3>
        <p>${order.address?.full_address || order.address || 'N/A'}</p>
      </div>
    </div>
    
    <div class="items">
      <table>
        <thead>
          <tr>
            <th style="width: 50%">Item</th>
            <th style="width: 15%; text-align: center">Qty</th>
            <th style="width: 15%; text-align: right">Price</th>
            <th style="width: 20%; text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td class="item-name">${item.name}</td>
              <td class="item-qty">${item.quantity || 1}</td>
              <td class="item-price">₹${item.price?.toFixed(2)}</td>
              <td class="item-price">₹${(item.price * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="totals">
      <table>
        <tr>
          <td class="label">Subtotal</td>
          <td class="value">₹${subtotal.toFixed(2)}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td class="label">Discount</td>
          <td class="value" style="color: #22C55E">-₹${discount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td class="label">Delivery</td>
          <td class="value">${delivery > 0 ? '₹' + delivery.toFixed(2) : 'FREE'}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="value">₹${total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    <div class="gst-note">
      <strong>Note:</strong> This is a computer-generated invoice. GST applicable as per government norms. 
      For any queries, contact us at support@nevikacura.com or call +91 9999999999.
    </div>
    
    <div class="footer">
      <p>Thank you for choosing Nevika Cura!</p>
      <p style="margin-top: 10px;">
        <a href="https://nevikacura.com">www.nevikacura.com</a> | 
        Chhindwara, Madhya Pradesh
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

export const DigitalInvoice = ({ order, className = '' }) => {
  const [sending, setSending] = useState(null); // 'email' | 'whatsapp' | 'download'
  const [showOptions, setShowOptions] = useState(false);

  // Download PDF
  const handleDownload = async () => {
    setSending('download');
    try {
      const html = generateInvoiceHTML(order);
      
      // Create a blob and download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${order.order_id || 'order'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded!');
    } catch (error) {
      toast.error('Failed to download invoice');
    } finally {
      setSending(null);
    }
  };

  // Send via Email
  const handleSendEmail = async () => {
    if (!order.customer?.email) {
      toast.error('No email address found for this order');
      return;
    }

    setSending('email');
    try {
      await axios.post(`${API}/invoice/send-email`, {
        order_id: order.order_id || order.id,
        email: order.customer.email,
        html: generateInvoiceHTML(order)
      });
      toast.success(`Invoice sent to ${order.customer.email}`);
    } catch (error) {
      // Fallback: Open email client
      const subject = encodeURIComponent(`Invoice #${order.order_id} - Nevika Cura`);
      const body = encodeURIComponent(`Please find your invoice attached.\n\nOrder ID: ${order.order_id}\nTotal: ₹${order.total}\n\nThank you for shopping with Nevika Cura!`);
      window.open(`mailto:${order.customer.email}?subject=${subject}&body=${body}`);
      toast.success('Email client opened');
    } finally {
      setSending(null);
    }
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    setSending('whatsapp');
    try {
      const phone = order.customer?.phone?.replace(/\D/g, '');
      if (!phone) {
        toast.error('No phone number found');
        setSending(null);
        return;
      }

      const items = order.items?.map(i => `• ${i.name} x${i.quantity || 1} - ₹${i.price}`).join('\n') || '';
      const message = encodeURIComponent(
`🧾 *Invoice from Nevika Cura*

📋 *Order ID:* #${order.order_id || order.id}
📅 *Date:* ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}

*Items:*
${items}

💰 *Total:* ₹${order.total}
📍 *Delivery:* ${order.address?.full_address || order.address || 'N/A'}

Thank you for your order! 🙏
For support, call: +91 9999999999`
      );

      window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
      toast.success('WhatsApp opened');
    } catch (error) {
      toast.error('Failed to open WhatsApp');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        onClick={() => setShowOptions(!showOptions)}
        variant="outline"
        size="sm"
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        data-testid="invoice-btn"
      >
        <FileText className="w-4 h-4 mr-2" />
        Invoice
      </Button>

      {/* Dropdown Options */}
      {showOptions && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={handleDownload}
            disabled={sending === 'download'}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
          >
            {sending === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-white text-sm">Download PDF</span>
          </button>
          
          <button
            onClick={handleSendEmail}
            disabled={sending === 'email'}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
          >
            {sending === 'email' ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <Mail className="w-4 h-4 text-purple-400" />
            )}
            <span className="text-white text-sm">Send to Email</span>
          </button>
          
          <button
            onClick={handleSendWhatsApp}
            disabled={sending === 'whatsapp'}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
          >
            {sending === 'whatsapp' ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <MessageCircle className="w-4 h-4 text-green-400" />
            )}
            <span className="text-white text-sm">Send to WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DigitalInvoice;
