import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit2, TestTube } from 'lucide-react';

const MangoTestRates = () => {
  const s = useMangoStaff();

  return (
    <div className="px-4 pb-24">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Search tests..." 
            value={s.searchQuery} 
            onChange={(e) => s.setSearchQuery(e.target.value)} 
            className="pl-9 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500" 
          />
        </div>
        <Button 
          onClick={() => { s.setShowTestForm(true); s.setEditingTest(null); }} 
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Test
        </Button>
      </div>
      <div className="space-y-3">
        {s.tests.length === 0 ? (
          <div className="bg-[#141428] rounded-2xl p-8 text-center border border-white/10">
            <TestTube className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No tests in catalog</p>
          </div>
        ) : (
          s.tests.map(test => (
            <div key={test.id} className="bg-[#141428] rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono">{test.code}</span>
                    <h3 className="font-semibold text-white">{test.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{test.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">₹{test.price}</p>
                  {test.home_collection_price && (
                    <p className="text-xs text-gray-500">Home: ₹{test.home_collection_price}</p>
                  )}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-3 border-white/10 text-gray-400 hover:bg-white/10 bg-transparent" 
                onClick={() => { 
                  s.setEditingTest(test); 
                  s.setTestForm({ 
                    name: test.name || '', 
                    code: test.code || '', 
                    category: test.category || '', 
                    description: test.description || '', 
                    price: String(test.price || ''), 
                    home_collection_price: String(test.home_collection_price || ''), 
                    sample_type: test.sample_type || '', 
                    turnaround_time: test.turnaround_time || '', 
                    fasting_required: test.fasting_required || false, 
                    preparation_instructions: test.preparation_instructions || '' 
                  }); 
                  s.setShowTestForm(true); 
                }}
              >
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MangoTestRates;
