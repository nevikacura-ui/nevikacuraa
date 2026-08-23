import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;
const DIAGYN_LOGO = "https://customer-assets.emergentagent.com/job_67a5fa93-5f8e-4d31-93b0-9a47a3a5d4d1/artifacts/n2q0c3pa_e00c30df-2de3-4e35-b02a-2e3e9bb68d7c-removebg-preview.png";

const HINDI_NUMBERS = {
  0:'shoonya',1:'ek',2:'do',3:'teen',4:'chaar',5:'paanch',6:'chheh',7:'saat',8:'aath',9:'nau',10:'das',
  11:'gyaarah',12:'baarah',13:'terah',14:'chaudah',15:'pandrah',16:'solah',17:'satrah',18:'athaarah',19:'unees',20:'bees',
  21:'ikkees',22:'baees',23:'teis',24:'chaubees',25:'pachchees',26:'chhabees',27:'sattaees',28:'atthaees',29:'untees',30:'tees',
  31:'iktees',32:'battees',33:'taintees',34:'chautees',35:'paintees',36:'chhattees',37:'saintees',38:'adtees',39:'untaalees',40:'chaalees',
  41:'iktaalees',42:'bayaalees',43:'taintaalees',44:'chauvaalees',45:'paintaalees',46:'chhiyaalees',47:'saintaalees',48:'adtaalees',49:'unchaas',50:'pachaas',
  51:'ikkyaavan',52:'baavan',53:'tirpan',54:'chauvan',55:'pachpan',56:'chhappan',57:'sattaavan',58:'athaavan',59:'unsath',60:'saath',
  61:'iksath',62:'baasath',63:'tirsath',64:'chaunsath',65:'painsath',66:'chhiyaasath',67:'sadsath',68:'adsath',69:'unhattar',70:'sattar',
  71:'ikhattar',72:'bahattar',73:'tihattar',74:'chauhattar',75:'pachattar',76:'chhihattar',77:'satattar',78:'athattar',79:'unaasee',80:'assee',
  81:'ikyaasee',82:'bayaasee',83:'tiraasee',84:'chauraasee',85:'pachaasee',86:'chhiyaasee',87:'sataasee',88:'athaasee',89:'navaasee',90:'nabbe',
  91:'ikyaanbe',92:'baanbe',93:'tiraanbe',94:'chauraanbe',95:'panchaanbe',96:'chhiyaanbe',97:'sattaanbe',98:'atthaanbe',99:'ninyaanbe',100:'sau',
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

const TokenDisplay = () => {
  const [searchParams] = useSearchParams();
  const department = searchParams.get('dept') || 'general';
  const [token, setToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('');
  const [flash, setFlash] = useState(false);
  const prevTokenRef = useRef(0);
  const synthRef = useRef(window.speechSynthesis);

  const announce = useCallback((num) => {
    if (num === 0) return;
    const synth = synthRef.current;
    synth.cancel();

    // English
    const enUtter = new SpeechSynthesisUtterance(`Token number ${num}, please proceed to the counter`);
    enUtter.lang = 'en-IN';
    enUtter.rate = 0.85;
    enUtter.volume = 1.0;
    synth.speak(enUtter);

    // Hindi after English
    enUtter.onend = () => {
      setTimeout(() => {
        const hiUtter = new SpeechSynthesisUtterance(`Token number ${getHindiNumber(num)}, kripya counter par aayen`);
        hiUtter.lang = 'hi-IN';
        hiUtter.rate = 0.85;
        hiUtter.volume = 1.0;
        synth.speak(hiUtter);
      }, 500);
    };
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`${API}/api/tokens/current?department=${department}`);
        const data = await res.json();
        if (data.token_number !== prevTokenRef.current && data.token_number > 0) {
          setFlash(true);
          setTimeout(() => setFlash(false), 1500);
          announce(data.token_number);
        }
        prevTokenRef.current = data.token_number;
        setToken(data.token_number);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      } catch { /* ignore */ }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 2000);
    return () => clearInterval(interval);
  }, [department, announce]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden" data-testid="token-display-page">
      <style>{`
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 40px rgba(244,63,94,0.2); } 50% { box-shadow:0 0 80px rgba(244,63,94,0.5); } }
        @keyframes flash { 0% { opacity:0.4; transform:scale(1.15); } 100% { opacity:1; transform:scale(1); } }
        @keyframes marquee { 0% { transform:translateX(100%); } 100% { transform:translateX(-100%); } }
        .token-glow { animation: glow 2.5s ease-in-out infinite; }
        .token-float { animation: float 3s ease-in-out infinite; }
        .token-flash { animation: flash .6s ease-out; }
        .marquee { animation: marquee 20s linear infinite; }
      `}</style>

      {/* Background rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-rose-500/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-rose-500/8" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-rose-500/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full bg-rose-500/5" />

      {/* Top bar — Logo + Date */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <img src={DIAGYN_LOGO} alt="DiaGyn" className="h-12 w-auto object-contain" />
          <div>
            <h2 className="text-white font-bold text-lg">DiaGyn Clinic</h2>
            <p className="text-white/30 text-xs">{dateStr}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/20 text-xs font-mono">{lastUpdated}</p>
        </div>
      </div>

      {/* Main token area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <p className="text-white/30 text-xl font-bold tracking-[0.3em] uppercase mb-8">Now Serving</p>

        <div className={`token-float ${flash ? 'token-flash' : ''}`}>
          <div className="token-glow rounded-full w-52 h-52 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #881337, #F43F5E)', border: '4px solid rgba(244,63,94,0.3)' }}>
            <span className="text-white font-black" style={{ fontSize: token > 99 ? '72px' : '96px', lineHeight: 1 }}>
              {token || '—'}
            </span>
          </div>
        </div>

        <p className="text-rose-400/40 text-sm mt-8 font-medium uppercase tracking-widest">
          {department !== 'general' ? department : ''}
        </p>
      </div>

      {/* Bottom marquee — Queue message */}
      <div className="relative z-10 py-4 overflow-hidden" style={{ background: 'rgba(244,63,94,0.06)', borderTop: '1px solid rgba(244,63,94,0.1)' }}>
        <div className="marquee whitespace-nowrap">
          <span className="text-white/50 text-sm font-medium mx-8">
            Please maintain the queue and be patient. Your token will be called shortly.
          </span>
          <span className="text-rose-400/30 mx-4">&bull;</span>
          <span className="text-white/50 text-sm font-medium mx-8">
            Kripya queue banaye rakhein aur dhairya rakhein. Aapka token jald bulaya jayega.
          </span>
          <span className="text-rose-400/30 mx-4">&bull;</span>
          <span className="text-white/50 text-sm font-medium mx-8">
            Please maintain the queue and be patient. Your token will be called shortly.
          </span>
          <span className="text-rose-400/30 mx-4">&bull;</span>
          <span className="text-white/50 text-sm font-medium mx-8">
            Kripya queue banaye rakhein aur dhairya rakhein. Aapka token jald bulaya jayega.
          </span>
        </div>
      </div>
    </div>
  );
};

export default TokenDisplay;
