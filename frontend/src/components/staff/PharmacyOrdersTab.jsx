import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Package, Calendar, FileText, Receipt, Upload, XCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { 
  API, getStatusColor, getAuthHeaders
} from '@/pages/staff/staffUtils';

const PharmacyOrdersTab = ({ 
  pharmacyOrders,
  pharmacyDate,
  setPharmacyDate,
  pharmacyDateCounts,
  loadData,
  handlePharmacyStatusUpdate,
  staffRole = ''
}) => {
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  
  // Check if user has admin role
  const isAdmin = ['super_admin', 'admin'].includes(staffRole);
  
  // Cancel order handler (admin only)
  const handleCancelOrder = async (orderId) => {
    setCancellingOrder(orderId);
    try {
      const response = await axios.post(
        `${API}/admin/orders/cancel/pharmacy/${orderId}`,
        {},
        getAuthHeaders()
      );
      toast.success(response.data.message || 'Order cancelled successfully');
      setShowCancelConfirm(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  // Upload bill handler
  const handleBillUpload = async (orderId, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      toast.loading('Uploading bill...');
      await axios.post(
        `${API}/staff/pharmacy/orders/${orderId}/upload-bill`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.dismiss();
      toast.success('Bill uploaded successfully');
      loadData();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <Card className="p-4" data-testid="pharmacy-orders-tab">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          Pharmacy Orders
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={pharmacyDate}
            onChange={(e) => setPharmacyDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
            data-testid="pharmacy-date-input"
          />
          {pharmacyDateCounts[pharmacyDate] && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              {pharmacyDateCounts[pharmacyDate].total} orders
              {pharmacyDateCounts[pharmacyDate].pending > 0 && (
                <span className="ml-1 text-red-600">({pharmacyDateCounts[pharmacyDate].pending} pending)</span>
              )}
            </span>
          )}
        </div>
      </div>
      
      {/* Date Quick Navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[-2, -1, 0, 1, 2].map(offset => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const dateStr = d.toISOString().split('T')[0];
          const counts = pharmacyDateCounts[dateStr];
          const isSelected = dateStr === pharmacyDate;
          return (
            <button
              key={offset}
              onClick={() => setPharmacyDate(dateStr)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex flex-col items-center min-w-[80px] ${
                isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              data-testid={`pharmacy-date-${offset}`}
            >
              <span className="font-medium">{offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="text-xs">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {counts && (
                <span className={`text-xs mt-1 ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>
                  {counts.total} {counts.pending > 0 && `(${counts.pending})`}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="space-y-3">
        {pharmacyOrders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No orders for {pharmacyDate}</p>
        ) : (
          pharmacyOrders.map((order) => (
            <div key={order.id} className="p-4 bg-gray-50 rounded-lg" data-testid={`pharmacy-order-${order.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{order.patient_name}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  {order.bill_url && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                      <Receipt className="w-3 h-3 inline mr-1" />
                      Bill Uploaded
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{order.patient_phone}</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {order.medicines?.map(m => `${m.name} (${m.quantity})`).join(', ')}
              </div>
              
              {/* Bill Upload Section - Required before Out for Delivery */}
              {!order.bill_url && order.status !== 'Delivered' && (
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 mb-2 flex items-center gap-1">
                    <Upload className="w-4 h-4" />
                    <strong>Upload Bill/Receipt</strong> (Required before Out for Delivery)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleBillUpload(order.id, e.target.files[0])}
                    className="text-sm"
                    data-testid={`upload-bill-${order.id}`}
                  />
                </div>
              )}
              
              {order.bill_url && (
                <div className="mb-3">
                  <a href={order.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    View Bill/Receipt
                  </a>
                </div>
              )}
              
              <div className="flex gap-2 flex-wrap">
                {['Order Booked', 'Packing', 'Out for Delivery', 'Delivered'].map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant={order.status === status ? 'default' : 'outline'}
                    onClick={() => handlePharmacyStatusUpdate(order.id, status)}
                    disabled={
                      order.status === status || 
                      (status === 'Out for Delivery' && !order.bill_url)
                    }
                    className={order.status === status ? 'bg-orange-500' : ''}
                    title={status === 'Out for Delivery' && !order.bill_url ? 'Upload bill first' : ''}
                    data-testid={`pharmacy-status-${order.id}-${status.toLowerCase().replace(/ /g, '-')}`}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default PharmacyOrdersTab;
