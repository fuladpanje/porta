import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Shield, Key, Clock, Loader2, AlertCircle, Check, X, Plus, Trash2, Settings } from 'lucide-react';
import { toPersianNum } from '../lib/calculations';
import { ConfirmModal } from '../components/ConfirmModal';

export default function AdminSettings() {
  const { updateUser } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(5);
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState('minutes');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/admin/settings');
      const data = res.data.data;
      setApiKeys(data.api_keys || []);
      setAutoSwitch(data.auto_switch ?? true);
      setScheduleEnabled(data.schedule?.enabled ?? false);
      const s = data.schedule?.seconds || 0;
      const m = data.schedule?.minutes || 5;
      const h = data.schedule?.hours || 0;
      if (h > 0) {
        setScheduleInterval(h);
        setScheduleIntervalUnit('hours');
      } else if (m > 0) {
        setScheduleInterval(m);
        setScheduleIntervalUnit('minutes');
      } else {
        setScheduleInterval(s || 5);
        setScheduleIntervalUnit('minutes');
      }
      setScheduleStartTime(data.schedule?.start_time || '');
      setScheduleEndTime(data.schedule?.end_time || '');
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در دریافت تنظیمات');
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleAddApiKey = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/admin/api-keys', { name, api_key: apiKey });
      setName('');
      setApiKey('');
      setShowAddForm(false);
      await fetchSettings();
      setSuccess('کلید API با موفقیت اضافه شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در افزودن کلید API');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (deleteConfirmIndex === null) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/api-keys/${deleteConfirmIndex}`);
      await fetchSettings();
      setSuccess('کلید API حذف شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در حذف کلید API');
    } finally {
      setDeleting(false);
      setDeleteConfirmIndex(null);
    }
  };

  const handleSaveAutoSwitch = async () => {
    try {
      await api.put('/admin/api-keys', {
        api_keys: apiKeys.map(k => ({ name: k.name, api_key: k.api_key || '' })),
        auto_switch: autoSwitch,
      });
      setSuccess('تنظیمات ذخیره شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره تنظیمات');
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setError('');
    try {
      const payload = {
        schedule_enabled: scheduleEnabled,
        schedule_seconds: scheduleIntervalUnit === 'seconds' ? scheduleInterval : 0,
        schedule_minutes: scheduleIntervalUnit === 'minutes' ? scheduleInterval : 0,
        schedule_hours: scheduleIntervalUnit === 'hours' ? scheduleInterval : 0,
        schedule_start_time: scheduleStartTime || null,
        schedule_end_time: scheduleEndTime || null,
      };
      await api.put('/admin/schedule', payload);
      const userRes = await api.get('/user');
      updateUser(userRes.data.user);
      setSuccess('تنظیمات زمان‌بندی ذخیره شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره تنظیمات زمان‌بندی');
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-500" />
          تنظیمات ادمین
        </h1>
      </div>

      <p className="text-[10px] text-slate-400 px-1 rtl-text">
        تنظیمات زیر برای همه کاربران اعمال می‌شود.
      </p>

      {error && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="mr-auto hover:text-danger/80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-center gap-2 text-success text-sm">
          <Check className="w-4 h-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="mr-auto hover:text-success/80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-500" />
            کلیدهای API سیستم
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 rtl-text">چرخش خودکار</span>
            <button
              onClick={() => { setAutoSwitch(!autoSwitch); handleSaveAutoSwitch(); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoSwitch ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSwitch ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddApiKey} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 rtl-text block mb-1">نام</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full text-xs py-2"
                placeholder="مثلاً اصلی، پشتیبان"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کلید API</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field w-full text-xs py-2 font-mono"
                placeholder="کلید BRS API"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1">
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                {loading ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setName(''); setApiKey(''); setError(''); }}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                انصراف
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {apiKeys.length === 0 && !showAddForm && (
            <div className="px-4 py-8 text-center text-slate-400 text-xs">
              هیچ کلید API تنظیم نشده است.
            </div>
          )}
          {apiKeys.map((key, index) => (
            <div key={index} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key.is_default ? 'bg-brand-500 text-white' : 'bg-brand-500/10 text-brand-500'}`}>
                  {key.is_default ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 rtl-text">{key.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{key.api_key}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {key.is_default && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500">
                    پیش‌فرض
                  </span>
                )}
                <button
                  onClick={() => setDeleteConfirmIndex(index)}
                  className="p-1 rounded-lg hover:bg-danger/10 transition-colors"
                  title="حذف کلید"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger" />
                </button>
              </div>
            </div>
          ))}
          {!showAddForm && (
            <div className="px-4 py-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> افزودن کلید API
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Settings Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            زمان‌بندی بروزرسانی خودکار
          </h2>
          <button
            onClick={() => { setScheduleEnabled(!scheduleEnabled); }}
            className={`relative w-11 h-6 rounded-full transition-colors ${scheduleEnabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {scheduleEnabled && (
          <div className="px-4 py-3 space-y-3">
            <p className="text-[10px] text-slate-400 rtl-text">
              بروزرسانی خودکار قیمت‌ها حتی وقتی کاربری حضور ندارد
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={scheduleInterval || ''}
                onChange={(e) => setScheduleInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field w-24 text-xs py-2 text-center"
              />
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 h-8">
                {[
                  { value: 'seconds', label: 'ثانیه' },
                  { value: 'minutes', label: 'دقیقه' },
                  { value: 'hours', label: 'ساعت' },
                ].map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setScheduleIntervalUnit(u.value)}
                    className={`flex-1 text-[10px] py-1 px-2 rounded-md rtl-text transition-colors whitespace-nowrap h-full flex items-center justify-center ${scheduleIntervalUnit === u.value ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm font-medium' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 rtl-text">بازه زمانی اجرا (اختیاری)</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 rtl-text block mb-1">از ساعت</label>
                  <input
                    type="time"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>
                <span className="text-slate-400 mt-4">—</span>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 rtl-text block mb-1">تا ساعت</label>
                  <input
                    type="time"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="input-field w-full text-xs py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setScheduleStartTime('08:45'); setScheduleEndTime('12:30'); }}
                  className={`text-[10px] px-3 py-1.5 rounded-lg rtl-text transition-colors ${scheduleStartTime === '08:45' && scheduleEndTime === '12:30' ? 'bg-brand-500/20 text-brand-500 border border-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  ۸:۴۵ — ۱۲:۳۰
                </button>
                <button
                  type="button"
                  onClick={() => { setScheduleStartTime('08:45'); setScheduleEndTime('17:00'); }}
                  className={`text-[10px] px-3 py-1.5 rounded-lg rtl-text transition-colors ${scheduleStartTime === '08:45' && scheduleEndTime === '17:00' ? 'bg-brand-500/20 text-brand-500 border border-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  ۸:۴۵ — ۱۷:۰۰
                </button>
                {(scheduleStartTime || scheduleEndTime) && (
                  <button
                    type="button"
                    onClick={() => { setScheduleStartTime(''); setScheduleEndTime(''); }}
                    className="text-[10px] px-3 py-1.5 rounded-lg rtl-text bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                  >
                    حذف بازه
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
            >
              {savingSchedule && <Loader2 className="w-3 h-3 animate-spin" />}
              {savingSchedule ? 'در حال ذخیره...' : 'ذخیره تنظیمات زمان‌بندی'}
            </button>
          </div>
        )}
      </div>

    {deleteConfirmIndex !== null && (
        <ConfirmModal
          message="آیا از حذف این کلید API مطمئن هستید؟"
          onConfirm={handleDeleteApiKey}
          onCancel={() => setDeleteConfirmIndex(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
