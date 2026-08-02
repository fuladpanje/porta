import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUnit } from '../contexts/UnitContext';
import { useProfitLoss } from '../contexts/ProfitLossContext';
import { useStaleData } from '../contexts/StaleDataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, BarChart3, RefreshCw, Settings, Coins, Sun, Moon, Key, Clock, List, Repeat, CircleCheckBig, Tag, Sigma, AlertTriangle, Shield, CircleX } from 'lucide-react';
import { stockApi } from '../lib/api';
import api from '../lib/api';

export function Header() {
   const { user, logout, updateUser } = useAuth();
   const { unit, toggleUnit } = useUnit();
   const { plMode, setPlMode } = useProfitLoss();
   const { stale, setStale } = useStaleData();
   const navigate = useNavigate();
  const location = useLocation();
  const isSymbolsPage = location.pathname === '/symbols';
  const isSettingsPage = location.pathname === '/settings';
  const hidePlBySell = isSymbolsPage || isSettingsPage;
   const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(() => {
    const stored = localStorage.getItem('last_schedule_refresh');
    return stored ? new Date(Number(stored)) : null;
  });
  const [isInScheduleRange, setIsInScheduleRange] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const intervalRef = useRef(null);
  const handleRefreshRef = useRef(null);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const checkRange = () => {
      const start = user?.schedule_start_time;
      const end = user?.schedule_end_time;
      if (!start || !end) return true;
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (start <= end) {
        return current >= start && current <= end;
      } else {
        return current >= start || current <= end;
      }
    };

    if (user?.schedule_enabled && user?.has_api_keys) {
      const s = Number(user.schedule_seconds) || 0;
      const m = Number(user.schedule_minutes) || 0;
      const h = Number(user.schedule_hours) || 0;
      const ms = s * 1000 + m * 60000 + h * 3600000;
      if (ms > 0) {
        setIsInScheduleRange(checkRange());

        const scheduleNext = () => {
          const inRange = checkRange();
          setIsInScheduleRange(inRange);
          if (inRange) {
            handleRefreshRef.current();
          }
        };

        intervalRef.current = setInterval(scheduleNext, ms);
      }
    } else if (!user?.schedule_enabled) {
      setIsInScheduleRange(true);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.schedule_enabled, user?.schedule_seconds, user?.schedule_minutes, user?.schedule_hours, user?.has_api_keys, user?.schedule_start_time, user?.schedule_end_time]);

  useEffect(() => {
    if (lastRefresh) {
      localStorage.setItem('last_schedule_refresh', lastRefresh.getTime().toString());
    }
  }, [lastRefresh]);

  useEffect(() => {
    if (user) {
      setStale(user.is_stale);
    }
  }, [user, setStale]);

   const handleRefresh = async () => {
     if (refreshing) return;
     setRefreshing(true);
     try {
       await stockApi.refreshPrices();
       setLastRefresh(new Date());
       window.dispatchEvent(new Event('prices-refreshed'));
        setStale(false);
        api.put('/user/stale', { is_stale: false });
        updateUser({ ...user, is_stale: false });
     } catch (err) {
        setStale(true);
        api.put('/user/stale', { is_stale: true });
        updateUser({ ...user, is_stale: true });
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
          {!isSettingsPage && (
          <>
          {user?.is_admin ? (
          <button
            onClick={handleRefresh}
            disabled={refreshing || (!isInScheduleRange && user?.schedule_enabled)}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-500 transition-colors disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-0 group"
            aria-label="بروزرسانی قیمت‌ها"
            title={!isInScheduleRange && user?.schedule_enabled ? 'بازار بسته است - بروزرسانی غیرفعال' : 'بروزرسانی قیمت‌ها'}
            dir="ltr"
          >
             {lastRefresh ? (
               <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-500/20 group-hover:text-brand-500 px-2 py-1 rounded-full rtl-text whitespace-nowrap flex items-center gap-1 transition-colors">
                 <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                 {stale && <AlertTriangle className="w-3 h-3 text-amber-500" title="داده‌ها قدیمی هستند" />}
                 {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                 {user?.schedule_enabled && user?.has_api_keys && (
                   isInScheduleRange
                     ? <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" title="زمان‌بندی فعال" />
                     : <CircleX className="w-3 h-3 text-red-500" title="بازار بسته است" />
                 )}
               </span>
             ) : (
               <>
                 <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                 {stale && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="داده‌ها قدیمی هستند" />}
               </>
             )}
          </button>
          ) : (
            lastRefresh && user?.schedule_enabled && user?.has_api_keys && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full rtl-text whitespace-nowrap flex items-center gap-1" dir="ltr">
                {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                {isInScheduleRange
                  ? <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" title="زمان‌بندی فعال" />
                  : <CircleX className="w-3 h-3 text-red-500" title="بازار بسته است" />
                }
              </span>
            )
          )}
          </>
          )}

          {/* Profit/Loss Mode Toggle - hidden on AllSymbols and Settings pages */}
          {!hidePlBySell && (
          <button
            onClick={() => {
              setPlMode((prev) => prev === 'all' ? 'realized' : prev === 'realized' ? 'unrealized' : 'all');
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium rtl-text transition-colors flex items-center gap-1 ${plMode === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700' : plMode === 'realized' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'}`}
            aria-label="تغییر حالت محاسبه سود و زیان"
            title={plMode === 'all' ? 'محاسبه سود/ضرر محقق شده + محقق نشده' : plMode === 'realized' ? 'محاسبه سود/ضرر فقط محقق شده' : 'محاسبه سود/ضرر فقط محقق نشده'}
          >
            <span>{plMode === 'all' ? <Sigma className="w-3 h-3" /> : plMode === 'realized' ? <CircleCheckBig className="w-3 h-3" /> : <Clock className="w-3 h-3" />}</span>
            <span className="hidden sm:inline">{plMode === 'all' ? 'محقق شده + نشده' : plMode === 'realized' ? 'محقق شده' : 'محقق نشده'}</span>
          </button>
          )}

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
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden sm:block">{user?.username}</span>
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

                {/* Admin Settings - only for admins */}
                {user?.is_admin && (
                  <>
                    <button
                      onClick={() => { navigate('/admin-settings'); setShowSettings(false); }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-brand-500/10 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-brand-500 font-medium">
                        <Shield className="w-3.5 h-3.5" />
                        تنظیمات ادمین
                      </span>
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
                  </>
                )}

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
