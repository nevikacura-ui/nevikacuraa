import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, TestTube, Calendar, ShoppingCart, ChevronRight, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PostVisitRecommendations = ({ appointmentId, onClose }) => {
  const navigate = useNavigate();
  const { addToPharmacyCart, addToLabCart } = useCart();
  const [recs, setRecs] = useState(null);
  const [addedMeds, setAddedMeds] = useState(new Set());
  const [addedTests, setAddedTests] = useState(new Set());

  useEffect(() => {
    if (!appointmentId) return;
    axios.get(`${API}/appointments/${appointmentId}/recommendations`)
      .then(res => setRecs(res.data))
      .catch(() => {});
  }, [appointmentId]);

  if (!recs || (!recs.medicines?.length && !recs.lab_tests?.length)) return null;

  const handleAddMed = (med) => {
    addToPharmacyCart({ name: med.name, price: med.price, quantity: 1, discountEligible: true });
    setAddedMeds(prev => new Set([...prev, med.name]));
    toast.success(`${med.name} added to cart`);
  };

  const handleAddTest = (test) => {
    addToLabCart({ name: test.name, price: test.price });
    setAddedTests(prev => new Set([...prev, test.name]));
    toast.success(`${test.name} added to cart`);
  };

  return (
    <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-4" data-testid="post-visit-recommendations">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-bold text-white">Recommended For You</h3>
      </div>

      {recs.follow_up && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Calendar className="w-4 h-4 text-amber-400" />
          <p className="text-xs text-amber-300">Follow-up: {recs.follow_up}</p>
        </div>
      )}

      {recs.medicines?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <Pill className="w-3 h-3" /> Medicines
          </p>
          <div className="space-y-1.5">
            {recs.medicines.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-medium text-white">{med.name}</p>
                  <p className="text-[10px] text-gray-500">{med.in_stock ? 'In Stock' : 'Check availability'}</p>
                </div>
                <button
                  onClick={() => handleAddMed(med)}
                  disabled={addedMeds.has(med.name)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                    addedMeds.has(med.name) ? 'bg-green-500/20 text-green-400' : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
                  }`}
                >
                  {addedMeds.has(med.name) ? 'Added' : `+ ₹${med.price}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.lab_tests?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <TestTube className="w-3 h-3" /> Lab Tests
          </p>
          <div className="space-y-1.5">
            {recs.lab_tests.map((test, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-medium text-white">{test.name}</p>
                  <p className="text-[10px] text-gray-500">{test.description}</p>
                </div>
                <button
                  onClick={() => handleAddTest(test)}
                  disabled={addedTests.has(test.name)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                    addedTests.has(test.name) ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  }`}
                >
                  {addedTests.has(test.name) ? 'Added' : `+ ₹${test.price}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => navigate('/cart')}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-gray-300 text-xs hover:bg-white/10 transition-all"
      >
        <ShoppingCart className="w-3.5 h-3.5" /> View Cart <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default PostVisitRecommendations;
