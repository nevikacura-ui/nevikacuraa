import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, SkipForward, RotateCcw, VolumeX, Bluetooth, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const HINDI_NUMBERS = {
  0: 'shoonya', 1: 'ek', 2: 'do', 3: 'teen', 4: 'chaar', 5: 'paanch',
  6: 'chheh', 7: 'saat', 8: 'aath', 9: 'nau', 10: 'das',
  11: 'gyaarah', 12: 'baarah', 13: 'terah', 14: 'chaudah', 15: 'pandrah',
  16: 'solah', 17: 'satrah', 18: 'athaarah', 19: 'unees', 20: 'bees',
  21: 'ikkees', 22: 'baees', 23: 'teis', 24: 'chaubees', 25: 'pachchees',
  26: 'chhabees', 27: 'sattaees', 28: 'atthaees', 29: 'untees', 30: 'tees',
  31: 'iktees', 32: 'battees', 33: 'taintees', 34: 'chautees', 35: 'paintees',
  36: 'chhattees', 37: 'saintees', 38: 'adtees', 39: 'untaalees', 40: 'chaalees',
  41: 'iktaalees', 42: 'bayaalees', 43: 'taintaalees', 44: 'chauvaalees', 45: 'paintaalees',
  46: 'chhiyaalees', 47: 'saintaalees', 48: 'adtaalees', 49: 'unchaas', 50: 'pachaas',
  51: 'ikkyaavan', 52: 'baavan', 53: 'tirpan', 54: 'chauvan', 55: 'pachpan',
  56: 'chhappan', 57: 'sattaavan', 58: 'athaavan', 59: 'unsath', 60: 'saath',
  61: 'iksath', 62: 'baasath', 63: 'tirsath', 64: 'chaunsath', 65: 'painsath',
  66: 'chhiyaasath', 67: 'sadsath', 68: 'adsath', 69: 'unhattar', 70: 'sattar',
  71: 'ikhattar', 72: 'bahattar', 73: 'tihattar', 74: 'chauhattar', 75: 'pachattar',
  76: 'chhihattar', 77: 'satattar', 78: 'athattar', 79: 'unaasee', 80: 'assee',
  81: 'ikyaasee', 82: 'bayaasee', 83: 'tiraasee', 84: 'chauraasee', 85: 'pachaasee',
  86: 'chhiyaasee', 87: 'sataasee', 88: 'athaasee', 89: 'navaasee', 90: 'nabbe',
  91: 'ikyaanbe', 92: 'baanbe', 93: 'tiraanbe', 94: 'chauraanbe', 95: 'panchaanbe',
  96: 'chhiyaanbe', 97: 'sattaanbe', 98: 'atthaanbe', 99: 'ninyaanbe', 100: 'sau',
};

function getHindiNumber(n) {
  if (n <= 100) return HINDI_NUMBERS[n] || String(n);
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const hPart = h === 1 ? 'ek sau' : `${HINDI_NUMBERS[h]} sau`;
    return r === 0 ? hPart : `${hPart} ${HINDI_NUMBERS[r] || r}`;
  }
  return String(n);
}

