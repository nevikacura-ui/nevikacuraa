import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const NumericCaptcha = ({ onVerified, onReset, theme = 'dark' }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState('+');
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = useCallback(() => {
    // Generate random numbers (1-20 for easy mental math)
    const n1 = Math.floor(Math.random() * 20) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    
    // Random operator: + or - (avoid negative results)
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    // Ensure no negative results for subtraction
    if (op === '-' && n2 > n1) {
      setNum1(n2);
      setNum2(n1);
    } else {
      setNum1(n1);
      setNum2(n2);
    }
    setOperator(op);
    setUserAnswer('');
    setIsVerified(false);
    setError('');
    if (onReset) onReset();
  }, [onReset]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const correctAnswer = operator === '+' ? num1 + num2 : num1 - num2;

  const handleVerify = () => {
    const userNum = parseInt(userAnswer, 10);
    if (isNaN(userNum)) {
      setError('Please enter a number');
      return;
    }
    if (userNum === correctAnswer) {
      setIsVerified(true);
      setError('');
      if (onVerified) onVerified(true);
    } else {
      setError('Incorrect answer. Try again.');
      setUserAnswer('');
      // Generate new captcha after wrong answer
      setTimeout(generateCaptcha, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && userAnswer) {
      handleVerify();
    }
  };

  const isDark = theme === 'dark';
  
  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-[#0c1e3c]/80 border border-[#1a365d]' : 'bg-slate-100 border border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm font-medium ${isDark ? 'text-emerald-200/80' : 'text-slate-600'}`}>
          Verify you're human
        </p>
        <button 
          onClick={generateCaptcha}
          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#1a365d] text-emerald-200/60' : 'hover:bg-slate-200 text-slate-500'}`}
          title="Generate new captcha"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {!isVerified ? (
        <div className="space-y-3">
          {/* Math Question */}
          <div className={`flex items-center justify-center gap-3 py-4 rounded-xl ${isDark ? 'bg-[#1a365d]/60' : 'bg-white'}`}>
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{num1}</span>
            <span className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>{operator}</span>
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{num2}</span>
            <span className={`text-2xl font-bold ${isDark ? 'text-emerald-200/60' : 'text-slate-400'}`}>=</span>
            <span className={`text-3xl font-bold ${isDark ? 'text-emerald-200/80' : 'text-slate-500'}`}>?</span>
          </div>
          
          {/* Answer Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))}
              onKeyPress={handleKeyPress}
              placeholder="Enter answer"
              className={`flex-1 text-center text-xl font-bold h-12 rounded-xl ${
                isDark 
                  ? 'bg-[#1a365d] border-[#0c1e3c] text-white placeholder:text-emerald-200/40' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
              data-testid="captcha-input"
            />
            <Button
              onClick={handleVerify}
              disabled={!userAnswer}
              className={`px-6 h-12 rounded-xl font-semibold ${
                isDark
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
              data-testid="captcha-verify-btn"
            >
              Verify
            </Button>
          </div>
          
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      ) : (
        <div className={`flex items-center justify-center gap-2 py-4 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            Verified successfully!
          </span>
        </div>
      )}
    </div>
  );
};

export default NumericCaptcha;
