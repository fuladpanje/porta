import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Check, X, Loader2, AlertCircle, Percent, Globe, Mail, User, Tag, FolderOpen, ChevronDown, Lock, Shield, MessageSquare, BarChart3 } from 'lucide-react';
import { toPersianNum } from '../lib/calculations';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;
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
  const [phone, setPhone] = useState('');
  const [ippanelApiKey, setIppanelApiKey] = useState('');
  const [ippanelSender, setIppanelSender] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [smsStats, setSmsStats] = useState({ total_sent: 0, today_sent: 0, portfolio_today_sent: 0, portfolio_total_sent: 0 });
  const [smsHistory, setSmsHistory] = useState([]);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showSmsContact, setShowSmsContact] = useState(false);
  
  // Section-specific messages
  const [smsError, setSmsError] = useState('');
  const [smsSuccess, setSmsSuccess] = useState('');
  const [commissionError, setCommissionError] = useState('');
  const [commissionSuccess, setCommissionSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const clearCommissionMessages = () => {
    setCommissionError('');
    setCommissionSuccess('');
  };

  const clearSmsMessages = () => {
    setSmsError('');
    setSmsSuccess('');
  };

  const clearPasswordMessages = () => {
    setPasswordError('');
    setPasswordSuccess('');
  };

  const normalizeTimeForInput = (value) => (value ? String(value).slice(0, 5) : '');

  const SectionMessage = ({ type, message, onClose }) => {
    if (!message) return null;

    const isSuccess = type === 'success';

    const messageClass = isSuccess
      ? 'bg-success/5 border border-success/20 text-success'
      : 'bg-danger/5 border border-danger/20 text-danger';
    const closeClass = isSuccess ? 'mr-auto hover:text-success/80' : 'mr-auto hover:text-danger/80';

    return (
      <div className={`${messageClass} rounded-lg p-3 flex items-center gap-2 text-sm rtl-text`}>
        {isSuccess ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
        <span>{message}</span>
        <button onClick={onClose} className={closeClass} aria-label="بستن پیام">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/user');
      const userData = res.data.user;
      updateUserRef.current(userData);
      setCommissionEnabled(Boolean(userData.commission_enabled));
      setBuyCommission(String(parseFloat(userData.buy_commission) || 0.37));
      setSellCommission(String(parseFloat(userData.sell_commission) || 0.88));
      setPhone(userData.phone || '');
      setSmsEnabled(Boolean(userData.sms_enabled));
      setIppanelSender(userData.ippanel_sender || '');
    } catch (err) {
      // silent
    }
  }, []);

  const fetchSmsStats = useCallback(async () => {
    try {
      const res = await api.get('/user/sms-stats');
      setSmsStats(res.data.data);
    } catch (err) {
      // silent
    }
  }, []);

  const fetchSmsHistory = useCallback(async () => {
    try {
      const res = await api.get('/user/sms-history');
      setSmsHistory(res.data.data || []);
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
    fetchSmsStats();
    fetchSmsHistory();
  }, [fetchUser, fetchPortfolios, fetchSmsStats, fetchSmsHistory]);

  const handleToggleCommission = async () => {
    const newVal = !commissionEnabled;
    setSavingCommission(true);
    clearCommissionMessages();
    try {
      const res = await api.put('/user/fee-settings', {
        commission_enabled: newVal,
        buy_commission: Math.round((parseFloat(buyCommission) || 0.37) * 100),
        sell_commission: Math.round((parseFloat(sellCommission) || 0.88) * 100),
      });
      setCommissionEnabled(newVal);
      updateUserRef.current(res.data.user);
    } catch (err) {
      setCommissionError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات کارمزد');
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
    clearCommissionMessages();
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

      setCommissionSuccess('تنظیمات کارمزد با موفقیت ذخیره شد.');
      setTimeout(() => setCommissionSuccess(''), 3000);
      await fetchPortfolios();
    } catch (err) {
      setCommissionError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات کارمزد');
    } finally {
      setSavingCommission(false);
    }
  };

  const handleSaveSms = async () => {
    setSavingSms(true);
    clearSmsMessages();

    try {
      const payload = {
        sms_enabled: smsEnabled,
        phone: phone || null,
        ippanel_sender: ippanelSender || null,
      };
      if (ippanelApiKey) {
        payload.ippanel_api_key = ippanelApiKey;
      }
      const res = await api.put('/user/ippanel-settings', payload);
      updateUserRef.current(res.data.user);
      setSmsSuccess('تنظیمات پیامک با موفقیت ذخیره شد.');
      setTimeout(() => setSmsSuccess(''), 3000);
      await fetchSmsStats();
      await fetchSmsHistory();
    } catch (err) {
      setSmsError(err.response?.data?.message || 'خطا در بروزرسانی تنظیمات پیامک');
    } finally {
      setSavingSms(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    clearPasswordMessages();
    if (newPassword !== confirmPassword) {
      setPasswordError('رمز جدید و تأیید آن یکسان نیستند.');
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('رمز جدید باید حداقل ۸ کاراکتر باشد.');
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
      setPasswordSuccess(res.data.message || 'رمز با موفقیت تغییر یافت.');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'خطا در تغییر رمز.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* User Info Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            اطلاعات کاربر
          </h2>
        </div>

        <div className="px-4 py-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 rtl-text block">نام کاربری</span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">{user?.username || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 rtl-text block">ایمیل</span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 ltr-text mt-0.5 block">{user?.email || '—'}</span>
          </div>
        </div>

        <div className="px-4 py-3">
          {!showPasswordForm ? (
            <button
              onClick={() => { setShowPasswordForm(true); clearPasswordMessages(); }}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              تغییر رمز
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md px-4">
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">رمز فعلی</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  dir="ltr"
                  style={{ unicodeBidi: 'plaintext' }}
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
                  dir="ltr"
                  style={{ unicodeBidi: 'plaintext' }}
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
                  dir="ltr"
                  style={{ unicodeBidi: 'plaintext' }}
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
                  onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); clearPasswordMessages(); }}
                  className="btn-secondary text-xs py-1.5 px-4"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}
        </div>
        {(passwordError || passwordSuccess) && (
          <div className="px-4 pb-3">
            <SectionMessage type={passwordSuccess ? 'success' : 'error'} message={passwordSuccess || passwordError} onClose={clearPasswordMessages} />
          </div>
        )}
      </div>

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
          <div className="px-4 py-3 space-y-3 max-w-md">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد خرید (٪)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={buyCommission}
                  onChange={(e) => setBuyCommission(e.target.value)}
                   className="input-field w-full text-xs py-2 text-left" dir="ltr"
                 />
               </div>
               <div>
                 <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                 <input
                   type="number"
                   inputMode="decimal"
                   value={sellCommission}
                   onChange={(e) => setSellCommission(e.target.value)}
                   className="input-field w-full text-xs py-2 text-left" dir="ltr"
                />
              </div>
            </div>
          </div>
        )}

        {portfolios.length > 0 && (
          <>
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 rtl-text">
                کارمزد اختصاصی پرتفوها
              </p>
              <p className="text-[9px] text-slate-400 rtl-text">
                در صورت فعال نبودن از تنظیمات کلی استفاده می‌شود
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-w-md">
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
                      <div className="py-3 px-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 space-y-3">
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
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد خرید (٪)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={settings.buy_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'buy_commission', e.target.value)}
                                className="input-field w-full text-xs py-2 text-left" dir="ltr"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 rtl-text block mb-1">کارمزد فروش (٪)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={settings.sell_commission}
                                onChange={(e) => updatePortfolioCommissionField(portfolio.id, 'sell_commission', e.target.value)}
                                className="input-field w-full text-xs py-2 text-left" dir="ltr"
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
      <SectionMessage type={commissionSuccess ? 'success' : 'error'} message={commissionSuccess || commissionError} onClose={clearCommissionMessages} />

      {/* SMS Settings Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            اعلان پیامکی
          </h2>
          <button
            onClick={() => setSmsEnabled(!smsEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${smsEnabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${smsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {smsEnabled && (
          <div className="px-4 py-3 space-y-3 max-w-md">
            <p className="text-[10px] text-slate-400 rtl-text">
              ارسال پیامک هنگام رسیدن قیمت به سطوح حمایت و مقاومت. برای فعال‌سازی ابتدا کلید API سایت{' '}
              <a href="https://modirpayamak.com/" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                مدیر پیامک
              </a>
              {' '}را وارد کنید.
            </p>

            <button
              type="button"
              onClick={async () => { await fetchSmsHistory(); setShowSmsModal(true); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <span className="text-xs text-slate-700 dark:text-slate-300 rtl-text">پیامک‌های امروز</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-medium">
                    {toPersianNum(smsStats.today_sent || 0)} سطح
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                    {toPersianNum(smsStats.portfolio_today_sent || 0)} پرتفو
                  </span>
                </div>
              </div>
            </button>

             <div className="rounded-lg border border-slate-100 dark:border-slate-800">
               <button
                 type="button"
                 onClick={() => setShowSmsContact(!showSmsContact)}
                 className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 rtl-text hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
               >
                 <span className="flex items-center gap-2">
                   <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSmsContact ? 'rotate-180' : ''}`} />
                   اطلاعات API
                 </span>
               </button>
               {showSmsContact && (
                 <div className="px-3 pb-3 space-y-3">
                   <div>
                     <label className="text-[10px] text-slate-400 rtl-text block mb-1">شماره موبایل</label>
                     <input
                       type="tel"
                       value={phone}
                       onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                       dir="ltr"
                       style={{ unicodeBidi: 'plaintext' }}
                       className="input-field w-full text-xs py-2 ltr-text text-left"
                       placeholder="09121234567"
                     />
                   </div>

                   <div>
                     <label className="text-[10px] text-slate-400 rtl-text block mb-1">کلید API مدیر پیامک</label>
                     <input
                       type="password"
                       value={ippanelApiKey}
                       onChange={(e) => setIppanelApiKey(e.target.value)}
                       className="input-field w-full text-xs py-2 ltr-text text-left"
                       placeholder={user?.sms_configured ? '•••••••• (قابل تغییر)' : 'کلید API را اینجا وارد کنید'}
                     />
                   </div>

                   <div>
                     <label className="text-[10px] text-slate-400 rtl-text block mb-1">شماره فرستنده</label>
                     <input
                       type="text"
                       value={ippanelSender}
                       onChange={(e) => setIppanelSender(e.target.value.replace(/\D/g, ''))}
                       dir="ltr"
                       style={{ unicodeBidi: 'plaintext' }}
                       className="input-field w-full text-xs py-2 ltr-text text-left"
                       placeholder="1000xxxx"
                     />
                   </div>
                 </div>
               )}
             </div>

            <button
              onClick={handleSaveSms}
              disabled={savingSms}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
            >
              {savingSms && <Loader2 className="w-3 h-3 animate-spin" />}
              {savingSms ? 'در حال ذخیره...' : 'ذخیره تنظیمات پیامک'}
            </button>
          </div>
        )}
      </div>
      <SectionMessage type={smsSuccess ? 'success' : 'error'} message={smsSuccess || smsError} onClose={clearSmsMessages} />

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

      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSmsModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 rtl-text">پیامک‌های امروز</h3>
              <button onClick={() => setShowSmsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {smsHistory.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 rtl-text">پیامکی امروز ارسال نشده</p>
              ) : (
                <div className="space-y-2">
                  {smsHistory.map((sms) => (
                    <div key={sms.id} className="px-3 py-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                      {sms.type === 'portfolio' ? (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                                پرتفو
                              </span>
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 rtl-text">{sms.symbol}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 ltr-text">{sms.sent_at}</span>
                          </div>
                          {sms.message && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 rtl-text leading-relaxed">{sms.message}</p>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${sms.direction === 'مقاومت' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                              {sms.level_label}
                            </span>
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 rtl-text">{sms.symbol}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 ltr-text">{toPersianNum(sms.price_at_trigger)}</span>
                            <span className="text-[10px] text-slate-400 ltr-text">{sms.sent_at}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
