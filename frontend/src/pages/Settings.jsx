import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useStaleData } from '../contexts/StaleDataContext';
import { Check, X, Loader2, AlertCircle, Percent, Globe, Mail, User, Tag, FolderOpen, ChevronDown, Lock, Shield } from 'lucide-react';
import { toPersianNum } from '../lib/calculations';
import { ConfirmModal } from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { setStale } = useStaleData();
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [buyCommission, setBuyCommission] = useState('0.37');
  const [sellCommission, setSellCommission] = useState('0.88');
  const [savingCommission, setSavingCommission] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [expandedPortfolios, setExpandedPortfolios] = useState({});
  const [portfolioCommission, setPortfolioCommission] = useState({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/user');
      const userData = res.data.user;
      updateUserRef.current(userData);
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
    fetchUser();
    fetchPortfolios();
  }, [fetchUser, fetchPortfolios]);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('رمز جدید و تأیید آن یکسان نیستند.');
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
      setSavingPassword(false);
      return;
    }
    try {
      const res = await api.put('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setSuccess(res.data.message || 'رمز با موفقیت تغییر یافت.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در تغییر رمز.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-4">

      <p className="text-[10px] text-slate-400 px-1 rtl-text">
        برای استفاده از سرویس سهام، باید کلید API خود را از سایت <a href="https://brsapi.ir" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">brsapi.ir</a> دریافت کنید و اضافه کنید.
      </p>

      {/* User Info Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            اطلاعات کاربر
          </h2>
        </div>

        <div className="px-4 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 rtl-text">نام کاربری</span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{user?.username || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 rtl-text">ایمیل</span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 ltr-text">{user?.email || '—'}</span>
          </div>
        </div>

        <div className="px-4 py-3">
          {!showPasswordForm ? (
            <button
              onClick={() => { setShowPasswordForm(true); setError(''); setSuccess(''); }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              تغییر رمز
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">رمز فعلی</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field w-full text-xs py-2 text-left"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">رمز جدید</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field w-full text-xs py-2 text-left"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">تأیید رمز جدید</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field w-full text-xs py-2 text-left"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={savingPassword} className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1">
                  {savingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
                  {savingPassword ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

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
                  type="number"
                  inputMode="decimal"
                  value={buyCommission}
                  onChange={(e) => setBuyCommission(e.target.value)}
                  className="input-field w-full text-xs py-2 text-left"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={sellCommission}
                  onChange={(e) => setSellCommission(e.target.value)}
                  className="input-field w-full text-xs py-2 text-left"
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
                                type="number"
                                inputMode="decimal"
                                value={settings.buy_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'buy_commission', e.target.value)}
                                className="input-field w-full text-xs py-2 text-left"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={settings.sell_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'sell_commission', e.target.value)}
                                className="input-field w-full text-xs py-2 text-left"
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

      {/* Admin Settings Link - only for admins */}
      {user?.is_admin && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="px-4 py-3">
            <button
              onClick={() => navigate('/admin-settings')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-brand-500/10 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 rtl-text">
                <Shield className="w-4 h-4 text-brand-500" />
                تنظیمات ادمین
              </span>
              <span className="text-[10px] text-slate-400">مدیریت API و زمان‌بندی</span>
            </button>
          </div>
        </div>
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
