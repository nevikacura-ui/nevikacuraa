import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ArrowUpDown } from 'lucide-react';

/**
 * SearchFilterSheet — Reusable advanced search + filter bottom sheet
 * Used across DiaGyn, Mango, and Pharmacy pages
 * 
 * Props:
 * - searchValue, onSearchChange: controlled search input
 * - placeholder: search input placeholder
 * - filters: array of filter groups [{label, key, options: [{value, label}], multi?}]
 * - activeFilters: {key: value} or {key: [values]}
 * - onFilterChange: (key, value) => void
 * - sortOptions: [{value, label}]
 * - activeSort: string
 * - onSortChange: (value) => void
 * - quickChips: [{label, key, value}] for one-tap filters
 * - resultCount: number
 * - accentColor: string (hex)
 */

const SearchFilterSheet = ({
  searchValue = '',
  onSearchChange,
  placeholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  sortOptions = [],
  activeSort = '',
  onSortChange,
  quickChips = [],
  resultCount,
  accentColor = '#14b8a6',
  onClearAll,
  lightMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = Object.values(activeFilters).some(v =>
    Array.isArray(v) ? v.length > 0 : !!v
  ) || !!activeSort;

  const activeFilterCount = Object.values(activeFilters).reduce((count, v) => {
    if (Array.isArray(v)) return count + v.length;
    return v ? count + 1 : count;
  }, 0) + (activeSort ? 1 : 0);

  // Theme colors
  const t = lightMode ? {
    searchIcon: '#a8a29e', searchText: '#1c1917', searchPlaceholder: '#a8a29e', searchBg: '#FFFFFF', searchBorder: 'rgba(0,0,0,0.06)',
    clearIcon: '#a8a29e', filterBg: '#FFFFFF', filterBorder: 'rgba(0,0,0,0.06)', filterIcon: '#78716c',
    chipBg: '#FFFFFF', chipBorder: 'rgba(0,0,0,0.06)', chipText: '#78716c', resultText: '#a8a29e',
  } : {
    searchIcon: 'rgba(255,255,255,0.3)', searchText: '#fff', searchPlaceholder: 'rgba(255,255,255,0.25)', searchBg: 'rgba(255,255,255,0.06)', searchBorder: 'rgba(255,255,255,0.08)',
    clearIcon: 'rgba(255,255,255,0.3)', filterBg: 'rgba(255,255,255,0.06)', filterBorder: 'rgba(255,255,255,0.08)', filterIcon: 'rgba(255,255,255,0.4)',
    chipBg: 'rgba(255,255,255,0.04)', chipBorder: 'rgba(255,255,255,0.06)', chipText: 'rgba(255,255,255,0.45)', resultText: 'rgba(255,255,255,0.3)',
  };

  return (
    <>
      {/* Search Bar + Filter Toggle */}
      <div className="flex items-center gap-2" data-testid="search-filter-bar">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.searchIcon }} />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-8 rounded-xl text-sm outline-none"
            style={{ background: t.searchBg, border: `1px solid ${t.searchBorder}`, color: t.searchText, boxShadow: lightMode ? '0 1px 4px rgba(0,0,0,0.04)' : 'none' }}
            data-testid="search-filter-input"
          />
          {searchValue && (
            <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" data-testid="search-clear-btn">
              <X className="w-3.5 h-3.5" style={{ color: t.clearIcon }} />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="relative h-10 w-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
          style={{
            background: hasActiveFilters ? `${accentColor}15` : t.filterBg,
            border: `1px solid ${hasActiveFilters ? `${accentColor}40` : t.filterBorder}`,
            boxShadow: lightMode ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
          }}
          data-testid="filter-toggle-btn"
        >
          <SlidersHorizontal className="w-4 h-4" style={{ color: hasActiveFilters ? accentColor : t.filterIcon }} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: accentColor }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Filter Chips */}
      {quickChips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1" data-testid="quick-filter-chips">
          {quickChips.map(chip => {
            const isActive = activeFilters[chip.key] === chip.value ||
              (Array.isArray(activeFilters[chip.key]) && activeFilters[chip.key].includes(chip.value));
            return (
              <button
                key={`${chip.key}-${chip.value}`}
                onClick={() => onFilterChange(chip.key, chip.value)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all active:scale-95"
                style={{
                  background: isActive ? `${accentColor}20` : t.chipBg,
                  border: `1px solid ${isActive ? `${accentColor}40` : t.chipBorder}`,
                  color: isActive ? accentColor : t.chipText,
                  boxShadow: lightMode && !isActive ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                }}
                data-testid={`chip-${chip.value}`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results count badge */}
      {resultCount !== undefined && (searchValue || hasActiveFilters) && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium" style={{ color: t.resultText }}>{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
          {hasActiveFilters && (
            <button onClick={onClearAll} className="text-[11px] font-medium active:scale-95" style={{ color: accentColor }} data-testid="clear-all-filters">
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end" data-testid="filter-sheet">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg mx-auto max-h-[75vh] rounded-t-[24px] overflow-hidden" style={{ background: '#0c0c16', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mt-3" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h3 className="text-white font-bold text-base">Filters & Sort</h3>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button onClick={() => { onClearAll?.(); }} className="text-xs font-medium" style={{ color: accentColor }} data-testid="sheet-clear-all">
                    Reset
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }} data-testid="filter-sheet-close">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 pb-8 space-y-5" style={{ maxHeight: 'calc(75vh - 80px)' }}>
              {/* Sort Section */}
              {sortOptions.length > 0 && (
                <div data-testid="sort-section">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3 h-3" /> Sort by
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => onSortChange(activeSort === opt.value ? '' : opt.value)}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95"
                        style={{
                          background: activeSort === opt.value ? `${accentColor}15` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${activeSort === opt.value ? `${accentColor}35` : 'rgba(255,255,255,0.06)'}`,
                          color: activeSort === opt.value ? accentColor : 'rgba(255,255,255,0.5)',
                        }}
                        data-testid={`sort-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Groups */}
              {filters.map(group => (
                <FilterGroup
                  key={group.key}
                  group={group}
                  activeValue={activeFilters[group.key]}
                  onChange={val => onFilterChange(group.key, val)}
                  accentColor={accentColor}
                />
              ))}
            </div>

            {/* Apply button */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-all"
                style={{ background: accentColor }}
                data-testid="apply-filters-btn"
              >
                Show {resultCount !== undefined ? `${resultCount} results` : 'results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const FilterGroup = ({ group, activeValue, onChange, accentColor }) => {
  const [expanded, setExpanded] = useState(group.options.length <= 6);
  const displayed = expanded ? group.options : group.options.slice(0, 6);

  return (
    <div data-testid={`filter-group-${group.key}`}>
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2">{group.label}</p>
      <div className="flex flex-wrap gap-1.5">
        {displayed.map(opt => {
          const isActive = group.multi
            ? Array.isArray(activeValue) && activeValue.includes(opt.value)
            : activeValue === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                if (group.multi) {
                  const arr = Array.isArray(activeValue) ? [...activeValue] : [];
                  const idx = arr.indexOf(opt.value);
                  idx >= 0 ? arr.splice(idx, 1) : arr.push(opt.value);
                  onChange(arr);
                } else {
                  onChange(isActive ? '' : opt.value);
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={{
                background: isActive ? `${accentColor}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? `${accentColor}35` : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? accentColor : 'rgba(255,255,255,0.5)',
              }}
              data-testid={`filter-${group.key}-${opt.value}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {!expanded && group.options.length > 6 && (
        <button onClick={() => setExpanded(true)} className="text-[11px] mt-2 flex items-center gap-1" style={{ color: accentColor }}>
          +{group.options.length - 6} more <ChevronDown className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default SearchFilterSheet;
