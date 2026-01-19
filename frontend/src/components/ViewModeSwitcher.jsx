import React from 'react';
import { Monitor, Tablet, Smartphone, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useViewMode, VIEW_MODES } from '@/context/ViewModeContext';

export const ViewModeSwitcher = ({ compact = false }) => {
  const { viewMode, setViewMode, effectiveViewMode, screenSize } = useViewMode();
  
  const viewOptions = [
    { 
      mode: VIEW_MODES.AUTO, 
      icon: Settings2, 
      label: 'Auto', 
      description: `Follows screen (${screenSize})`
    },
    { 
      mode: VIEW_MODES.DESKTOP, 
      icon: Monitor, 
      label: 'Desktop', 
      description: 'Full desktop layout'
    },
    { 
      mode: VIEW_MODES.TABLET, 
      icon: Tablet, 
      label: 'Tablet', 
      description: '2-column optimized'
    },
    { 
      mode: VIEW_MODES.MOBILE, 
      icon: Smartphone, 
      label: 'Mobile', 
      description: 'Single column'
    },
  ];
  
  const currentOption = viewOptions.find(o => o.mode === viewMode) || viewOptions[0];
  const CurrentIcon = currentOption.icon;
  
  // Compact version for header - just icons
  if (compact) {
    return (
      <div className="flex items-center bg-slate-100 rounded-full p-0.5">
        {viewOptions.slice(1).map((option) => { // Skip 'Auto' in compact mode
          const Icon = option.icon;
          const isActive = effectiveViewMode === option.mode || 
            (viewMode === VIEW_MODES.AUTO && effectiveViewMode === option.mode.toLowerCase());
          
          return (
            <button
              key={option.mode}
              onClick={() => setViewMode(option.mode)}
              className={`
                p-1.5 rounded-full transition-all
                ${viewMode === option.mode 
                  ? 'bg-white shadow-sm text-[#5FA8D3]' 
                  : 'text-slate-400 hover:text-slate-600'
                }
              `}
              title={option.label}
              data-testid={`view-mode-${option.mode}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }
  
  // Full dropdown version
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 rounded-full border-slate-200"
          data-testid="view-mode-trigger"
        >
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentOption.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-slate-500">
          View Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = viewMode === option.mode;
          
          return (
            <DropdownMenuItem
              key={option.mode}
              onClick={() => setViewMode(option.mode)}
              className={`flex items-center gap-3 cursor-pointer ${isSelected ? 'bg-slate-100' : ''}`}
              data-testid={`view-option-${option.mode}`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#5FA8D3]' : 'text-slate-400'}`} />
              <div className="flex-1">
                <p className={`text-sm ${isSelected ? 'font-medium text-[#5FA8D3]' : ''}`}>
                  {option.label}
                </p>
                <p className="text-xs text-slate-400">{option.description}</p>
              </div>
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-[#5FA8D3]" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Settings page version - fuller UI
export const ViewModeSettings = () => {
  const { viewMode, setViewMode, screenSize } = useViewMode();
  
  const viewOptions = [
    { 
      mode: VIEW_MODES.AUTO, 
      icon: Settings2, 
      label: 'Automatic', 
      description: `Adapts to your screen size. Currently detected as: ${screenSize}`
    },
    { 
      mode: VIEW_MODES.DESKTOP, 
      icon: Monitor, 
      label: 'Desktop View', 
      description: 'Full width layout with all features visible. Best for large screens.'
    },
    { 
      mode: VIEW_MODES.TABLET, 
      icon: Tablet, 
      label: 'Tablet View', 
      description: 'Optimized 2-column layout with larger touch targets. Great for tablets.'
    },
    { 
      mode: VIEW_MODES.MOBILE, 
      icon: Smartphone, 
      label: 'Mobile View', 
      description: 'Single column layout optimized for phones. Compact and touch-friendly.'
    },
  ];
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg text-slate-800">Display Mode</h3>
      <p className="text-sm text-slate-500 mb-4">
        Choose how you want to view the app. This setting applies to Home, DiaGyn, and Staff Portal pages.
      </p>
      <div className="grid gap-3">
        {viewOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = viewMode === option.mode;
          
          return (
            <button
              key={option.mode}
              onClick={() => setViewMode(option.mode)}
              className={`
                flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
                ${isSelected 
                  ? 'border-[#5FA8D3] bg-[#5FA8D3]/5' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
              data-testid={`settings-view-${option.mode}`}
            >
              <div className={`
                p-3 rounded-xl 
                ${isSelected ? 'bg-[#5FA8D3] text-white' : 'bg-slate-100 text-slate-500'}
              `}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isSelected ? 'text-[#5FA8D3]' : 'text-slate-800'}`}>
                  {option.label}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{option.description}</p>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-[#5FA8D3] flex items-center justify-center mt-1">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewModeSwitcher;
