import React, { useState, useRef, useEffect } from 'react';
import { searchSymbolsLocal, getSymbolSearchError } from '../lib/symbolCache';

export function SymbolSearch({ value, onChange, onSelect, className = '', autoFocus = false }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (val.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        setError(null);
        const data = await searchSymbolsLocal(val.trim());
        setResults(data);
        const err = getSymbolSearchError();
        if (err) {
          setError(err);
        }
      } catch (err) {
        setResults([]);
        setError(getSymbolSearchError() || 'خطا در جستجوی نماد');
      } finally {
        setLoading(false);
      }
    }, 200);
  }

  function handleSelect(symbol) {
    setQuery(symbol.name);
    onChange(symbol.name);
    setShowDropdown(false);
    setResults([]);
    onSelect(symbol);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (query.trim().length > 0) setShowDropdown(true); }}
          className={`input-field text-xs py-1.5 pr-8 ${className}`}
          placeholder="نام نماد را تایپ کنید..."
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
      {showDropdown && (
        <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl shadow-lg z-[9999] list-none p-0 m-0">
          {loading && (
            <li className="px-3 py-2 text-center text-sm text-brand-600">
              در حال جستجو...
            </li>
          )}
          {!loading && results.length === 0 && !error && (
            <li className="px-3 py-2 text-center text-sm text-muted-foreground">
              نتیجه‌ای یافت نشد
            </li>
          )}
          {!loading && error && (
            <li className="px-3 py-2 text-center text-sm text-red-500">
              {error}
            </li>
          )}
          {!loading && results.map((symbol) => (
            <li
              key={symbol.isin}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(symbol); }}
              className="px-3 py-1.5 cursor-pointer flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{symbol.name}</div>
                {symbol.fullName && symbol.fullName !== symbol.name && (
                  <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{symbol.fullName}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
