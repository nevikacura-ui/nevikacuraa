import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeLanguageContext = createContext(null);

// Available languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' }
};

// Translation keys (basic structure - can be expanded)
export const translations = {
  en: {
    home: 'Home',
    bookAppointment: 'Book Appointment',
    pharmacy: 'Pharmacy',
    diagnostics: 'Diagnostics',
    myRecords: 'My Records',
    login: 'Login',
    logout: 'Logout',
    trackOrders: 'Track Orders',
    giveBack: 'Give Back',
    settings: 'Settings',
    darkMode: 'Dark Mode',
    language: 'Language',
    welcome: 'Welcome',
    searchPlaceholder: 'Search medicines, doctors, services...',
    bookNow: 'Book Now',
    viewAll: 'View All',
    ourServices: 'Our Services',
    whyChooseUs: 'Why Choose Us',
    testimonials: 'What Our Patients Say',
    doctors: 'Our Doctors',
    locations: 'Our Locations',
    contactUs: 'Contact Us',
    subscribe: 'Subscribe',
    getPremium: 'Get Premium',
    freeTrial: 'Free Trial',
    days: 'days',
    months: 'months',
    year: 'year'
  },
  hi: {
    home: 'होम',
    bookAppointment: 'अपॉइंटमेंट बुक करें',
    pharmacy: 'फार्मेसी',
    diagnostics: 'डायग्नोस्टिक्स',
    myRecords: 'मेरे रिकॉर्ड',
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    trackOrders: 'ऑर्डर ट्रैक करें',
    giveBack: 'दान करें',
    settings: 'सेटिंग्स',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    welcome: 'स्वागत है',
    searchPlaceholder: 'दवाइयाँ, डॉक्टर, सेवाएं खोजें...',
    bookNow: 'अभी बुक करें',
    viewAll: 'सभी देखें',
    ourServices: 'हमारी सेवाएं',
    whyChooseUs: 'हमें क्यों चुनें',
    testimonials: 'मरीजों की राय',
    doctors: 'हमारे डॉक्टर',
    locations: 'हमारे स्थान',
    contactUs: 'संपर्क करें',
    subscribe: 'सब्सक्राइब करें',
    getPremium: 'प्रीमियम लें',
    freeTrial: 'मुफ्त ट्रायल',
    days: 'दिन',
    months: 'महीने',
    year: 'साल'
  },
  mr: {
    home: 'होम',
    bookAppointment: 'अपॉइंटमेंट बुक करा',
    pharmacy: 'फार्मसी',
    diagnostics: 'डायग्नोस्टिक्स',
    myRecords: 'माझे रेकॉर्ड',
    login: 'लॉगिन',
    logout: 'लॉगआउट',
    trackOrders: 'ऑर्डर ट्रॅक करा',
    giveBack: 'दान करा',
    settings: 'सेटिंग्ज',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    welcome: 'स्वागत आहे',
    searchPlaceholder: 'औषधे, डॉक्टर, सेवा शोधा...',
    bookNow: 'आता बुक करा',
    viewAll: 'सर्व पहा',
    ourServices: 'आमच्या सेवा',
    whyChooseUs: 'आम्हाला का निवडावे',
    testimonials: 'रुग्णांचे मत',
    doctors: 'आमचे डॉक्टर',
    locations: 'आमची ठिकाणे',
    contactUs: 'संपर्क साधा',
    subscribe: 'सबस्क्राइब करा',
    getPremium: 'प्रीमियम घ्या',
    freeTrial: 'विनामूल्य ट्रायल',
    days: 'दिवस',
    months: 'महिने',
    year: 'वर्ष'
  },
  gu: {
    home: 'હોમ',
    bookAppointment: 'એપોઇન્ટમેન્ટ બુક કરો',
    pharmacy: 'ફાર્મસી',
    diagnostics: 'ડાયગ્નોસ્ટિક્સ',
    myRecords: 'મારા રેકોર્ડ્સ',
    login: 'લૉગિન',
    logout: 'લૉગઆઉટ',
    trackOrders: 'ઓર્ડર ટ્રેક કરો',
    giveBack: 'દાન કરો',
    settings: 'સેટિંગ્સ',
    darkMode: 'ડાર્ક મોડ',
    language: 'ભાષા',
    welcome: 'સ્વાગત છે',
    searchPlaceholder: 'દવાઓ, ડૉક્ટર, સેવાઓ શોધો...',
    bookNow: 'હમણાં બુક કરો',
    viewAll: 'બધું જુઓ',
    ourServices: 'અમારી સેવાઓ',
    whyChooseUs: 'અમને કેમ પસંદ કરો',
    testimonials: 'દર્દીઓનો અભિપ્રાય',
    doctors: 'અમારા ડૉક્ટરો',
    locations: 'અમારા સ્થાનો',
    contactUs: 'સંપર્ક કરો',
    subscribe: 'સબ્સ્ક્રાઇબ કરો',
    getPremium: 'પ્રીમિયમ મેળવો',
    freeTrial: 'મફત ટ્રાયલ',
    days: 'દિવસ',
    months: 'મહિના',
    year: 'વર્ષ'
  }
};

export const ThemeLanguageProvider = ({ children }) => {
  // Light mode disabled app-wide — dark mode only until light-mode styling is revisited.
  const isDarkMode = true;
  const autoTheme = false;

  // Language state
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  // Force dark mode on document, always
  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('darkMode', 'true');
    localStorage.setItem('autoTheme', 'false');
  }, []);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleDarkMode = () => {};
  const toggleAutoTheme = () => {};
  
  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <ThemeLanguageContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      autoTheme,
      toggleAutoTheme,
      language,
      setLanguage,
      t,
      languages: LANGUAGES
    }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLanguage must be used within ThemeLanguageProvider');
  }
  return context;
};

export default ThemeLanguageContext;
