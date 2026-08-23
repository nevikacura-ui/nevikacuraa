import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, FileText, ChevronRight, Loader2, TestTube, Send, Upload, Link, Clock, RefreshCw, Navigation } from 'lucide-react';

const TEST_STATUSES = [
  { key: 'test_booked', label: 'Test Booked', color: '#3b82f6', bgColor: '#dbeafe' },
  { key: 'sample_collected', label: 'Sample Collected', color: '#f59e0b', bgColor: '#fef3c7' },
  { key: 'in_process', label: 'In Process', color: '#8b5cf6', bgColor: '#e9d5ff' },
  { key: 'report_generated', label: 'Report Generated', color: '#22c55e', bgColor: '#dcfce7' },
  { key: 'completed', label: 'Completed', color: '#10b981', bgColor: '#d1fae5' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' }
];

const MangoActiveBookings = () => {
  const s = useMangoStaff();
  
  return (
    <div className="px-4 pb-24">
      {/* Search and Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Search bookings..." 
            value={s.searchQuery} 
            onChange={(e) => s.setSearchQuery(e.target.value)} 
            className="pl-9 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500" 
          />
        </div>
        <select 
          value={s.selectedStatus} 
          onChange={(e) => s.setSelectedStatus(e.target.value)} 
          className="px-3 py-2 border border-white/10 rounded-lg bg-[#1E1E36] text-white text-sm"
        >
          <option value="all">All Status</option>
          {TEST_STATUSES.map(st => (<option key={st.key} value={st.key}>{st.label}</option>))}
        </select>
      </div>
      
      {/* Bookings List */}
      <div className="space-y-3">
        {s.filteredBookings.length === 0 ? (
          <div className="bg-[#141428] rounded-2xl p-8 text-center border border-white/10">
            <TestTube className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          s.filteredBookings.map(booking => {
            const currentStatus = TEST_STATUSES.find(st => st.key === booking.status) || TEST_STATUSES[0];
            const currentIndex = TEST_STATUSES.findIndex(st => st.key === booking.status);
            const nextStatus = currentIndex < TEST_STATUSES.length - 2 ? TEST_STATUSES[currentIndex + 1] : null;
            return (
              <div key={booking.booking_id} className="bg-[#141428] rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-white">#{booking.booking_id}</p>
                    <p className="text-sm text-gray-300">{booking.patient_name}</p>
                    <p className="text-xs text-gray-500">{booking.patient_phone}</p>
                    {booking.created_at && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Booked: {new Date(booking.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-semibold block mb-1" 
                      style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color }}
                    >
                      {currentStatus.label}
                    </span>
                    {booking.payment_method && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        booking.payment_method === 'cod' ? 'bg-green-500/20 text-green-400' :
                        booking.payment_method === 'pay_later' ? 'bg-purple-500/20 text-purple-400' :
                        booking.payment_method === 'cashfree' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {booking.payment_method === 'cod' ? 'Cash' : 
                         booking.payment_method === 'pay_later' ? 'Pay Later' : 
                         booking.payment_method === 'cashfree' ? 'Online' : booking.payment_method}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Payment Status for Pay Later bookings */}
                {booking.payment_method === 'pay_later' && (
                  <div className={`flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-xl ${
                    booking.payment_status === 'PAID' ? 'bg-green-500/10 text-green-400' :
                    booking.payment_status === 'LINK_SENT' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {booking.payment_status === 'PAID' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Payment Received</>
                    ) : booking.payment_status === 'LINK_SENT' ? (
                      <><Link className="w-3 h-3" /> Payment Link Sent</>
                    ) : (
                      <><Clock className="w-3 h-3" /> Awaiting Payment Link</>
                    )}
                  </div>
                )}
                
                {/* Tests Info */}
                <div className="bg-[#1A1A2E] rounded-xl p-3 mb-3 border border-white/10">
                  <p className="text-xs text-gray-500">Tests:</p>
                  <p className="text-sm font-medium text-white">{booking.tests?.join(', ') || 'N/A'}</p>
                  <p className="text-xs text-amber-400 font-semibold mt-1">₹{booking.total_amount || 0}</p>
                </div>
                
                {booking.report_uploaded && (
                  <div className="flex items-center gap-2 text-xs text-green-400 mb-3">
                    <FileText className="w-3 h-3" />
                    <span>Report uploaded</span>
                    <button 
                      onClick={() => s.sendReportToPatient(booking.booking_id)} 
                      className="ml-auto text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Send
                    </button>
                  </div>
                )}
                
                {s.uploadingReport === booking.booking_id && (
                  <div className="mb-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-xs text-amber-400 mb-2">Upload report PDF</p>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => { if (e.target.files[0]) s.handleReportUpload(booking.booking_id, e.target.files[0]); }} 
                      className="text-xs text-gray-600" 
                    />
                  </div>
                )}
                
                {/* Progress Bar */}
                <div className="flex gap-1 mb-3">
                  {TEST_STATUSES.slice(0, -1).map((status, idx) => (
                    <div 
                      key={status.key} 
                      className="flex-1 h-1.5 rounded-full transition-all" 
                      style={{ backgroundColor: idx <= currentIndex ? status.color : '#374151' }} 
                    />
                  ))}
                </div>
                
                {/* Send Collection Link - shown for test_booked or sample_collected status */}
                {(booking.status === 'test_booked') && (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => {
                        const bId = booking.booking_id;
                        const domain = window.location.origin;
                        const link = `${domain}/collect/${bId}`;
                        const msg = encodeURIComponent(`Mango Health Labs - Sample Collection\nBooking #${bId}\nPatient: ${booking.patient_name || 'Patient'}\nPhone: ${booking.patient_phone || ''}\nTests: ${(booking.tests || []).map(t => typeof t === 'string' ? t : t?.name || t?.test_name || 'Test').join(', ') || 'Lab Tests'}\n\nOpen this link to navigate & confirm collection:\n${link}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }}
                      data-testid={`send-collection-link-${booking.booking_id}`}>
                      <Navigation className="w-3.5 h-3.5" /> Send Collection Link
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/collect/${booking.booking_id}`;
                        navigator.clipboard?.writeText(link);
                      }}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-medium border"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', borderColor: 'rgba(255,255,255,0.1)' }}
                      data-testid={`copy-collection-link-${booking.booking_id}`}>
                      Copy Link
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {booking.payment_method === 'pay_later' && booking.payment_status !== 'PAID' && booking.total_amount > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent"
                      onClick={() => s.sendPaymentLink(booking)}
                      disabled={s.sendingPaymentLink === booking.booking_id}
                      data-testid={`send-payment-link-${booking.booking_id}`}
                    >
                      {s.sendingPaymentLink === booking.booking_id ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending...</>
                      ) : booking.payment_status === 'LINK_SENT' ? (
                        <><RefreshCw className="w-3 h-3 mr-1" /> Resend Link</>
                      ) : (
                        <><Link className="w-3 h-3 mr-1" /> Send Payment Link</>
                      )}
                    </Button>
                  )}
                  {booking.status === 'in_process' && !booking.report_uploaded && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-white/10 text-gray-400 hover:bg-white/10 bg-transparent"
                      onClick={() => s.setUploadingReport(booking.booking_id)}
                    >
                      <Upload className="w-3 h-3 mr-1" /> Upload Report
                    </Button>
                  )}
                  {nextStatus && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <Button 
                      size="sm" 
                      className="flex-1 text-white font-semibold" 
                      style={{ backgroundColor: nextStatus.color }} 
                      onClick={() => s.updateBookingStatus(booking.booking_id, nextStatus.key)}
                    >
                      {nextStatus.label} <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  {booking.status === 'report_generated' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" 
                      onClick={() => s.updateBookingStatus(booking.booking_id, 'completed')}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  )}
                  {/* Invoice Download Button */}
                  <a href={`${process.env.REACT_APP_BACKEND_URL}/api/mango/invoice/${booking.booking_id}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold no-underline"
                    style={{ background: '#D4A01730', color: '#D4A017', border: '1px solid #D4A01740' }}
                    data-testid={`invoice-btn-${booking.booking_id}`}
                  >
                    <FileText className="w-3 h-3" /> Invoice
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MangoActiveBookings;
