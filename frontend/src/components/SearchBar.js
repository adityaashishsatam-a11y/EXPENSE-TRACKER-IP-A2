/* Author: Harshali Tambadkar (25543582) */
/**
 * SearchBar Component
 *
 * Provides a live search input that calls onSearch after the user stops
 * typing for 300ms (debounce). This balances responsiveness with avoiding
 * an API call on every single keystroke.
 *
 * Design decisions:
 *  - Debounce is implemented with useRef + setTimeout rather than a
 *    third-party library (e.g. lodash.debounce) to keep dependencies minimal
 *  - useRef is used for the timer ID because changing it shouldn't trigger
 *    a re-render (unlike useState)
 *  - The clear button resets both the input and the parent's search state
 *    by calling onSearch('') explicitly
 *
 * Props:
 *   onSearch    — callback(query: string) called after debounce delay
 *   placeholder — optional custom placeholder text
 */

import React, { useState, useEffect, useRef } from 'react';
import '../styles/SearchBar.css';

const SearchBar = ({ onSearch, placeholder = 'Search expenses...' }) => {
  const [query, setQuery]   = useState('');
  const debounceRef         = useRef(null); // Holds the setTimeout ID for cleanup

  useEffect(() => {
    // Clear any pending debounce timer before setting a new one
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 300); // 300ms — fast enough to feel live, slow enough to reduce API calls

    // Cleanup on unmount or before next effect run
    return () => clearTimeout(debounceRef.current);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch(''); // Immediately notify parent without waiting for debounce
  };

  return (
    <div className="search-bar" role="search">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="search-input"
        aria-label="Search expenses"
      />
      {query && (
        <button
          type="button"
          className="search-clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;
