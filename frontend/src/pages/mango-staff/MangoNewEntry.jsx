import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, Loader2, TestTube, Phone, UserCircle, Barcode, Trash2, AlertTriangle, Star } from 'lucide-react';

const MangoNewEntry = () => {
  const s = useMangoStaff();

  return (
    <div className="px-4 pb-24">
      {/* Patient Information */}
      <div className="bg-[#141428] rounded-2xl p-4 mb-4 border border-white/10 border-l-4 border-l-teal-500">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-teal-400" />
          Patient Information
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500">Patient Name *</label>
              <Input 
                value={s.newEntryForm.patient_name} 
                onChange={(e) => s.setNewEntryForm({ ...s.newEntryForm, patient_name: e.target.value })} 
                placeholder="Enter patient name"
                className="bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500"
                data-testid="new-entry-patient-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  value={s.newEntryForm.patient_phone} 
                  onChange={(e) => s.setNewEntryForm({ ...s.newEntryForm, patient_phone: e.target.value })} 
                  placeholder="10-digit number"
                  className="pl-9 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500"
                  maxLength={10}
                  data-testid="new-entry-patient-phone"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Barcode (Manual)</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  value={s.newEntryForm.barcode} 
                  onChange={(e) => s.setNewEntryForm({ ...s.newEntryForm, barcode: e.target.value.toUpperCase() })} 
                  placeholder="Auto-generate if empty"
                  className="pl-9 font-mono bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500"
                  data-testid="new-entry-barcode"
                />
              </div>
            </div>
          </div>
          
          {/* Priority Selection */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Priority</label>
            <div className="flex gap-2">
              {[
                { key: 'normal', label: 'Normal', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
                { key: 'urgent', label: 'Urgent', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                { key: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
              ].map(p => (
                <button 
                  key={p.key}
                  onClick={() => s.setNewEntryForm({ ...s.newEntryForm, priority: p.key })}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium text-sm transition-all ${
                    s.newEntryForm.priority === p.key 
                      ? `${p.color} ring-2 ring-offset-1 ring-teal-500` 
                      : 'bg-[#1A1A2E] text-gray-500 border-white/10 hover:border-white/20'
                  }`}
                >
                  {p.key === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {p.key === 'urgent' && <Star className="w-3 h-3 inline mr-1" />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Test Selection */}
      <div className="bg-[#141428] rounded-2xl p-4 mb-4 border border-white/10 border-l-4 border-l-orange-500">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-orange-400" />
          Select Tests
        </h3>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            value={s.searchQuery} 
            onChange={(e) => s.setSearchQuery(e.target.value)} 
            placeholder="Search by test name or code..."
            className="pl-9 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500"
            data-testid="new-entry-test-search"
          />
        </div>
        
        {/* Available Tests Grid */}
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {s.tests.filter(t => 
            !s.searchQuery || 
            t.name?.toLowerCase().includes(s.searchQuery.toLowerCase()) || 
            t.code?.toLowerCase().includes(s.searchQuery.toLowerCase())
          ).map(test => (
            <div 
              key={test.id} 
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                s.newEntryForm.selectedTests.find(t => t.id === test.id)
                  ? 'bg-teal-500/20 border-teal-500/40'
                  : 'bg-[#1A1A2E] border-white/10 hover:bg-white/5'
              }`}
              onClick={() => s.addTestToEntry(test)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono">{test.code}</span>
                  <span className="font-medium text-sm text-white">{test.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{test.category}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-400">₹{test.price}</p>
                {s.newEntryForm.selectedTests.find(t => t.id === test.id) && (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 ml-auto mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Selected Tests */}
        {s.newEntryForm.selectedTests.length > 0 && (
          <div className="bg-teal-500/10 rounded-xl p-3 border border-teal-500/20">
            <p className="text-xs font-medium text-teal-400 mb-2">Selected Tests ({s.newEntryForm.selectedTests.length})</p>
            <div className="space-y-2">
              {s.newEntryForm.selectedTests.map(test => (
                <div key={test.id} className="flex items-center justify-between bg-[#1A1A2E] rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">{test.code}</span>
                    <span className="font-medium text-sm text-white">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-400">₹{test.price}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); s.removeTestFromEntry(test.id); }}
                      className="text-red-400 hover:bg-red-500/20 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-teal-500/30 flex justify-between items-center">
              <span className="font-bold text-white">Total Amount</span>
              <span className="text-xl font-bold text-amber-400">
                ₹{s.newEntryForm.selectedTests.reduce((sum, t) => sum + (t.price || 0), 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-[#141428] rounded-2xl p-4 mb-4 border border-white/10">
        <label className="text-xs font-medium text-gray-500">Additional Notes</label>
        <textarea 
          value={s.newEntryForm.notes}
          onChange={(e) => s.setNewEntryForm({ ...s.newEntryForm, notes: e.target.value })}
          className="w-full h-20 px-3 py-2 border border-white/10 rounded-lg resize-none mt-1 bg-[#1E1E36] text-white placeholder:text-gray-500"
          placeholder="Any special instructions..."
        />
      </div>

      {/* Submit Button */}
      <Button 
        onClick={s.handleCreateEntry} 
        disabled={s.loading || !s.newEntryForm.patient_name || !s.newEntryForm.patient_phone || s.newEntryForm.selectedTests.length === 0}
        className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg shadow-lg shadow-amber-500/25"
        data-testid="new-entry-submit"
      >
        {s.loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
        Create Booking Entry
      </Button>
    </div>
  );
};

export default MangoNewEntry;
