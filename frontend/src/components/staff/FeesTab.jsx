import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Activity, AlertTriangle, Scan } from 'lucide-react';
import { FEE_CODES, SCAN_FEES } from '@/pages/staff/staffUtils';

// Fee item component for consistent styling
const FeeItem = ({ code, label, amount, colorClass = 'gray' }) => {
  const bgColors = {
    gray: 'bg-gray-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    pink: 'bg-pink-50',
    red: 'bg-red-50',
    cyan: 'bg-cyan-50',
    teal: 'bg-teal-50'
  };
  
  const textColors = {
    gray: 'text-gray-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    pink: 'text-pink-700',
    red: 'text-red-700',
    cyan: 'text-cyan-700',
    teal: 'text-teal-700'
  };
  
  const subTextColors = {
    gray: 'text-gray-500',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    red: 'text-red-600',
    cyan: 'text-cyan-600',
    teal: 'text-teal-600'
  };

  return (
    <div className={`flex justify-between items-center p-3 ${bgColors[colorClass]} rounded-lg`}>
      <div>
        <span className={`font-medium ${textColors[colorClass]}`}>{code}</span>
        <span className={`${subTextColors[colorClass]} text-sm ml-2`}>{label}</span>
      </div>
      <span className={`font-semibold ${textColors[colorClass]}`}>
        {amount === 0 ? '₹0' : `₹${amount.toLocaleString()}`}
      </span>
    </div>
  );
};

const FeesTab = () => {
  // Sonography/Scan fees
  const scanFees = [
    { code: 'ES', label: 'Early Scan', amount: 1000, color: 'cyan' },
    { code: 'NT', label: 'NT Scan', amount: 1200, color: 'cyan' },
    { code: 'GS', label: 'Growth Scan', amount: 1500, color: 'cyan' },
    { code: 'FL', label: 'Follicular', amount: 200, color: 'teal' },
    { code: 'UP', label: 'USG Pelvis', amount: 1000, color: 'teal' },
    { code: 'UT', label: 'UpT', amount: 100, color: 'teal' }
  ];

  return (
    <Card data-testid="fees-tab-content">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-500" />
          Fee Structure
        </h3>
        
        {/* Consultation Fees */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 border-b pb-2">Consultation Fees</h4>
          <div className="grid gap-2">
            <FeeItem code="G1" label="General - First" amount={150} colorClass="gray" />
            <FeeItem code="G2" label="General - Follow up" amount={100} colorClass="gray" />
            <FeeItem code="S1" label="Speciality - First" amount={300} colorClass="blue" />
            <FeeItem code="S2" label="Speciality - Follow up" amount={200} colorClass="blue" />
          </div>
        </div>
        
        {/* Diabetes Fees */}
        <div className="space-y-3">
          <h4 className="font-medium text-purple-700 border-b pb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Diabetes (Glydex)
          </h4>
          <div className="grid gap-2">
            <FeeItem code="D1" label="Diabetes - First" amount={500} colorClass="purple" />
            <FeeItem code="D2" label="Diabetes - Follow up" amount={400} colorClass="purple" />
            <FeeItem code="D3" label="Diabetes - Follow up" amount={300} colorClass="purple" />
          </div>
        </div>
        
        {/* OBGY Fees */}
        <div className="space-y-3">
          <h4 className="font-medium text-pink-700 border-b pb-2 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
              <path d="M12 18v4"/>
              <path d="M8 22h8"/>
            </svg>
            OBGY (ANC)
          </h4>
          <div className="grid gap-2">
            <FeeItem code="O1" label="OBGY - First" amount={500} colorClass="pink" />
            <FeeItem code="O2" label="OBGY - Follow up" amount={400} colorClass="pink" />
            <FeeItem code="O3" label="OBGY - Follow up" amount={300} colorClass="pink" />
          </div>
        </div>
        
        {/* Emergency */}
        <div className="space-y-3">
          <h4 className="font-medium text-red-700 border-b pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Emergency
          </h4>
          <div className="grid gap-2">
            <FeeItem code="E1" label="Emergency" amount={600} colorClass="red" />
            <FeeItem code="NF" label="No Fees" amount={0} colorClass="gray" />
          </div>
        </div>
        
        {/* Sonography/Scan Charges */}
        <div className="space-y-3">
          <h4 className="font-medium text-cyan-700 border-b pb-2 flex items-center gap-2">
            <Scan className="w-4 h-4" />
            Sonography Charges
          </h4>
          <div className="grid gap-2">
            {scanFees.map(fee => (
              <FeeItem 
                key={fee.code} 
                code={fee.code} 
                label={fee.label} 
                amount={fee.amount} 
                colorClass={fee.color} 
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeesTab;