const TokenAnnouncer = ({ department = 'general' }) => {
  const [currentToken, setCurrentToken] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState('both'); // 'en', 'hi', 'both'
  const synthRef = useRef(window.speechSynthesis);

  const fetchCurrentToken = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/tokens/current?department=${department}`);
      const data = await res.json();
      setCurrentToken(data.token_number);
    } catch { /* ignore */ }
  }, [department]);

  useEffect(() => {
    fetchCurrentToken();
  }, [fetchCurrentToken]);

  const speak = useCallback((text, langCode = 'en-IN') => {
    return new Promise((resolve) => {
      const synth = synthRef.current;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = langCode;
      utter.rate = 0.85;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      // Try to find a good voice
      const voices = synth.getVoices();
      const preferred = voices.find(v => v.lang.startsWith(langCode.split('-')[0]) && v.localService);
      if (preferred) utter.voice = preferred;

      utter.onend = resolve;
      utter.onerror = resolve;
      synth.speak(utter);
    });
  }, []);

  const announceToken = useCallback(async (num) => {
    if (muted || num === 0) return;
    setIsSpeaking(true);
    const synth = synthRef.current;
    synth.cancel();

    try {
      if (lang === 'en' || lang === 'both') {
        await speak(`Token number ${num}, please proceed to the counter`, 'en-IN');
      }
      if (lang === 'both') {
        await new Promise(r => setTimeout(r, 600));
      }
      if (lang === 'hi' || lang === 'both') {
        const hindiNum = getHindiNumber(num);
        await speak(`Token number ${hindiNum}, kripya counter par aayen`, 'hi-IN');
      }
    } catch { /* ignore */ }
    setIsSpeaking(false);
  }, [muted, lang, speak]);

  const handleNext = async () => {
    try {
      const res = await fetch(`${API}/api/tokens/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      });
      const data = await res.json();
      setCurrentToken(data.token_number);
      announceToken(data.token_number);
    } catch {
      toast.error('Failed to advance token');
    }
  };

  const handleRepeat = () => {
    if (currentToken > 0) announceToken(currentToken);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = async () => {
    try {
      const res = await fetch(`${API}/api/tokens/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      });
      if (!res.ok) throw new Error('Reset failed');
      setCurrentToken(0);
      setShowResetConfirm(false);
      synthRef.current.cancel();
      toast.success('Tokens reset to 0');
    } catch {
      toast.error('Reset failed');
    }
  };

  const openDisplay = () => {
    window.open(`${window.location.origin}/token-display?dept=${department}`, '_blank');
  };

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="token-announcer">
      <style>{`
        @keyframes tokenPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .token-pulse { animation: tokenPulse .6s ease-out; }
        @keyframes speakingGlow { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.2); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.5); } }
        .speaking { animation: speakingGlow 1s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="text-white font-bold text-sm">Token Announcer</h3>
          <p className="text-white/30 text-[11px] mt-0.5">Bluetooth speaker ready</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openDisplay}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            title="Open TV Display"
            data-testid="open-display"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMuted(m => !m)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40 hover:text-white/70'}`}
            data-testid="mute-toggle"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Token Display */}
      <div className="px-5 py-8 flex flex-col items-center">
        <p className="text-white/30 text-[11px] font-bold tracking-[0.2em] uppercase mb-3">Current Token</p>
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center ${isSpeaking ? 'speaking' : ''} token-pulse`}
          key={currentToken}
          style={{
            background: currentToken > 0 ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : 'rgba(255,255,255,0.05)',
            border: `3px solid ${currentToken > 0 ? '#60A5FA' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <span className="text-white font-black" style={{ fontSize: currentToken > 99 ? '36px' : '48px' }}>
            {currentToken || '—'}
          </span>
        </div>

        {/* Bluetooth indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Bluetooth className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400 text-[10px] font-bold">Announcing...</span>
          </div>
        )}
      </div>

      {/* Language Toggle */}
      <div className="px-5 pb-4">
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'en', label: 'English' },
            { id: 'both', label: 'EN + HI' },
            { id: 'hi', label: 'Hindi' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setLang(opt.id)}
              className="flex-1 py-2 text-[11px] font-bold transition-all"
              style={{
                background: lang === opt.id ? '#3B82F6' : 'transparent',
                color: lang === opt.id ? '#FFF' : 'rgba(255,255,255,0.4)',
              }}
              data-testid={`lang-${opt.id}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-3">
        {/* Repeat */}
        <button
          onClick={handleRepeat}
          disabled={currentToken === 0 || isSpeaking}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all disabled:opacity-30 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          data-testid="repeat-token"
        >
          <Volume2 className="w-5 h-5 text-white/60" />
          <span className="text-[10px] font-semibold text-white/40">Repeat</span>
        </button>

        {/* NEXT — Main action */}
        <button
          onClick={handleNext}
          disabled={isSpeaking}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-lg"
          style={{
            background: '#3B82F6',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
          }}
          data-testid="next-token"
        >
          <SkipForward className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">Next</span>
        </button>

        {/* Reset */}
        <button
          onClick={() => showResetConfirm ? handleReset() : setShowResetConfirm(true)}
          disabled={isSpeaking}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all disabled:opacity-30 active:scale-95"
          style={{
            background: showResetConfirm ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
            border: showResetConfirm ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
          }}
          data-testid="reset-token"
        >
          <RotateCcw className={`w-5 h-5 ${showResetConfirm ? 'text-red-400' : 'text-white/60'}`} />
          <span className={`text-[10px] font-semibold ${showResetConfirm ? 'text-red-400' : 'text-white/40'}`}>
            {showResetConfirm ? 'Confirm?' : 'Reset'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TokenAnnouncer;
