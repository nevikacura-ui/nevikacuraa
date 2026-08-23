import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Calculator, X, Send, Trash2 } from 'lucide-react';

const MangoCalculator = () => {
  const s = useMangoStaff();

  return (
    <div className="px-4 pb-24">
      {/* Search Tests */}
      <div className="bg-[#141428] rounded-2xl p-4 mb-4 border border-white/10 border-l-4 border-l-purple-500">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-400" />
          Cost Estimator
        </h3>
        <p className="text-xs text-gray-500 mb-3">Search and add tests to calculate estimated cost</p>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            value={s.calculatorSearch} 
            onChange={(e) => s.setCalculatorSearch(e.target.value)} 
            placeholder="Search by name, code, or barcode..."
            className="pl-9 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500"
            data-testid="calculator-search"
          />
        </div>
        
        {/* Search Results */}
        {s.calculatorSearch && (
          <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-white/10 rounded-lg p-2 bg-[#1A1A2E]">
            {s.filteredTestsForSearch.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No tests found</p>
            ) : (
              s.filteredTestsForSearch.slice(0, 10).map(test => (
                <div 
                  key={test.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-[#141428] border border-white/10 hover:border-purple-500/40 cursor-pointer transition-all"
                  onClick={() => { s.addTestToCalculator(test); s.setCalculatorSearch(''); }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono">{test.code}</span>
                      <span className="font-medium text-sm text-white">{test.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{test.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-400">₹{test.price}</span>
                    <Plus className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Added Tests */}
      <div className="bg-[#141428] rounded-2xl p-4 mb-4 border border-white/10">
        <h3 className="font-semibold text-white mb-3">
          Selected Tests ({s.calculatorTests.length})
        </h3>
        
        {s.calculatorTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Add tests to calculate cost</p>
          </div>
        ) : (
          <div className="space-y-2">
            {s.calculatorTests.map((test, index) => (
              <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">{index + 1}</span>
                  <div>
                    <span className="font-medium text-sm text-white">{test.name}</span>
                    <span className="text-xs text-gray-500 ml-2 font-mono">{test.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">₹{test.price}</span>
                  <button 
                    onClick={() => s.removeTestFromCalculator(test.id)}
                    className="text-red-400 hover:bg-red-500/20 p-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Calculation */}
      {s.calculatorTests.length > 0 && (
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex justify-between items-center mb-3">
            <span className="text-purple-100">Subtotal ({s.calculatorTests.length} tests)</span>
            <span className="font-bold text-lg">₹{s.calculateTotal()}</span>
          </div>
          <div className="flex justify-between items-center mb-3 text-sm">
            <span className="text-purple-200">Home Collection (if applicable)</span>
            <span>+₹100</span>
          </div>
          <div className="border-t border-purple-400 pt-3 flex justify-between items-center">
            <span className="font-bold text-lg">Estimated Total</span>
            <span className="text-3xl font-bold">₹{s.calculateTotal()}</span>
          </div>
          <p className="text-xs text-purple-200 mt-2">* Final amount may vary based on additional services</p>
          
          <Button 
            onClick={() => {
              const testList = s.calculatorTests.map(t => `${t.code}: ${t.name} - ₹${t.price}`).join('\n');
              const message = `🧪 Mango Health Labs - Estimate\n\nTests:\n${testList}\n\nTotal: ₹${s.calculateTotal()}`;
              navigator.clipboard.writeText(message);
              import('sonner').then(m => m.toast.success('Estimate copied to clipboard!'));
            }}
            className="w-full mt-4 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25"
          >
            <Send className="w-4 h-4 mr-2" />
            Copy Estimate to Share
          </Button>
          
          <Button 
            onClick={() => s.setCalculatorTests([])}
            variant="outline"
            className="w-full mt-2 border-white/30 text-white hover:bg-white/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default MangoCalculator;
