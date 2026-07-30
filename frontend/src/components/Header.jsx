import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUnit } from '../contexts/UnitContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, BarChart3, RefreshCw, Settings, Coins, Sun, Moon, Key, Clock, List, Repeat } from 'lucide-react';
import { stockApi } from '../lib/api';
import { clearSymbolCache } from '../lib/symbolCache';

export function Header() {
  const { user, logout } = useAuth();
  const { unit, toggleUnit } = useUnit();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(() => {
    const stored = localStorage.getItem('last_schedule_refresh');
    return stored ? new Date(Number(stored)) : null;
  });
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const intervalRef = useRef(null);
  const handleRefreshRef = useRef(null);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [plBySell, setPlBySell] = useState(() => {
    const stored = localStorage.getItem('profit_loss_by_sell');
    return stored ? stored === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('profit_loss_by_sell', String(plBySell));
  }, [plBySell]);

  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  });

  useEffect(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (user?.schedule_enabled) {
      const s = Number(user.schedule_seconds) || 0;
      const m = Number(user.schedule_minutes) || 0;
      const h = Number(user.schedule_hours) || 0;
      const ms = s * 1000 + m * 60000 + h * 3600000;
      if (ms > 0) {
        const scheduleNext = () => {
          handleRefreshRef.current();
          localStorage.setItem('last_schedule_refresh', Date.now().toString());
        };

        handleRefreshRef.current();
        localStorage.setItem('last_schedule_refresh', Date.now().toString());
        intervalRef.current = setInterval(scheduleNext, ms);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.schedule_enabled, user?.schedule_seconds, user?.schedule_minutes, user?.schedule_hours]);

  useEffect(() => {
    if (lastRefresh) {
      localStorage.setItem('last_schedule_refresh', lastRefresh.getTime().toString());
    }
  }, [lastRefresh]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await stockApi.refreshPrices();
      clearSymbolCache();
      window.dispatchEvent(new Event('prices-refreshed'));
      setLastRefresh(new Date());
    } catch (err) {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-14 px-4 md:px-6 max-w-5xl mx-auto">
        {/* Right: Logo + Title */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">پورتا</span>
        </div>

        {/* Left: Refresh + Settings */}
        {user && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
            aria-label="بروزرسانی قیمت‌ها"
            title="بروزرسانی قیمت‌ها"
            dir="ltr"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {lastRefresh && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full rtl-text whitespace-nowrap flex items-center gap-1">
                {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                <span className={`inline-block w-2 h-2 rounded-full bg-brand-400 ${user?.schedule_enabled ? 'animate-pulse' : ''}`} title="زمان‌بندی فعال" />
              </span>
            )}
          </button>

          {/* Profit/Loss Mode Toggle */}
          <button
            onClick={() => { setPlBySell((prev) => !prev); window.dispatchEvent(new Event('pl-by-sell-changed')); }}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium rtl-text transition-colors flex items-center gap-1 ${plBySell ? 'bg-brand-500/20 text-brand-500 hover:bg-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            aria-label="تغییر حالت محاسبه سود و زیان"
            title={plBySell ? 'محاسبه سود/ضرر بر اساس آخرین قیمت + قیمت فروش' : 'محاسبه سود/ضرر بر اساس قیمت فروش محقق شده'}
          >
            <Repeat className="w-3 h-3" />
            {plBySell ? 'آخرین + فروش' : 'فروش'}
          </button>

          <button
            onClick={() => navigate('/symbols')}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
            aria-label="همه نمادها"
            title="همه نمادها"
          >
            <List className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
              aria-label="تنظیمات"
              title="تنظیمات"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden sm:block">{user?.name}</span>
            </button>
            {showSettings && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50 animate-fade-in">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">تنظیمات</p>

                {/* Unit Toggle */}
                <button
                  onClick={() => { toggleUnit(); setShowSettings(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    واحد پول
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${unit === 'toman' ? 'bg-brand-500/10 text-brand-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {unit === 'rial' ? 'ریال' : 'تومان'}
                  </span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />

                {/* Theme Toggle */}
                <button
                  onClick={() => { setIsDark((prev) => !prev); setShowSettings(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {isDark ? <Moon className="w-3.5 h-3.5 text-slate-400" /> : <Sun className="w-3.5 h-3.5 text-slate-400" />}
                    حالت نمایش
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-brand-500/10 text-brand-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {isDark ? 'شب' : 'روز'}
                  </span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />

                {/* تنظیمات */}
                <button
                  onClick={() => { navigate('/settings'); setShowSettings(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    تنظیمات
                  </span>
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />

                {/* Logout */}
                <button
                  onClick={() => { logout(); setShowSettings(false); }}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-danger/10 transition-colors text-xs text-danger"
                >
                  <LogOut className="w-3.5 h-3.5 rotate-180" />
                  خروج
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </header>
  );
}
