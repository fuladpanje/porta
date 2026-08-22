import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Trash2, TrendingUp, TrendingDown, ChevronDown, Loader2, Volume2, VolumeX } from 'lucide-react';
import api from '../lib/api';
import { NotificationPopup } from './NotificationPopup';

function playNotificationSound() {
  try {
    if (localStorage.getItem('porta_notification_sound') === 'off') return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, now);
    osc1.frequency.setValueAtTime(659, now + 0.25);
    osc1.frequency.setValueAtTime(784, now + 0.5);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.setValueAtTime(0.12, now + 0.25);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.start(now);
    osc1.stop(now + 0.9);
  } catch {}
}

function formatPrice(price) {
  if (price == null) return '—';
  return Number(price).toLocaleString('fa-IR');
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric', timeZone: 'Asia/Tehran' });
}

export function NotificationHistoryMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [popupNotifications, setPopupNotifications] = useState([]);
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(() => {
    try { return localStorage.getItem('porta_notification_sound') !== 'off'; } catch { return true; }
  });
  const menuRef = useRef(null);
  const lastCheckedRef = useRef(Date.now() - 60000);
  const initialLoadDoneRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/crossover-notifications?limit=50');
      const all = res.data?.data || [];
      setNotifications(all);
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true;
        const unread = all.filter(n => {
          const d = new Date(n.detected_at).getTime();
          return Date.now() - d < 24 * 60 * 60 * 1000;
        });
        setUnreadCount(unread.length);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = useCallback(() => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      lastCheckedRef.current = Date.now();
      setUnreadCount(0);
    }
  }, [open]);

  const checkForNewNotifications = useCallback(async () => {
    if (!lastCheckedRef.current) return;

    try {
      const res = await api.get('/crossover-notifications?limit=10');
      const all = res.data?.data || [];
      const previousCheck = lastCheckedRef.current;
      const newOnes = all.filter(n => new Date(n.detected_at).getTime() > previousCheck);

      lastCheckedRef.current = Date.now();

      if (newOnes.length === 0) {
        return;
      }

      if (open) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const merged = [...newOnes.filter(n => !existingIds.has(n.id)), ...prev];
          return merged.slice(0, 50);
        });
      } else {
        setUnreadCount(prev => prev + newOnes.length);
      }

      setPopupNotifications(newOnes);
      playNotificationSound();
    } catch (e) {
      // silent
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = async () => {
      if (open) {
        fetchNotifications();
        lastCheckedRef.current = Date.now();
      } else {
        checkForNewNotifications();
      }
    };
    window.addEventListener('prices-refreshed', handler);
    return () => window.removeEventListener('prices-refreshed', handler);
  }, [open, fetchNotifications, checkForNewNotifications]);

  useEffect(() => {
    const interval = setInterval(checkForNewNotifications, 30_000);
    return () => clearInterval(interval);
  }, [checkForNewNotifications]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.delete('/crossover-notifications');
      setNotifications([]);
    } catch (e) {
      // silent
    } finally {
      setClearing(false);
    }
  };

  const grouped = notifications.reduce((acc, n) => {
    const key = formatDate(n.detected_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <>
    <NotificationPopup
      crossovers={popupNotifications}
      onDismissAll={() => setPopupNotifications([])}
      onDismissOne={(id) => setPopupNotifications(prev => prev.filter(n => n.id !== id))}
    />
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        className={`p-2 rounded-lg transition-colors relative ${
          open
            ? 'text-brand-500 bg-brand-500/10'
            : 'text-slate-400 hover:text-brand-500 hover:bg-brand-500/10'
        }`}
        aria-label="سابقه نوتیفیکیشن‌ها"
        title="سابقه نوتیفیکیشن‌ها"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">سابقه نوتیفیکیشن‌ها</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newVal = !notifSoundEnabled;
                  setNotifSoundEnabled(newVal);
                  try { localStorage.setItem('porta_notification_sound', newVal ? 'on' : 'off'); } catch {}
                }}
                className={`p-1 rounded-md transition-colors ${notifSoundEnabled ? 'text-brand-500 hover:bg-brand-500/10' : 'text-slate-300 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={notifSoundEnabled ? 'صدای نوتیفیکیشن فعال' : 'صدای نوتیفیکیشن غیرفعال'}
              >
                {notifSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="p-1 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="پاک کردن همه"
                >
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">نوتیفیکیشنی وجود ندارد</p>
              </div>
            ) : (
              Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{date}</span>
                  </div>
                  {items.map((n) => {
                    const isResistance = n.is_resistance;
                    return (
                      <div key={n.id} className="px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-2">
                          {isResistance
                            ? <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                            : <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                          }
                          <span className="font-bold text-xs text-slate-800 dark:text-white">{n.symbol}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            isResistance
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                              : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          }`}>
                            {n.level_label}
                          </span>
                          {n.source && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                              {n.source}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 mr-auto">{formatTime(n.detected_at)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 mr-5">
                          {n.direction_label} — قیمت: {formatPrice(n.price)}
                          {n.level_value && ` | سطح: ${formatPrice(n.level_value)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
