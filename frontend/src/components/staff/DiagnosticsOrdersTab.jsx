import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  FlaskConical, Stethoscope, Calendar, FileText, Upload, XCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { 
  API, getStatusColor, getAuthHeaders
} from '@/pages/staff/staffUtils';

const DiagnosticsOrdersTab = ({ 
  diagnosticOrders,
  serviceOrders,
  diagnosticDate,
  setDiagnosticDate,
  diagnosticDateCounts,
  loadData,
  handleDiagnosticStatusUpdate,
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
        `${API}/admin/orders/cancel/diagnostics/${orderId}`,
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

  // Upload report handler
  const handleReportUpload = async (orderId, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      toast.loading('Uploading report...');
      await axios.post(
        `${API}/staff/diagnostic/orders/${orderId}/upload-report`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.dismiss();
      toast.success('Report uploaded successfully');
      loadData();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
  };

  // Upload invoice handler
  const handleInvoiceUpload = async (orderId, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      toast.loading('Uploading invoice...');
      await axios.post(
        `${API}/staff/diagnostic/orders/${orderId}/upload-invoice`,
        formData,
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.dismiss();
      toast.success('Invoice uploaded successfully');
      loadData();
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div data-testid="diagnostics-orders-tab">
      {/* Service-Linked Orders (from clinic add-ons) */}
      {serviceOrders && serviceOrders.length > 0 && (
        <Card className="p-4 mb-4 border-2 border-teal-200">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-500" />
            Clinic Add-on Services
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">{serviceOrders.length} orders</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">Blood tests, Sonography & ECG ordered during clinic visits at Pushpa/Amnion Clinic</p>
          
          <div className="space-y-3">
            {serviceOrders.map((order) => (
              <div key={order.id} className="p-4 bg-teal-50 rounded-lg border border-teal-200" data-testid={`service-order-${order.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{order.patient_name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-800">
                      {order.clinic || 'Clinic Add-on'}
                    </span>
                    {order.report_url && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Report Uploaded
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{order.patient_phone}</span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Service:</strong> {order.service_type?.replace('_', ' ')} | 
                  <strong> Tests:</strong> {order.tests?.join(', ') || 'N/A'} |
                  <strong> Doctor:</strong> {order.doctor || 'N/A'}
                </div>
                
                {/* Invoice Upload Section */}
                {!order.invoice_url && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2 flex items-center gap-1">
                      <Upload className="w-4 h-4" />
                      <strong>Upload Invoice</strong>
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleInvoiceUpload(order.id, e.target.files[0])}
                      className="text-sm"
                      data-testid={`upload-invoice-${order.id}`}
                    />
                  </div>
                )}
                
                {order.invoice_url && (
                  <div className="mb-3">
                    <a href={order.invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      View Invoice
                    </a>
                  </div>
                )}
                
                {/* Report Upload Section - Required before Reports Generated */}
                {!order.report_url && order.status !== 'Reports Generated' && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 mb-2 flex items-center gap-1">
                      <Upload className="w-4 h-4" />
                      <strong>Upload Report</strong> (Required before Reports Generated)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleReportUpload(order.id, e.target.files[0])}
                      className="text-sm"
                      data-testid={`upload-report-${order.id}`}
                    />
                  </div>
                )}
                
                {order.report_url && (
                  <div className="mb-3">
                    <a href={order.report_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      View Report
                    </a>
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={order.status === status ? 'default' : 'outline'}
                      onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                      disabled={
                        order.status === status ||
                        (status === 'Reports Generated' && !order.report_url)
                      }
                      className={order.status === status ? 'bg-teal-500' : ''}
                      title={status === 'Reports Generated' && !order.report_url ? 'Upload report first' : ''}
                      data-testid={`service-status-${order.id}-${status.toLowerCase().replace(/ /g, '-')}`}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Regular Diagnostic Orders */}
      <Card className="p-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-500" />
            Diagnostic Orders
          </h2>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={diagnosticDate}
              onChange={(e) => setDiagnosticDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
              data-testid="diagnostic-date-input"
            />
            {diagnosticDateCounts[diagnosticDate] && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {diagnosticDateCounts[diagnosticDate].total} orders
                {diagnosticDateCounts[diagnosticDate].pending > 0 && (
                  <span className="ml-1 text-red-600">({diagnosticDateCounts[diagnosticDate].pending} pending)</span>
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
            const counts = diagnosticDateCounts[dateStr];
            const isSelected = dateStr === diagnosticDate;
            return (
              <button
                key={offset}
                onClick={() => setDiagnosticDate(dateStr)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex flex-col items-center min-w-[80px] ${
                  isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
                data-testid={`diagnostic-date-${offset}`}
              >
                <span className="font-medium">{offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-xs">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                {counts && (
                  <span className={`text-xs mt-1 ${isSelected ? 'text-purple-100' : 'text-gray-500'}`}>
                    {counts.total} {counts.pending > 0 && `(${counts.pending})`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="space-y-3">
          {diagnosticOrders.filter(o => !o.linked_appointment_id).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders for {diagnosticDate}</p>
          ) : (
            diagnosticOrders.filter(o => !o.linked_appointment_id).map((order) => (
              <div key={order.id} className="p-4 bg-gray-50 rounded-lg" data-testid={`diagnostic-order-${order.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{order.patient_name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    {order.report_url && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                        <FileText className="w-3 h-3 inline mr-1" />
                        Report Uploaded
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{order.patient_phone}</span>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {order.tests?.slice(0, 3).join(', ')}{order.tests?.length > 3 ? '...' : ''}
                </div>
                
                {/* Report Upload Section - Required before Reports Generated */}
                {!order.report_url && order.status !== 'Reports Generated' && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 mb-2 flex items-center gap-1">
                      <Upload className="w-4 h-4" />
                      <strong>Upload Report</strong> (Required before Reports Generated)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleReportUpload(order.id, e.target.files[0])}
                      className="text-sm"
                      data-testid={`upload-diag-report-${order.id}`}
                    />
                  </div>
                )}
                
                {order.report_url && (
                  <div className="mb-3">
                    <a href={order.report_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      View Report
                    </a>
                  </div>
                )}
                
                <div className="flex gap-2 flex-wrap items-center">
                  {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={order.status === status ? 'default' : 'outline'}
                      onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                      disabled={
                        order.status === status ||
                        order.status === 'cancelled' ||
                        (status === 'Reports Generated' && !order.report_url)
                      }
                      className={order.status === status ? 'bg-purple-500' : ''}
                      title={status === 'Reports Generated' && !order.report_url ? 'Upload report first' : ''}
                      data-testid={`diagnostic-status-${order.id}-${status.toLowerCase().replace(/ /g, '-')}`}
                    >
                      {status}
                    </Button>
                  ))}
                  
                  {/* Admin Cancel Button */}
                  {isAdmin && order.status !== 'cancelled' && order.status !== 'Reports Generated' && (
                    <>
                      {showCancelConfirm === order.id ? (
                        <div className="flex items-center gap-2 ml-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-700">Cancel order?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingOrder === order.id}
                            data-testid={`confirm-cancel-diagnostic-${order.id}`}
                          >
                            {cancellingOrder === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : 'Yes'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCancelConfirm(null)}
                            data-testid={`abort-cancel-diagnostic-${order.id}`}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCancelConfirm(order.id)}
                          className="ml-2 text-red-600 border-red-200 hover:bg-red-50"
                          data-testid={`cancel-diagnostic-${order.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default DiagnosticsOrdersTab;
