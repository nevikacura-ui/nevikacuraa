import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Wifi, WifiOff, Bell, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

/**
 * Live Sync Hook for Staff Portals
 * Provides real-time updates for appointments and orders
 */
export const useLiveSync = (portal, staffId = null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  
  const connect = useCallback(() => {
    if (!WS_URL || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const wsUrl = `${WS_URL}/api/live-sync/staff/${portal}${staffId ? `?staff_id=${staffId}` : ''}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log(`[LiveSync] Connected to ${portal}`);
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') return;
          
          if (data.type === 'recent_events') {
            setRecentEvents(data.events || []);
            return;
          }
          
          if (data.type === 'connected') {
            toast.success(`Live sync connected to ${portal}`, { duration: 2000 });
            return;
          }
          
          // Handle different event types
          handleEvent(data);
          setLastEvent(data);
          setRecentEvents(prev => [...prev.slice(-9), data]);
        } catch (err) {
          console.error('[LiveSync] Error parsing message:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('[LiveSync] Disconnected');
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('[LiveSync] WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error('[LiveSync] Connection error:', err);
      setIsConnected(false);
    }
  }, [portal, staffId]);
  
  const handleEvent = (data) => {
    switch (data.type) {
      case 'new_appointment':
        toast.info(
          `🆕 New Appointment: ${data.data?.patient_name}`,
          {
            description: `Dr. ${data.data?.doctor_name} • ${data.data?.time_slot}`,
            duration: 8000
          }
        );
        break;
      
      case 'appointment_status_change':
        toast.info(
          `📋 Appointment Updated`,
          {
            description: `${data.data?.patient_name}: ${data.data?.old_status} → ${data.data?.new_status}`,
            duration: 5000
          }
        );
        break;
      
      case 'patient_checkin':
        toast.success(
          `✅ Patient Checked In: ${data.data?.patient_name}`,
          {
            description: `Queue Position: #${data.data?.queue_position}`,
            duration: 8000
          }
        );
        break;
      
      case 'new_pharmacy_order':
        toast.info(
          `🛒 New Pharmacy Order`,
          {
            description: `${data.data?.patient_name} • ${data.data?.items_count} items • ₹${data.data?.total_amount}`,
            duration: 8000
          }
        );
        break;
      
      case 'new_diagnostic_order':
        toast.info(
          `🧪 New Lab Test Order`,
          {
            description: `${data.data?.patient_name} • ${data.data?.items_count} tests • ₹${data.data?.total_amount}`,
            duration: 8000
          }
        );
        break;
      
      case 'pharmacy_order_status_change':
      case 'diagnostic_order_status_change':
        toast.info(
          `📦 Order Updated`,
          {
            description: `${data.data?.patient_name}: ${data.data?.old_status} → ${data.data?.new_status}`,
            duration: 5000
          }
        );
        break;
      
      default:
        console.log('[LiveSync] Unknown event:', data.type);
    }
  };
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return {
    isConnected,
    lastEvent,
    recentEvents,
    reconnect: connect
  };
};

/**
 * Live Sync Status Badge Component
 * Shows connection status and allows reconnection
 */
export const LiveSyncBadge = ({ portal, staffId = null }) => {
  const { isConnected, reconnect } = useLiveSync(portal, staffId);
  
  return (
    <button
      onClick={reconnect}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ${isConnected 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
        }
      `}
      title={isConnected ? 'Live sync active' : 'Click to reconnect'}
    >
      {isConnected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline</span>
          <RefreshCw className="w-3 h-3 ml-1" />
        </>
      )}
    </button>
  );
};

/**
 * Live Sync Notification Bell Component
 * Shows recent events count
 */
export const LiveSyncNotifications = ({ portal, staffId = null }) => {
  const { isConnected, recentEvents } = useLiveSync(portal, staffId);
  const [showEvents, setShowEvents] = useState(false);
  
  const unreadCount = recentEvents.filter(e => 
    e.type?.includes('new_') || e.type?.includes('checkin')
  ).length;
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowEvents(!showEvents)}
        className={`
          relative p-2 rounded-full transition-all
          ${isConnected ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/20'}
        `}
      >
        <Bell className={`w-5 h-5 ${isConnected ? 'text-white' : 'text-red-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {showEvents && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="font-semibold text-white">Recent Activity</span>
            <LiveSyncBadge portal={portal} staffId={staffId} />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No recent activity
              </div>
            ) : (
              recentEvents.slice().reverse().map((event, idx) => (
                <div 
                  key={idx} 
                  className="p-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {event.type?.includes('appointment') ? '📋' :
                       event.type?.includes('pharmacy') ? '💊' :
                       event.type?.includes('diagnostic') ? '🧪' :
                       event.type?.includes('checkin') ? '✅' : '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {event.data?.patient_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {event.type?.replace(/_/g, ' ').replace('new ', 'New ')}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default useLiveSync;
