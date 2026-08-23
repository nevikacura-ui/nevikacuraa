import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import SearchSuggestions, { addRecentSearch } from '@/components/SearchSuggestions';

export const HeroBanner = ({ searchQuery, setSearchQuery, onSearch, totalCount, store = 'pharmacy' }) => {
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSuggestionSelect = (term) => {
    addRecentSearch(term);
    setSearchQuery(term);
    setSearchFocused(false);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 pt-4 pb-6">
        <p className="text-orange-100/70 text-sm font-medium text-center mb-4">
          {totalCount > 0 ? `${totalCount.toLocaleString()}+ medicines delivered to your doorstep` : 'Your trusted pharmacy, delivered to your doorstep'}
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-2xl blur opacity-20 animate-pulse" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
            <Input 
              type="text"
              placeholder="Search medicines, health products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addRecentSearch(searchQuery);
                  onSearch();
                  setSearchFocused(false);
                }
              }}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#1a1a1a]/90 backdrop-blur-sm text-white placeholder:text-zinc-500 border border-orange-500/30 shadow-2xl shadow-orange-500/10 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500"
              data-testid="pharmacy-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <SearchSuggestions
            visible={searchFocused && !searchQuery}
            onSelect={handleSuggestionSelect}
            onClose={() => setSearchFocused(false)}
            store={store}
          />
        </div>
      </div>

      {searchFocused && !searchQuery && (
        <div className="fixed inset-0 z-40" onClick={() => setSearchFocused(false)} />
      )}
    </div>
  );
};
