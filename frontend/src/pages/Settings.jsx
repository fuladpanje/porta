import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Settings as SettingsIcon, Plus, Trash2, Check, X, Key, Loader2, AlertCircle, Edit3, Clock, Percent, Globe, Mail, User, Tag, FolderOpen, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export default function Settings() {
  const { updateUser } = useAuth();
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;
  const [apiKeys, setApiKeys] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [editName, setEditName] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [savingAutoSwitch, setSavingAutoSwitch] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(0);
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState('minutes');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [buyCommission, setBuyCommission] = useState('0.37');
  const [sellCommission, setSellCommission] = useState('0.88');
  const [savingCommission, setSavingCommission] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [expandedPortfolios, setExpandedPortfolios] = useState({});
  const [portfolioCommission, setPortfolioCommission] = useState({});

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await api.get('/api-keys');
      setApiKeys(res.data.data);
    } catch (err) {
      // silent
    }
  }, []);

const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/user');
      const userData = res.data.user;
      setAutoSwitch(userData.auto_switch ?? true);
      setScheduleEnabled(Boolean(userData.schedule_enabled));
      const s = Number(userData.schedule_seconds) || 0;
      const m = Number(userData.schedule_minutes) || 0;
      const h = Number(userData.schedule_hours) || 0;
      if (h > 0) {
        setScheduleInterval(h);
        setScheduleIntervalUnit('hours');
      } else if (m > 0) {
        setScheduleInterval(m);
        setScheduleIntervalUnit('minutes');
      } else {
        setScheduleInterval(s);
        setScheduleIntervalUnit('minutes');
      }
      setCommissionEnabled(Boolean(userData.commission_enabled));
      setBuyCommission(String(parseFloat(userData.buy_commission) || 0.37));
      setSellCommission(String(parseFloat(userData.sell_commission) || 0.88));
    } catch (err) {
      // silent
    }
  }, []);

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await api.get('/portfolios');
      const portfolioList = res.data.data || [];
      setPortfolios(portfolioList);
      const commissionMap = {};
      portfolioList.forEach(p => {
        commissionMap[p.id] = {
          commission_enabled: Boolean(p.commission_enabled),
          buy_commission: String(parseFloat(p.buy_commission) || 0.37),
          sell_commission: String(parseFloat(p.sell_commission) || 0.88),
        };
      });
      setPortfolioCommission(commissionMap);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
    fetchUser();
    fetchPortfolios();
  }, [fetchApiKeys, fetchUser, fetchPortfolios]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api-keys', { name, api_key: apiKey });
      setName('');
      setApiKey('');
      setShowAddForm(false);
      await fetchApiKeys();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در افزودن کلید API');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/api-keys/${id}`);
      await fetchApiKeys();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در حذف کلید API');
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    try {
      await api.post(`/api-keys/${id}/default`);
      await fetchApiKeys();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در تعیین کلید پیش‌فرض');
    } finally {
      setSettingDefaultId(null);
    }
  };

