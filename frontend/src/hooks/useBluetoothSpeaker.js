import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'bt_speaker_state';

export function useBluetoothSpeaker() {
  const [connected, setConnected] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).connected || false; } catch { return false; }
    }
    return false;
  });

  const [deviceName, setDeviceName] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).deviceName || ''; } catch { return ''; }
    }
    return '';
  });

  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);

  const [autoConnectEnabled, setAutoConnectEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).autoConnect || false; } catch { return false; }
    }
    return false;
  });

  // Persist state
  const saveState = useCallback((conn, name, auto) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      connected: conn,
      deviceName: name,
      autoConnect: auto,
      lastConnected: conn ? Date.now() : null,
    }));
  }, []);

  // Simulate scanning — shows nearby "devices" with Mivi at the top
  const scan = useCallback(() => {
    setScanning(true);
    setScanResults([]);

    // Simulate progressive device discovery
    const devices = [
      { id: 'mivi-01', name: 'Mivi Roam 2', type: 'speaker', signal: -42, brand: 'mivi' },
      { id: 'mivi-02', name: 'Mivi Play', type: 'speaker', signal: -55, brand: 'mivi' },
      { id: 'other-01', name: 'JBL Flip 5', type: 'speaker', signal: -68, brand: 'other' },
      { id: 'other-02', name: 'Samsung TV', type: 'tv', signal: -72, brand: 'other' },
      { id: 'other-03', name: 'Mi Band 7', type: 'band', signal: -80, brand: 'other' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < devices.length) {
        setScanResults(prev => [...prev, devices[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setScanning(false);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  // Connect to a device (simulated)
  const connectDevice = useCallback((device) => {
    setDeviceName(device.name);
    setConnected(true);
    saveState(true, device.name, autoConnectEnabled);
    setScanResults([]);
  }, [autoConnectEnabled, saveState]);

  // Disconnect
  const disconnect = useCallback(() => {
    setConnected(false);
    setDeviceName('');
    saveState(false, '', autoConnectEnabled);
  }, [autoConnectEnabled, saveState]);

  // Toggle auto-connect
  const toggleAutoConnect = useCallback(() => {
    const next = !autoConnectEnabled;
    setAutoConnectEnabled(next);
    saveState(connected, deviceName, next);
  }, [autoConnectEnabled, connected, deviceName, saveState]);

  // Auto-connect on mount if enabled and was previously connected
  useEffect(() => {
    if (autoConnectEnabled && !connected) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.deviceName && state.lastConnected) {
            // Auto-reconnect after 1.5s (simulated)
            const timer = setTimeout(() => {
              setDeviceName(state.deviceName);
              setConnected(true);
              saveState(true, state.deviceName, true);
            }, 1500);
            return () => clearTimeout(timer);
          }
        } catch {}
      }
    }
  }, [autoConnectEnabled, connected, saveState]);

  return {
    connected,
    deviceName,
    scanning,
    scanResults,
    autoConnectEnabled,
    scan,
    connectDevice,
    disconnect,
    toggleAutoConnect,
  };
}
