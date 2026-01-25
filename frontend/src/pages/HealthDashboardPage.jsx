import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EnhancedHealthDashboard from '@/components/EnhancedHealthDashboard';
import BottomNav from '@/components/BottomNav';

const HealthDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
            My Health
          </h1>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4">
        <EnhancedHealthDashboard />
      </div>

      <BottomNav />
    </div>
  );
};

export default HealthDashboardPage;
