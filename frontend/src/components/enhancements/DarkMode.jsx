import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../ui/button';

// Dark Mode Context and Toggle Component (#38)
export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    localStorage.setItem('darkMode', String(newValue));
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { isDark, toggleDarkMode };
};

export const DarkModeToggle = ({ compact = false }) => {
  const { isDark, toggleDarkMode } = useDarkMode();

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDarkMode}
        className="p-2"
        data-testid="dark-mode-toggle"
      >
        {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <Sun className={`w-5 h-5 ${!isDark ? 'text-yellow-500' : 'text-gray-400'}`} />
      <button
        onClick={toggleDarkMode}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          isDark ? 'bg-teal-600' : 'bg-gray-300'
        }`}
        data-testid="dark-mode-toggle"
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isDark ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
      <Moon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-gray-400'}`} />
    </div>
  );
};

export default DarkModeToggle;
