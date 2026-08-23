import React, { useState } from 'react';
import { Volume2, VolumeX, Bluetooth, BluetoothConnected, Power, Loader2, Wifi, Speaker } from 'lucide-react';
import { toast } from 'sonner';

const BluetoothSpeakerIndicator = ({
  connected,
  deviceName,
  scanning,
  scanResults,
  autoConnectEnabled,
  onScan,
  onConnectDevice,
  onDisconnect,
  onToggleAutoConnect,
}) => {
  const [showPanel, setShowPanel] = useState(false);

  const handleScan = () => {
    setShowPanel(true);
    onScan();
  };

  const handleConnect = (device) => {
    onConnectDevice(device);
    toast.success(`Connected to ${device.name}`);
    setTimeout(() => setShowPanel(false), 800);
  };

  const handleDisconnect = () => {
    onDisconnect();
    toast.info('Speaker disconnected');
    setShowPanel(false);
  };

  const signalBars = (signal) => {
    const strength = signal > -50 ? 3 : signal > -65 ? 2 : 1;
    return (
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all"
            style={{
              height: `${4 + i * 3}px`,
              background: i <= strength ? '#10B981' : '#333',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative" data-testid="bt-speaker-indicator">
      {/* Header Button */}
      <button
        onClick={connected ? () => setShowPanel(!showPanel) : handleScan}
        className="h-8 px-2 rounded-xl flex items-center gap-1 transition-all"
        style={{
          color: connected ? '#10B981' : scanning ? '#F59E0B' : '#78716C',
          background: connected ? 'rgba(16,185,129,0.12)' : 'transparent',
        }}
        data-testid="bt-speaker-btn"
      >
        {scanning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : connected ? (
          <>
            <Volume2 className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-wide">MIVI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </>
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>

      {/* Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />

          <div
            className="absolute top-full right-0 mt-2 w-72 rounded-2xl z-50 overflow-hidden"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            data-testid="bt-speaker-panel"
          >
            {/* Header */}
            <div className="p-4 pb-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Bluetooth Speaker</span>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 text-xs"
              >
                X
              </button>
            </div>

            {/* Connected Device */}
            {connected && (
              <div className="p-3 mx-3 mt-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                    <Speaker className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{deviceName}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Connected — Audio active</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            )}

            {/* Scan Results */}
            {!connected && (scanResults.length > 0 || scanning) && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {scanning ? 'Scanning...' : `${scanResults.length} devices found`}
                  </span>
                  {scanning && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {scanResults.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => handleConnect(device)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/5 active:scale-[0.98]"
                      style={{
                        background: device.brand === 'mivi' ? 'rgba(59,130,246,0.08)' : 'transparent',
                        border: device.brand === 'mivi' ? '1px solid rgba(59,130,246,0.15)' : '1px solid transparent',
                      }}
                      data-testid={`bt-device-${device.id}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: device.brand === 'mivi' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)' }}>
                        {device.type === 'speaker' ? (
                          <Speaker className="w-3.5 h-3.5" style={{ color: device.brand === 'mivi' ? '#60A5FA' : '#666' }} />
                        ) : (
                          <Wifi className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium text-white">{device.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {device.type === 'speaker' ? 'Speaker' : device.type === 'tv' ? 'Television' : 'Wearable'}
                        </p>
                      </div>
                      {signalBars(device.signal)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results yet, not scanning */}
            {!connected && scanResults.length === 0 && !scanning && (
              <div className="p-6 text-center">
                <VolumeX className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 mb-3">No speaker connected</p>
                <button
                  onClick={handleScan}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-blue-400 transition-colors"
                  style={{ background: 'rgba(59,130,246,0.1)' }}
                  data-testid="bt-scan-btn"
                >
                  Scan for devices
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Auto-connect Toggle */}
              <button
                onClick={onToggleAutoConnect}
                className="w-full flex items-center justify-between p-2.5 rounded-xl transition-colors"
                style={{ background: autoConnectEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)' }}
                data-testid="bt-auto-connect-toggle"
              >
                <div className="flex items-center gap-2">
                  <BluetoothConnected className="w-3.5 h-3.5" style={{ color: autoConnectEnabled ? '#10B981' : '#555' }} />
                  <span className="text-xs text-white">Auto-connect</span>
                </div>
                <div
                  className="w-9 h-5 rounded-full relative transition-colors cursor-pointer"
                  style={{ background: autoConnectEnabled ? '#10B981' : '#333' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                    style={{ left: autoConnectEnabled ? '18px' : '2px' }}
                  />
                </div>
              </button>

              {/* Scan / Disconnect */}
              {connected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                  data-testid="bt-speaker-disconnect"
                >
                  <Power className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA' }}
                  data-testid="bt-scan-btn"
                >
                  {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                  {scanning ? 'Scanning...' : 'Scan for devices'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BluetoothSpeakerIndicator;
