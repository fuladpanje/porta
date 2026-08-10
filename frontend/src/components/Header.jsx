import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUnit } from '../contexts/UnitContext';
import { useProfitLoss } from '../contexts/ProfitLossContext';
import { useStaleData } from '../contexts/StaleDataContext';
import { useSize } from '../contexts/SizeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, BarChart3, RefreshCw, Settings, Coins, Sun, Moon, Key, Clock, List, Repeat, CircleCheckBig, Tag, Sigma, AlertTriangle, Shield, CircleX, Maximize2, Minimize2, Expand } from 'lucide-react';
import { stockApi } from '../lib/api';
import api from '../lib/api';

function UserRefreshBadge({ lastRefresh, stale, isInScheduleRange }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hasIssue = stale || !isInScheduleRange;

  const tooltipText = !isInScheduleRange
    ? 'بازار بسته است — بروزرسانی خودکار تا باز شدن بازار متوقف شده است.'
    : stale
    ? 'داده‌ها قدیمی هستند — آخرین بروزرسانی با مشکل مواجه شد.'
    : null;

  return (
    <div className="relative flex items-center" dir="ltr">
      <button
        type="button"
        onClick={() => hasIssue && setShowTooltip((v) => !v)}
        onBlur={() => setShowTooltip(false)}
        className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full rtl-text whitespace-nowrap flex items-center gap-1 focus:outline-none"
        aria-label="آخرین بروزرسانی"
      >
        {stale && <AlertTriangle className="w-3 h-3 text-amber-500" />}
        {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tehran' })}
        {isInScheduleRange
          ? <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          : <CircleX className="w-3 h-3 text-red-500" />
        }
      </button>

      {showTooltip && tooltipText && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 bg-slate-800 dark:bg-slate-700 text-white text-[11px] rounded-lg px-3 py-2 shadow-lg rtl-text leading-relaxed pointer-events-none text-right" dir="rtl">
          {tooltipText}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 dark:bg-slate-700 rotate-45 rounded-sm" />
        </div>
      )}
    </div>
  );
}

