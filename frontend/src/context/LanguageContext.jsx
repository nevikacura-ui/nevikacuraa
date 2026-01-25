import React, { createContext, useContext, useState, useEffect } from 'react';

// Available languages
const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
};

// Translations
const TRANSLATIONS = {
  en: {
    welcome: "Welcome to Nevika Cura",
    bookAppointment: "Book Appointment",
    orderMedicines: "Order Medicines",
    labTests: "Lab Tests",
    myHealth: "My Health",
    profile: "Profile",
    logout: "Logout",
    home: "Home",
    appointments: "Appointments",
    pharmacy: "Pharmacy",
    diagnostics: "Diagnostics",
    settings: "Settings",
    language: "Language",
    notifications: "Notifications",
    familyMembers: "Family Members",
    healthDashboard: "Health Dashboard",
    achievements: "Achievements",
    viewAll: "View All",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading...",
    noData: "No data available",
    success: "Success",
    error: "Error",
    // Health Dashboard
    healthScore: "Health Score",
    logMetric: "Log Metric",
    weight: "Weight",
    bloodPressure: "Blood Pressure",
    heartRate: "Heart Rate",
    steps: "Steps",
    streak: "Streak",
    days: "days",
    // Family
    addFamilyMember: "Add Family Member",
    relation: "Relation",
    self: "Self",
    spouse: "Spouse",
    child: "Child",
    parent: "Parent",
    sibling: "Sibling",
    other: "Other",
    // Notifications
    notificationSettings: "Notification Settings",
    appointmentReminders: "Appointment Reminders",
    medicineRefill: "Medicine Refill Alerts",
    labResults: "Lab Results",
    promotional: "Promotional Messages"
  },
  hi: {
    welcome: "नेविका कुरा में आपका स्वागत है",
    bookAppointment: "अपॉइंटमेंट बुक करें",
    orderMedicines: "दवाइयाँ ऑर्डर करें",
    labTests: "लैब टेस्ट",
    myHealth: "मेरा स्वास्थ्य",
    profile: "प्रोफ़ाइल",
    logout: "लॉग आउट",
    home: "होम",
    appointments: "अपॉइंटमेंट्स",
    pharmacy: "फार्मेसी",
    diagnostics: "डायग्नोस्टिक्स",
    settings: "सेटिंग्स",
    language: "भाषा",
    notifications: "सूचनाएं",
    familyMembers: "परिवार के सदस्य",
    healthDashboard: "स्वास्थ्य डैशबोर्ड",
    achievements: "उपलब्धियां",
    viewAll: "सभी देखें",
    save: "सेव करें",
    cancel: "रद्द करें",
    add: "जोड़ें",
    edit: "संपादित करें",
    delete: "हटाएं",
    confirm: "पुष्टि करें",
    loading: "लोड हो रहा है...",
    noData: "कोई डेटा उपलब्ध नहीं",
    success: "सफल",
    error: "त्रुटि",
    healthScore: "स्वास्थ्य स्कोर",
    logMetric: "मेट्रिक लॉग करें",
    weight: "वजन",
    bloodPressure: "रक्तचाप",
    heartRate: "हृदय गति",
    steps: "कदम",
    streak: "स्ट्रीक",
    days: "दिन",
    addFamilyMember: "परिवार का सदस्य जोड़ें",
    relation: "संबंध",
    self: "स्वयं",
    spouse: "पति/पत्नी",
    child: "बच्चा",
    parent: "माता-पिता",
    sibling: "भाई-बहन",
    other: "अन्य",
    notificationSettings: "सूचना सेटिंग्स",
    appointmentReminders: "अपॉइंटमेंट रिमाइंडर",
    medicineRefill: "दवा रिफिल अलर्ट",
    labResults: "लैब रिजल्ट्स",
    promotional: "प्रमोशनल मैसेज"
  },
  mr: {
    welcome: "नेविका कुरा मध्ये आपले स्वागत आहे",
    bookAppointment: "अपॉइंटमेंट बुक करा",
    orderMedicines: "औषधे ऑर्डर करा",
    labTests: "लॅब चाचण्या",
    myHealth: "माझे आरोग्य",
    profile: "प्रोफाइल",
    logout: "लॉग आउट",
    home: "होम",
    appointments: "अपॉइंटमेंट्स",
    pharmacy: "फार्मसी",
    diagnostics: "डायग्नोस्टिक्स",
    settings: "सेटिंग्ज",
    language: "भाषा",
    notifications: "सूचना",
    familyMembers: "कुटुंबातील सदस्य",
    healthDashboard: "आरोग्य डॅशबोर्ड",
    achievements: "उपलब्धी",
    viewAll: "सर्व पहा",
    save: "जतन करा",
    cancel: "रद्द करा",
    add: "जोडा",
    edit: "संपादित करा",
    delete: "हटवा",
    confirm: "पुष्टी करा",
    loading: "लोड होत आहे...",
    noData: "डेटा उपलब्ध नाही",
    success: "यशस्वी",
    error: "त्रुटी",
    healthScore: "आरोग्य स्कोअर",
    logMetric: "मेट्रिक लॉग करा",
    weight: "वजन",
    bloodPressure: "रक्तदाब",
    heartRate: "हृदय गती",
    steps: "पावले",
    streak: "स्ट्रीक",
    days: "दिवस",
    addFamilyMember: "कुटुंबातील सदस्य जोडा",
    relation: "नाते",
    self: "स्वतः",
    spouse: "जोडीदार",
    child: "मूल",
    parent: "पालक",
    sibling: "भाऊ-बहीण",
    other: "इतर",
    notificationSettings: "सूचना सेटिंग्ज",
    appointmentReminders: "अपॉइंटमेंट रिमाइंडर",
    medicineRefill: "औषध रिफिल अलर्ट",
    labResults: "लॅब रिझल्ट्स",
    promotional: "प्रमोशनल मेसेज"
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('nevika_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('nevika_language', language);
  }, [language]);

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const changeLanguage = (newLang) => {
    if (LANGUAGES[newLang]) {
      setLanguage(newLang);
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: changeLanguage, 
      t, 
      languages: LANGUAGES,
      isRTL: false // Hindi and Marathi are LTR
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { LANGUAGES, TRANSLATIONS };