const handleToggleAutoSwitch = async () => {
    const newVal = !autoSwitch;
    setSavingAutoSwitch(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/user/auto-switch', { auto_switch: newVal });
      setAutoSwitch(newVal);
      updateUserRef.current(res.data.user);
      await fetchUser();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در بروزرسانی سوئیچ اتوماتیک');
} finally {
      setSavingAutoSwitch(false);
    }
  };

  const handleToggleSchedule = async () => {
    const newVal = !scheduleEnabled;
    setSavingSchedule(true);
    setError('');
    setSuccess('');
    setScheduleEnabled(newVal);
    try {
      const payload = { schedule_enabled: newVal };
      if (scheduleIntervalUnit === 'hours') {
        payload.schedule_seconds = 0;
        payload.schedule_minutes = 0;
        payload.schedule_hours = scheduleInterval;
      } else if (scheduleIntervalUnit === 'minutes') {
        payload.schedule_seconds = 0;
        payload.schedule_minutes = scheduleInterval;
        payload.schedule_hours = 0;
      } else {
        payload.schedule_seconds = scheduleInterval;
        payload.schedule_minutes = 0;
        payload.schedule_hours = 0;
      }
      const res = await api.put('/user/schedule', payload);
      updateUserRef.current(res.data.user);
    } catch (err) {
      setScheduleEnabled(!newVal);
      setError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات زمان');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setError('');
    setSuccess('');
    const payload = { schedule_enabled: scheduleEnabled };
    if (scheduleIntervalUnit === 'hours') {
      payload.schedule_seconds = 0;
      payload.schedule_minutes = 0;
      payload.schedule_hours = scheduleInterval;
    } else if (scheduleIntervalUnit === 'minutes') {
      payload.schedule_seconds = 0;
      payload.schedule_minutes = scheduleInterval;
      payload.schedule_hours = 0;
    } else {
      payload.schedule_seconds = scheduleInterval;
      payload.schedule_minutes = 0;
      payload.schedule_hours = 0;
    }
    try {
      const res = await api.put('/user/schedule', payload);
      updateUserRef.current(res.data.user);
      await fetchUser();
      setSuccess('تنظیمات زمان با موفقیت ذخیره شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات زمان');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleCommission = async () => {
    const newVal = !commissionEnabled;
    setSavingCommission(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/user/fee-settings', {
        commission_enabled: newVal,
        buy_commission: Math.round((parseFloat(buyCommission) || 0.37) * 100),
        sell_commission: Math.round((parseFloat(sellCommission) || 0.88) * 100),
      });
      setCommissionEnabled(newVal);
      updateUserRef.current(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات کارمزد');
    } finally {
      setSavingCommission(false);
    }
  };

  const handleTogglePortfolioExpand = (portfolioId) => {
    setExpandedPortfolios(prev => ({ ...prev, [portfolioId]: !prev[portfolioId] }));
  };

  const updatePortfolioCommissionField = (portfolioId, field, value) => {
    setPortfolioCommission(prev => ({
      ...prev,
      [portfolioId]: { ...prev[portfolioId], [field]: value },
    }));
  };

  const handleSaveAllCommission = async () => {
    setSavingCommission(true);
    setError('');
    setSuccess('');
    try {
        const userRes = await api.put('/user/fee-settings', {
        commission_enabled: commissionEnabled,
        buy_commission: Math.round((parseFloat(buyCommission) || 0) * 100),
        sell_commission: Math.round((parseFloat(sellCommission) || 0) * 100),
      });
      updateUserRef.current(userRes.data.user);

      for (const portfolio of portfolios) {
        const settings = portfolioCommission[portfolio.id];
        if (settings) {
          const payload = { commission_enabled: settings.commission_enabled };
          if (settings.commission_enabled) {
            const b = settings.buy_commission === '' || settings.buy_commission == null ? 0 : Math.round(parseFloat(settings.buy_commission) * 100);
            const s = settings.sell_commission === '' || settings.sell_commission == null ? 0 : Math.round(parseFloat(settings.sell_commission) * 100);
            payload.buy_commission = b;
            payload.sell_commission = s;
          }
          await api.put(`/portfolios/${portfolio.id}/fee-settings`, payload);
        }
      }

      setSuccess('تنظیمات کارمزد با موفقیت ذخیره شد.');
      setTimeout(() => setSuccess(''), 3000);
      await fetchPortfolios();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات کارمزد');
    } finally {
      setSavingCommission(false);
    }
  };

  const handleEdit = (key) => {
    setEditingId(key.id);
    setEditName(key.name);
    setEditApiKey(key.api_key);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditApiKey('');
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setLoading(true);
    setError('');
    try {
      await api.put(`/api-keys/${editingId}`, { name: editName, api_key: editApiKey });
      handleEditCancel();
      await fetchApiKeys();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ویرایش کلید API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-500" />
          تنظیمات
        </h1>
      </div>

      <p className="text-[10px] text-slate-400 px-1 rtl-text">
        برای استفاده از سرویس سهام، باید کلید API خود را از سایت <a href="https://brsapi.ir" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">brsapi.ir</a> دریافت کنید و اضافه کنید.
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

      {/* Commission Settings Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <Percent className="w-4 h-4 text-brand-500" />
            تنظیمات کارمزد
          </h2>
            <button
              onClick={handleToggleCommission}
              disabled={savingCommission}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${commissionEnabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${commissionEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
        </div>

        {commissionEnabled && (
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد خرید (٪)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={buyCommission}
                  onChange={(e) => setBuyCommission(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  placeholder="0.37"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sellCommission}
                  onChange={(e) => setSellCommission(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  placeholder="0.88"
                />
              </div>
            </div>
          </div>
        )}

        {portfolios.length > 0 && (
          <>
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 rtl-text">
                کارمزد اختصاصی پرتفوها (در صورت فعال نبودن از تنظیمات کلی استفاده می‌شود)
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {portfolios.map((portfolio) => {
                const isExpanded = expandedPortfolios[portfolio.id];
                const settings = portfolioCommission[portfolio.id] || {};
                return (
                  <div key={portfolio.id}>
                    <button
                      onClick={() => handleTogglePortfolioExpand(portfolio.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-800 dark:text-slate-200 rtl-text">{portfolio.name}</span>
                        {settings.commission_enabled && (
                          <span className="text-[9px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-full">سفارشی</span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-[90deg]' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 rtl-text">استفاده از کارمزد اختصاصی</span>
                          <button
                            onClick={() => updatePortfolioCommissionField(portfolio.id, 'commission_enabled', !settings.commission_enabled)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${settings.commission_enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.commission_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        {settings.commission_enabled && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد خرید (٪)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={settings.buy_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'buy_commission', e.target.value)}
                                className="input-field w-full text-xs py-2"
                                placeholder="0.37"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={settings.sell_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'sell_commission', e.target.value)}
                                className="input-field w-full text-xs py-2"
                                placeholder="0.88"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSaveAllCommission}
            disabled={savingCommission}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
          >
            {savingCommission && <Loader2 className="w-3 h-3 animate-spin" />}
            {savingCommission ? 'در حال ذخیره...' : 'ذخیره تنظیمات کارمزد'}
          </button>
        </div>
       </div>

      {/* Schedule Settings Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            تنظیمات زمان‌بندی
          </h2>
            <button
              onClick={handleToggleSchedule}
              disabled={savingSchedule}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${scheduleEnabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
        </div>

        {scheduleEnabled && (
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={scheduleInterval || ''}
                onChange={(e) => setScheduleInterval(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field w-24 text-xs py-2 text-center"
                placeholder="۰"
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
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
            >
              {savingSchedule && <Loader2 className="w-3 h-3 animate-spin" />}
              {savingSchedule ? 'در حال ذخیره...' : 'ذخیره تنظیمات زمان'}
            </button>
          </div>
        )}
       </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-500" />
            API Keys
          </h2>
          {!showAddForm && !editingId && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 rtl-text">چرخش خودکار کلید</span>
              <button
                onClick={() => handleToggleAutoSwitch()}
                disabled={savingAutoSwitch}
                className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${autoSwitch ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                title="فعال/غیرفعال کردن API خودکار"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSwitch ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          )}
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 rtl-text block mb-1">نام</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full text-xs py-2"
                placeholder="مثلاً تولید، تست، و غیره"
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
                placeholder="کلید BRS API خود را وارد کنید"
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

        {editingId && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 rtl-text block mb-1">نام</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field w-full text-xs py-2"
                placeholder="نام کلید"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کلید API</label>
              <input
                type="text"
                value={editApiKey}
                onChange={(e) => setEditApiKey(e.target.value)}
                className="input-field w-full text-xs py-2 font-mono"
                placeholder="کلید BRS API"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={loading}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
              <button
                onClick={handleEditCancel}
                disabled={loading}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                انصراف
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {apiKeys.length === 0 && !showAddForm && !editingId && (
            <div className="px-4 py-8 text-center text-slate-400 text-xs">
              هیچ کلید API تنظیم نشده است. برای شروع استفاده از جستجوی سهام، یک کلید اضافه کنید.
            </div>
          )}
          {apiKeys.map((key) => (
            <div key={key.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key.is_default ? 'bg-brand-500 text-white' : 'bg-brand-500/10 text-brand-500'}`}>
                  {key.is_default ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 rtl-text">{key.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {key.is_default ? 'کلید پیش‌فرض' : 'اضافه شده در ' + new Date(key.created_at).toLocaleDateString('fa-IR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!key.is_default && (
                  <button
                    onClick={() => handleSetDefault(key.id)}
                    disabled={settingDefaultId === key.id}
                    className="text-[10px] text-brand-500 hover:text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                  >
                    {settingDefaultId === key.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'تنظیم به پیش‌فرض'
                    )}
                  </button>
                )}
                {key.is_default && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500">
                    فعال
                  </span>
                )}
                <button
                  onClick={() => handleEdit(key)}
                  className="p-1 rounded-lg hover:bg-brand-500/10 transition-colors"
                  title="ویرایش کلید API"
                >
                  <Edit3 className="w-3.5 h-3.5 text-brand-500" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(key.id)}
                  className="p-1 rounded-lg hover:bg-danger/10 transition-colors"
                  title="حذف کلید API"
                >
                  <Trash2 className="w-3.5 h-3.5 text-danger" />
                </button>
              </div>
            </div>
          ))}
          {!showAddForm && !editingId && (
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          message="آیا از حذف این کلید API مطمئن هستید؟ این اقدام قابل بازگشت نیست."
          onConfirm={() => handleDelete(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          loading={deletingId === showDeleteConfirm}
        />
      )}

      {/* Creator Info Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            سازنده
          </h2>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text mb-3">رضا فولادپنجه</p>
          <div className="space-y-2">
            <a href="https://fuladpanjeh.ir" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="ltr-text">fuladpanjeh.ir</span>
            </a>
            <a href="mailto:fuladpanje@gmail.com" className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="ltr-text">fuladpanje@gmail.com</span>
            </a>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5 py-2">
        <Tag className="w-3 h-3" />
        <span>نسخه ۱.۰.۰</span>
      </div>
    </div>
  );
}
