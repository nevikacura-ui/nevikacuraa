import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Globe, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LanguageSelector = ({ showDialog = false, onClose, compact = false }) => {
  const { language, setLanguage, t } = useLanguage();
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(showDialog);

  const handleLanguageChange = async (newLang) => {
    if (newLang === language) return;
    
    setSaving(true);
    try {
      // Save to backend if logged in
      if (token) {
        await axios.put(`${API}/features/language/preferences`, 
          { language: newLang },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setLanguage(newLang);
      toast.success(`Language changed to ${LANGUAGES[newLang].name}`);
      setDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to save language preference:', error);
      // Still change locally even if API fails
      setLanguage(newLang);
    } finally {
      setSaving(false);
    }
  };

  // Compact version for settings row
  if (compact) {
    return (
      <Card 
        className="p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setDialogOpen(true)}
        data-testid="language-selector-compact"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-slate-800">{t('language')}</h3>
            <p className="text-sm text-slate-500">{LANGUAGES[language].nativeName}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                Select Language
              </DialogTitle>
            </DialogHeader>
            <LanguageOptions 
              currentLanguage={language}
              onChange={handleLanguageChange}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Full dialog version
  return (
    <Dialog open={dialogOpen || showDialog} onOpenChange={(open) => { setDialogOpen(open); if (!open) onClose?.(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Select Language / भाषा चुनें
          </DialogTitle>
        </DialogHeader>
        <LanguageOptions 
          currentLanguage={language}
          onChange={handleLanguageChange}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
};

const LanguageOptions = ({ currentLanguage, onChange, saving }) => {
  return (
    <div className="space-y-3 mt-4">
      {Object.values(LANGUAGES).map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          disabled={saving}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
            currentLanguage === lang.code
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          data-testid={`lang-option-${lang.code}`}
        >
          <div>
            <p className={`font-semibold ${currentLanguage === lang.code ? 'text-indigo-700' : 'text-slate-800'}`}>
              {lang.nativeName}
            </p>
            <p className="text-sm text-slate-500">{lang.name}</p>
          </div>
          {currentLanguage === lang.code ? (
            saving ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
          )}
        </button>
      ))}
      
      <p className="text-xs text-center text-slate-400 pt-2">
        More languages coming soon!
      </p>
    </div>
  );
};

export default LanguageSelector;
