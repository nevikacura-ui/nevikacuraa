import React from 'react';
import { Button } from '@/components/ui/button';
import { User, Calendar, Pill, TestTube } from 'lucide-react';

const ColorTest = () => {
  const colors = [
    { name: 'Vibrant Orange (Current)', bg: '#FF6B35', text: 'white', accent: '#FCD34D' },
    { name: 'Electric Purple', bg: '#8B5CF6', text: 'white', accent: '#FDE68A' },
    { name: 'Electric Blue', bg: '#0EA5E9', text: 'white', accent: '#FCD34D' },
    { name: 'Salmon Pink', bg: '#F97171', text: 'white', accent: '#FEF3C7' },
    { name: 'Teal (Original)', bg: '#0D9488', text: 'white', accent: '#99F6E4' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Splash Screen Color Options</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {colors.map((color) => (
          <div 
            key={color.name}
            className="rounded-3xl overflow-hidden shadow-xl"
            style={{ backgroundColor: color.bg, height: '500px' }}
          >
            <div className="h-full flex flex-col items-center justify-center p-6">
              {/* Logo */}
              <div className="bg-white rounded-2xl px-4 py-3 shadow-xl mb-6">
                <img 
                  src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
                  alt="Nevika Cura" 
                  className="h-12 w-auto"
                />
              </div>
              
              {/* Title */}
              <h2 className="text-white text-xl font-bold mb-4 text-center">{color.name}</h2>
              
              {/* Icons */}
              <div className="flex gap-4 mb-6">
                {['📅', '💊', '🧪'].map((emoji, idx) => (
                  <div key={idx} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl">{emoji}</span>
                  </div>
                ))}
              </div>
              
              {/* Tagline */}
              <p className="text-white text-lg mb-6">
                All your care. <span style={{ color: color.accent }} className="font-bold">One app.</span>
              </p>
              
              {/* Button */}
              <Button 
                className="rounded-full px-8 py-6 font-bold text-lg shadow-xl"
                style={{ backgroundColor: 'white', color: color.bg }}
              >
                <User className="w-5 h-5 mr-2" />
                Login / Sign Up
              </Button>
              
              {/* Color code */}
              <p className="text-white/70 text-sm mt-4">{color.bg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorTest;
