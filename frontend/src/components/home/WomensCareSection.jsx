import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

/**
 * Women's Care Section (Holistic Women Care)
 * Based on reference screenshot showing PCOS, Fertility, Pregnancy, etc.
 */
const WomensCareSection = () => {
  const navigate = useNavigate();

  const womensCareItems = [
    {
      id: 'pcos',
      name: 'PCOS',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
      path: '/evara?concern=pcos'
    },
    {
      id: 'fertility',
      name: 'Fertility',
      image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=200&h=200&fit=crop',
      path: '/evara?concern=fertility'
    },
    {
      id: 'pregnancy-tests',
      name: 'Pregnancy Tests',
      image: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=200&h=200&fit=crop',
      path: '/proton?category=pregnancy'
    },
    {
      id: 'pregnancy-packages',
      name: 'Pregnancy Packages',
      image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop',
      path: '/health-packages?category=maternity'
    },
    {
      id: 'ultrasound',
      name: 'Pregnancy Ultrasound',
      image: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=200&h=200&fit=crop',
      path: '/proton?category=sonography'
    },
    {
      id: 'postpartum',
      name: 'Postpartum Care',
      image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=200&h=200&fit=crop',
      path: '/evara?concern=postpartum'
    },
    {
      id: 'menopause',
      name: 'Menopause',
      image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
      path: '/evara?concern=menopause'
    },
    {
      id: 'obstetric-history',
      name: 'Bad Obstetric History',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop',
      path: '/evara?concern=boh'
    }
  ];

  return (
    <div className="py-6 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-white rounded-2xl px-4 -mx-4" data-testid="womens-care-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👩‍⚕️</span>
          <h2 className="text-lg font-bold text-slate-800">Holistic Women Care</h2>
          <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Evara
          </span>
        </div>
        <button 
          onClick={() => navigate('/evara')}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {womensCareItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="flex-shrink-0 flex flex-col items-center w-24 group"
            data-testid={`womens-care-${item.id}`}
          >
            {/* Image Container */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-2 border-2 border-purple-100 shadow-sm group-hover:border-purple-300 group-hover:shadow-md transition-all duration-300">
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            
            {/* Name */}
            <span className="text-xs font-medium text-slate-700 text-center leading-tight line-clamp-2">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WomensCareSection;
