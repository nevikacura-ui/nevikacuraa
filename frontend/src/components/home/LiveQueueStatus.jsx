import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer } from 'lucide-react';

const LiveQueueStatus = ({ queueStatus = [] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="mb-8 p-5 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl" data-testid="live-queue-preview">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <Timer className="w-5 h-5 text-teal-400" />
          Live Queue Status
        </h3>
        <button 
          onClick={() => navigate('/queue')}
          className="text-xs text-teal-400 hover:text-teal-300 font-medium"
        >
          View All →
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {queueStatus.map((queue, idx) => (
          <div 
            key={idx}
            className={`flex-shrink-0 px-4 py-3 rounded-2xl flex items-center gap-3 border ${
              queue.status === 'low' ? 'bg-green-500/10 border-green-500/30' :
              queue.status === 'moderate' ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              queue.status === 'low' ? 'bg-green-500' :
              queue.status === 'moderate' ? 'bg-amber-500' :
              'bg-red-500'
            }`}></div>
            <div>
              <p className="text-sm font-medium text-white">{queue.clinic}</p>
              <p className={`text-xs ${
                queue.status === 'low' ? 'text-green-400' :
                queue.status === 'moderate' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {queue.waitTime} • {queue.patients} waiting
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveQueueStatus;
