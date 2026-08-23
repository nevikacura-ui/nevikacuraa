/**
 * useAppointmentWebSocket - Real-time appointment updates via WebSocket
 * 
 * Usage:
 * const { isConnected, lastUpdate, appointments } = useAppointmentWebSocket({
 *   portal: 'diagyn_staff', // diagyn_staff, mango_staff, pharmacy_staff, doctor, patient
 *   clinic: 'Pushpa Clinic',
 *   date: '2026-02-16',
 *   doctorName: null, // For doctor portal
 *   patientMobile: null, // For patient portal
 *   onNewAppointment: (apt) => { ... },
 *   onStatusChange: (apt) => { ... },
 *   onQueueUpdate: (queue) => { ... }
 * });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = () => {
  if (!API_BASE) return null;
  const wsProtocol = API_BASE.startsWith('https') ? 'wss' : 'ws';
  const baseUrl = API_BASE.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${baseUrl}`;
};

export const useAppointmentWebSocket = ({
  portal = 'diagyn_staff',
  clinic = null,
  date = null,
  doctorName = null,
  patientMobile = null,
  enabled = true,
  onNewAppointment = null,
  onStatusChange = null,
  onQueueUpdate = null,
  showToasts = true
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Build WebSocket URL with query parameters
  const buildWsUrl = useCallback(() => {
    const wsBase = getWebSocketUrl();
    if (!wsBase) return null;
    
    const params = new URLSearchParams();
    params.append('portal', portal);
    
    if (clinic) params.append('clinic', clinic);
    if (date) params.append('date', date);
    if (doctorName) params.append('doctor_name', doctorName);
    if (patientMobile) params.append('patient_mobile', patientMobile);
    
    return `${wsBase}/api/ws/appointments?${params.toString()}`;
  }, [portal, clinic, date, doctorName, patientMobile]);
  
  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('[WS] Connected to appointments:', data.room);
          setIsConnected(true);
          setConnectionError(null);
          setReconnectAttempt(0);
          break;
          
        case 'new_appointment':
          console.log('[WS] New appointment:', data.appointment);
          setLastUpdate({ type: 'new_appointment', data: data.appointment, timestamp: data.timestamp });
          if (onNewAppointment) onNewAppointment(data.appointment);
          if (showToasts) {
            toast.info(`New Appointment: ${data.appointment.patient_name}`, {
              description: `${data.appointment.time || 'Emergency'} with ${data.appointment.doctor}`
            });
          }
          break;
          
        case 'status_change':
          console.log('[WS] Status change:', data.appointment);
          setLastUpdate({ type: 'status_change', data: data.appointment, timestamp: data.timestamp });
          if (onStatusChange) onStatusChange(data.appointment);
          if (showToasts) {
            const statusLabels = {
              'Booked': 'Booked',
              'CheckedIn': 'Checked In',
              'WithDoctor': 'With Doctor',
              'Completed': 'Completed',
              'Cancelled': 'Cancelled'
            };
            toast.success(`${data.appointment.patient_name}: ${statusLabels[data.appointment.status] || data.appointment.status}`, {
              description: data.appointment.token_number ? `Token #${data.appointment.token_number}` : undefined
            });
          }
          break;
          
        case 'queue_update':
          console.log('[WS] Queue update:', data.queue);
          setLastUpdate({ type: 'queue_update', data: data.queue, timestamp: data.timestamp });
          if (onQueueUpdate) onQueueUpdate(data.queue);
          break;
          
        case 'heartbeat':
          // Server heartbeat - connection is alive
          break;
          
        case 'pong':
          // Response to our ping
          break;
          
        case 'subscribed':
          console.log('[WS] Subscribed to:', data.room);
          break;
          
        default:
          console.log('[WS] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }, [onNewAppointment, onStatusChange, onQueueUpdate, showToasts]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;
    
    const url = buildWsUrl();
    if (!url) {
      console.warn('[WS] Cannot build WebSocket URL');
      return;
    }
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    console.log('[WS] Connecting to:', url);
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[WS] Connection opened');
        setIsConnected(true);
        setConnectionError(null);
        
        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000); // Ping every 25 seconds
      };
      
      ws.onmessage = handleMessage;
      
      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setConnectionError('Connection error');
      };
      
      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('[WS] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt reconnection with exponential backoff
        if (enabled && event.code !== 1000) { // 1000 = normal closure
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000); // Max 30 seconds
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectAttempt(prev => prev + 1);
              connect();
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setConnectionError(error.message);
    }
  }, [enabled, buildWsUrl, handleMessage, reconnectAttempt]);
  
  // Subscribe to different room (e.g., when date changes)
  const subscribe = useCallback((newClinic, newDate) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        clinic: newClinic,
        date: newDate
      }));
    }
  }, []);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  // Effect to manage connection lifecycle
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, portal, clinic, date, doctorName, patientMobile]); // Reconnect when params change
  
  return {
    isConnected,
    connectionError,
    lastUpdate,
    reconnectAttempt,
    subscribe,
    disconnect,
    reconnect: connect
  };
};

export default useAppointmentWebSocket;
