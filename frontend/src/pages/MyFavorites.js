import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Trash2, Pill, FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const MyFavorites = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '';
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    axios.get(`${API}/favorites/${phone}`)
      .then(r => setFavorites(r.data.favorites || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  const removeFavorite = async (id) => {
    try {
      await axios.delete(`${API}/favorites/${id}`);
      toast.success('Removed from favorites');
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="dark-page min-h-screen pb-24" style={{ background: '#050510' }} data-testid="my-favorites-page">
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>My Favorites</h1>
        </div>
      </div>

      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-8 h-8 text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-sm">No favorites saved yet</p>
            <p className="text-white/10 text-xs mt-1">Save medicines & tests from Pharmacy or Lab pages</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {favorites.map(f => (
              <div key={f.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
                  background: f.item_type === 'medicine' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)'
                }}>
                  {f.item_type === 'medicine'
                    ? <Pill className="w-5 h-5 text-orange-400" />
                    : <FlaskConical className="w-5 h-5 text-green-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-semibold">{f.name}</p>
                  <p className="text-white/25 text-xs capitalize">{f.item_type}{f.price ? ` · ₹${f.price}` : ''}</p>
                </div>
                <button onClick={() => navigate(f.item_type === 'medicine' ? '/pharmacy' : '/mango')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                  style={{
                    color: f.item_type === 'medicine' ? '#fb923c' : '#4ade80',
                    background: f.item_type === 'medicine' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
                    border: `1px solid ${f.item_type === 'medicine' ? 'rgba(249,115,22,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  }}
                  data-testid={`fav-order-${f.id}`}>
                  Order
                </button>
                <button onClick={() => removeFavorite(f.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFavorites;
