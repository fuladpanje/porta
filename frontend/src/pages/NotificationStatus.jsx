import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
} from 'lucide-react';
import api from '../lib/api';

const LEVELS = [
  ['resistance_1', 'مقاومت ۱'],
  ['resistance_2', 'مقاومت ۲'],
  ['support_1', 'حمایت ۱'],
  ['support_2', 'حمایت ۲'],
];

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('fa-IR');
}

function formatDate(value) {
  if (!value) return 'هنوز ثبت نشده';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Asia/Tehran',
  });
}

function StatusCard({ icon: Icon, title, value, detail, ok = null }) {
  return (
    <div className="card p-4 flex items-start gap-3" dir="rtl">
      <div className={`p-2 rounded-lg ${ok === false ? 'bg-danger/10 text-danger' : ok === true ? 'bg-success/10 text-success' : 'bg-brand-500/10 text-brand-500'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 rtl-text">{title}</p>
        <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 rtl-text truncate">{value}</p>
        {detail && <p className="text-[10px] text-slate-400 mt-1 rtl-text">{detail}</p>}
      </div>
    </div>
  );
}

function LevelRow({ level, value, old_price: oldPrice, cached_price: cachedPrice, would_cross: wouldCross }) {
  const label = LEVELS.find(([key]) => key === level)?.[1] || level;
  const isResistance = level.startsWith('resistance');
  const hasResult = wouldCross === 'up' || wouldCross === 'down';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0" dir="rtl">
      <span className={`text-[10px] font-medium w-16 ${isResistance ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>
        {label}
      </span>
      <span className="text-[10px] text-slate-500">سطح: {formatPrice(value)}</span>
      <span className="text-[10px] text-slate-400">قبلی: {formatPrice(oldPrice)}</span>
      <span className="text-[10px] text-slate-400">فعلی: {formatPrice(cachedPrice)}</span>
      <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full ${hasResult ? 'bg-success/10 text-success' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
        {hasResult ? `کراس ${wouldCross === 'up' ? 'رو به بالا' : 'رو به پایین'}` : 'کراس ثبت نشده'}
      </span>
    </div>
  );
}

export default function NotificationStatus() {
  const [status, setStatus] = useState(null);
  const [checks, setChecks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [forceResult, setForceResult] = useState(null);
  const [forceLoading, setForceLoading] = useState(false);
  const [forceError, setForceError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const [statusResponse, checksResponse] = await Promise.all([
        api.get('/debug/notification-status'),
        api.get('/debug/portfolio-crossover-check'),
      ]);
      setStatus(statusResponse.data);
      setChecks(checksResponse.data);
      setError('');
      setUpdatedAt(new Date());
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(message || 'دریافت وضعیت نوتیفیکیشن ممکن نیست');
    } finally {
      setLoading(false);
    }
  }, []);

  const runForceDetect = useCallback(async () => {
    setForceLoading(true);
    setForceError('');
    setForceResult(null);
    try {
      const res = await api.post('/debug/force-detect');
      setForceResult(res.data);
      fetchStatus();
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || err.message;
      setForceError(message || 'اجرای اجباری ناموفق بود');
    } finally {
      setForceLoading(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const items = useMemo(() => checks?.portfolios || [], [checks]);
  const recent = status?.recent_notifications || [];
  const lastRefresh = status?.last_refresh_at || checks?.now_tehran;

  return (
    <div className="space-y-4 pb-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white rtl-text flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" />
            وضعیت نوتیفیکیشن
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 rtl-text">
            این صفحه هر ۱۰ ثانیه وضعیت ثبت کراس را از سرور بررسی می‌کند.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          className="btn-secondary text-xs py-2 px-3 rtl-text flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </button>
        <button
          type="button"
          onClick={runForceDetect}
          disabled={forceLoading}
          className="text-xs py-2 px-3 rtl-text flex items-center gap-1.5 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 font-bold"
        >
          <BellRing className={`w-3.5 h-3.5 ${forceLoading ? 'animate-spin' : ''}`} />
          {forceLoading ? 'در حال اجرا...' : 'اجرای اجباری کراس'}
        </button>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/20 text-danger rounded-xl p-3 flex items-start gap-2 text-xs rtl-text">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">وضعیت از سرور دریافت نشد.</p>
            <p className="text-[10px] mt-1 opacity-80 break-words">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard
          icon={Database}
          title="جدول نوتیفیکیشن"
          value={status?.has_table ? 'آماده' : 'پیدا نشد'}
          detail={status ? `${formatPrice(status.notif_count)} رکورد برای حساب شما` : 'در حال بررسی'}
          ok={status ? status.has_table : null}
        />
        <StatusCard
          icon={Clock3}
          title="آخرین بروزرسانی سرور"
          value={lastRefresh ? formatDate(lastRefresh) : 'ثبت نشده'}
          detail={updatedAt ? `آخرین مشاهده: ${formatDate(updatedAt)}` : 'در حال بررسی'}
          ok={lastRefresh ? true : false}
        />
        <StatusCard
          icon={Activity}
          title="بازه بررسی بازار"
          value={status?.is_market_open_now ? 'فعال' : 'خارج از بازه'}
          detail={status?.schedule?.start_time && status?.schedule?.end_time ? `${status.schedule.start_time} تا ${status.schedule.end_time}` : 'بدون محدودیت زمانی'}
          ok={status ? status.is_market_open_now : null}
        />
        <StatusCard
          icon={BellRing}
          title="آخرین نوتیفیکیشن"
          value={recent[0]?.symbol || 'هنوز ثبت نشده'}
          detail={recent[0] ? `${recent[0].level_type} — ${formatDate(recent[0].detected_at)}` : 'برای حساب شما رکوردی نیست'}
          ok={recent[0] ? true : null}
        />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white rtl-text">بررسی نمادهای پرتفو</h2>
          <span className="text-[10px] text-slate-400 rtl-text">وضعیت همین لحظه</span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 rtl-text">نماد پرتفو برای بررسی پیدا نشد.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.portfolio_id}-${item.symbol}`} className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1" dir="rtl">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.symbol}</span>
                    <span className="text-[10px] text-slate-400 mr-2">{item.portfolio}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400">قبلی: {formatPrice(item.last_price)} | فعلی: {formatPrice(item.cached_price)}</span>
                    {item.last_check_time && <span className="text-[9px] text-slate-400">آخرین مقایسه: {formatDate(item.last_check_time)}</span>}
                  </div>
                </div>
                {item.levels?.map((level) => (
                  <LevelRow key={`${item.symbol}-${level.level}`} {...level} value={level.level_value} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {forceError && (
        <div className="bg-danger/5 border border-danger/20 text-danger rounded-xl p-3 flex items-start gap-2 text-xs rtl-text">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">خطا در اجرای اجباری:</p>
            <p className="text-[10px] mt-1 opacity-80 break-words">{forceError}</p>
          </div>
        </div>
      )}

      {forceResult && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white rtl-text">
              نتیجه اجرای اجباری کراس
            </h2>
            <span className="text-[10px] text-slate-400 mr-auto">{forceResult.now_tehran}</span>
          </div>
          <div className="mb-2 text-xs text-slate-500 rtl-text">
            تعداد کل نوتیفیکیشن‌ها: {forceResult.total_notifications}
          </div>

          {forceResult.portfolio_items?.map((item, idx) => (
            <div key={idx} className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-3 mb-2">
              <div className="flex items-center justify-between mb-1" dir="rtl">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.symbol}</span>
                <span className="text-[10px] text-slate-400">{item.portfolio}</span>
              </div>
              <div className="text-[10px] text-slate-400 mb-1" dir="rtl">
                قبلی: {formatPrice(item.old_price_used ?? item.prev_last_price)} | فعلی: {formatPrice(item.last_price)}
                {item.prev_last_price !== null && item.prev_last_price !== undefined && (
                  <span className="mr-2 text-slate-300">(prev: {formatPrice(item.prev_last_price)})</span>
                )}
              </div>
              {item.skip && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">{item.skip}</span>
              )}
              {item.detected?.length > 0 ? (
                <div className="mt-1">
                  {item.detected.map((d, di) => (
                    <div key={di} className="text-[10px] bg-success/10 text-success rounded px-2 py-0.5 mb-0.5">
                      کراس {d.direction === 'up' ? 'رو به بالا' : 'رو به پایین'} — {d.level} ({formatPrice(d.level_value)}) — قیمت: {formatPrice(d.price)}
                    </div>
                  ))}
                </div>
              ) : (
                !item.skip && <span className="text-[10px] text-slate-400">کراسی تشخیص داده نشد</span>
              )}
            </div>
          ))}

          {forceResult.symbol_levels?.map((sl, idx) => (
            <div key={`sl-${idx}`} className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-3 mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sl.symbol}</span>
              {sl.skip ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning mr-2">{sl.skip}</span>
              ) : sl.detected?.length > 0 ? (
                <div className="mt-1">
                  {sl.detected.map((d, di) => (
                    <div key={di} className="text-[10px] bg-success/10 text-success rounded px-2 py-0.5">
                      ک拉斯 {d.direction} — {d.level} — قیمت: {formatPrice(d.price)}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 mr-2">کراسی نبود</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 bg-brand-500/[0.03]">
        <div className="flex items-start gap-2" dir="rtl">
          <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-6 rtl-text">
            اگر قیمت بین دو اجرای کران از سطح عبور کند، نتیجه‌ی آن در بخش «آخرین نوتیفیکیشن» و زنگوله ثبت می‌شود. این صفحه برای فهمیدن مسیر مشکل است: آیا سرور بروزرسانی شده، جدول در دسترس است و سطح‌ها با قیمت فعلی قابل‌بررسی هستند.
          </p>
        </div>
      </div>
    </div>
  );
}
