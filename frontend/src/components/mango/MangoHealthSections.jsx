import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { womenCareItems, preventiveHealthItems, seniorHealthItems } from '@/data/mangoData';

function HealthScrollSection({ title, emoji, brandName, brandColor, borderColor, navigateTo, items, testIdPrefix, onAddTests }) {
  const navigate = useNavigate();

  return (
    <div className={`py-4 bg-gradient-to-br ${borderColor} rounded-2xl px-4 -mx-4`} data-testid={`${testIdPrefix}-section`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h2 className="text-lg font-bold text-[#2B2B2B]">{title}</h2>
          <span className={`px-2 py-0.5 ${brandColor} text-white text-[10px] font-bold rounded-full flex items-center gap-1`}>
            {brandName}
          </span>
        </div>
        <button
          onClick={() => navigate(navigateTo)}
          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onAddTests(item.tests, item.name);
            }}
            className="flex-shrink-0 flex flex-col items-center w-28 group"
            data-testid={`${testIdPrefix}-${item.id}`}
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-2 border-2 border-green-500/20 shadow-sm group-hover:border-green-500/40 group-hover:shadow-md transition-all duration-300">
              <img loading="lazy" src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight line-clamp-2">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MangoHealthSections({ setSelectedTests }) {
  const handleAddTests = (tests, categoryName) => {
    setSelectedTests(prev => {
      const newTests = [...prev];
      tests.forEach(test => {
        if (!newTests.includes(test)) {
          newTests.push(test);
        }
      });
      return newTests;
    });
    toast.success(`Added ${tests.length} tests from ${categoryName}`);
  };

  return (
    <>
      <HealthScrollSection
        title="Holistic Women Care"
        emoji="👩‍⚕️"
        brandName="Evara"
        brandColor="bg-green-500"
        borderColor="from-[#1F4F46]/10 via-[#2E6B5F]/5 to-white"
        navigateTo="/evara"
        items={womenCareItems}
        testIdPrefix="womens-care"
        onAddTests={handleAddTests}
      />
      <HealthScrollSection
        title="Preventive Health"
        emoji="🛡️"
        brandName="Reneu"
        brandColor="bg-blue-500"
        borderColor="from-[#4A90A4]/10 via-[#6BB3C9]/5 to-white"
        navigateTo="/reneu"
        items={preventiveHealthItems}
        testIdPrefix="preventive"
        onAddTests={handleAddTests}
      />
      <HealthScrollSection
        title="Senior Health"
        emoji="👴"
        brandName="Reneu"
        brandColor="bg-green-600"
        borderColor="from-[#8B5A2B]/10 via-[#A67C52]/5 to-white"
        navigateTo="/reneu"
        items={seniorHealthItems}
        testIdPrefix="senior"
        onAddTests={handleAddTests}
      />
    </>
  );
}