export function Header() {
   const { user, logout, updateUser } = useAuth();
   const { unit, toggleUnit } = useUnit();
   const { plMode, setPlMode } = useProfitLoss();
   const { stale, setStale } = useStaleData();
     const { size, toggleSize } = useSize();
   const navigate = useNavigate();
  const location = useLocation();
  const isSymbolsPage = location.pathname === '/symbols';
  const isSettingsPage = location.pathname === '/settings';
  const hidePlBySell = isSymbolsPage || isSettingsPage;
   const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
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

  // Fetch last_refresh_at from server on mount and keep it in sync.
  // This ensures all browsers/tabs show the same timestamp.
  useEffect(() => {
    const fetchLastRefresh = () => {
      api.get('/system/last-refresh')
        .then((res) => {
          const val = res.data?.data?.last_refresh_at;
          if (val) setLastRefresh(new Date(val));
        })
        .catch(() => {});
    };

    fetchLastRefresh();
    const t = setInterval(fetchLastRefresh, 60_000);
    return () => clearInterval(t);
  }, []);

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

  const rangeCheckRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rangeCheckRef.current) {
      clearInterval(rangeCheckRef.current);
      rangeCheckRef.current = null;
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
        // Set initial range state immediately
        setIsInScheduleRange(checkRange());

        // On mount (or when settings change), fire immediately if the last
        // known refresh is older than the configured interval.
        api.get('/system/last-refresh').then((res) => {
          const val = res.data?.data?.last_refresh_at;
          const lastMs = val ? new Date(val).getTime() : 0;
          const elapsed = Date.now() - lastMs;
          if (elapsed >= ms && checkRange()) {
            handleRefreshRef.current();
          }
        }).catch(() => {});

        // Refresh interval — only fires if currently in range
        intervalRef.current = setInterval(() => {
          const inRange = checkRange();
          setIsInScheduleRange(inRange);
          if (inRange) {
            handleRefreshRef.current();
            // Sync lastRefresh from server after auto-refresh fires
            api.get('/system/last-refresh')
              .then((res) => {
                const val = res.data?.data?.last_refresh_at;
                if (val) setLastRefresh(new Date(val));
              })
              .catch(() => {});
          }
        }, ms);

        // Separate 1-minute ticker just for range boundary detection.
        // This makes the red icon appear/disappear within ~1 minute of
        // the range boundary, regardless of how long the refresh interval is.
        rangeCheckRef.current = setInterval(() => {
          const inRange = checkRange();
          setIsInScheduleRange(inRange);
        }, 60_000);
      }
    } else if (!user?.schedule_enabled) {
      setIsInScheduleRange(true);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (rangeCheckRef.current) {
        clearInterval(rangeCheckRef.current);
        rangeCheckRef.current = null;
      }
    };
  }, [user?.schedule_enabled, user?.schedule_seconds, user?.schedule_minutes, user?.schedule_hours, user?.has_api_keys, user?.schedule_start_time, user?.schedule_end_time]);

  // lastRefresh comes from the server — no need to persist in localStorage

  useEffect(() => {
    if (user) {
      setStale(user.is_stale);
    }
  }, [user, setStale]);

   const handleRefresh = async () => {
     if (refreshing) return;
     setRefreshing(true);
     try {
       if (user?.is_admin) {
         // Admin: call BRS API to fetch fresh prices and update all portfolio items
         await stockApi.refreshPrices(true); // manual=true skips time-range check
         // Fetch the canonical timestamp from server (already in UTC, displayed with Tehran tz)
         api.get('/system/last-refresh')
           .then((res) => {
             const val = res.data?.data?.last_refresh_at;
             if (val) setLastRefresh(new Date(val));
           })
           .catch(() => {});
       }
       // All users: notify dashboard to re-fetch (cron job already updated portfolio_items)
       window.dispatchEvent(new Event('prices-refreshed'));
       setStale(false);
       api.put('/user/stale', { is_stale: false });
       updateUser({ ...user, is_stale: false });
     } catch (err) {
       // Applies to both admin (API call failed) and non-admin (dashboard re-fetch failed)
       setStale(true);
       api.put('/user/stale', { is_stale: true });
       updateUser({ ...user, is_stale: true });
     } finally {
       setRefreshing(false);
     }
   };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className={`flex items-center justify-between h-14 px-4 md:px-6 mx-auto ${size === 'fullwidth' ? '' : (size === 'large' ? 'max-w-7xl' : 'max-w-5xl')}`}>
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
            disabled={refreshing}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-500 transition-colors disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-0 group"
            aria-label="بروزرسانی قیمت‌ها"
            title="بروزرسانی قیمت‌ها"
            dir="ltr"
          >
             {lastRefresh ? (
               <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-500/20 group-hover:text-brand-500 px-2 py-1 rounded-full rtl-text whitespace-nowrap flex items-center gap-1 transition-colors">
                 <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                 {stale && <AlertTriangle className="w-3 h-3 text-amber-500" title="داده‌ها قدیمی هستند" />}
                 {lastRefresh.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tehran' })}
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
              <UserRefreshBadge
                lastRefresh={lastRefresh}
                stale={stale}
                isInScheduleRange={isInScheduleRange}
              />
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

                {/* Size Toggle */}
                <button
                  onClick={() => { toggleSize(); setShowSettings(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {size === 'fullwidth' ? <Expand className="w-3.5 h-3.5 text-slate-400" /> : size === 'large' ? <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> : <Minimize2 className="w-3.5 h-3.5 text-slate-400" />}
                    اندازه محتوا
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${size === 'fullwidth' ? 'bg-brand-500/10 text-brand-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {size === 'fullwidth' ? 'تمام عرض' : size === 'large' ? 'متوسط' : 'کوچک'}
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
