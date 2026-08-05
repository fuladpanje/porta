import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Check, X, Loader2, AlertCircle, Percent, Globe, Mail, User, Tag, FolderOpen, ChevronDown, Lock, Shield, MessageSquare, Send, BarChart3 } from 'lucide-react';
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
  const [smsCooldown, setSmsCooldown] = useState(60);
  const [smsStartTime, setSmsStartTime] = useState('');
  const [smsEndTime, setSmsEndTime] = useState('');
  const [smsStats, setSmsStats] = useState({ total_sent: 0, today_sent: 0 });
  
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
      setSmsCooldown(userData.sms_cooldown_minutes || 60);
      setSmsStartTime(normalizeTimeForInput(userData.sms_start_time));
      setSmsEndTime(normalizeTimeForInput(userData.sms_end_time));
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
  }, [fetchUser, fetchPortfolios, fetchSmsStats]);

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

    if ((smsStartTime && !smsEndTime) || (!smsStartTime && smsEndTime)) {
      setSmsError('برای بازه زمانی ارسال، هر دو ساعت شروع و پایان را وارد کنید.');
      setSavingSms(false);
      return;
    }

    try {
      const payload = {
        sms_enabled: smsEnabled,
        phone: phone || null,
        ippanel_sender: ippanelSender || null,
        sms_cooldown_minutes: parseInt(smsCooldown) || 60,
        sms_start_time: smsStartTime || null,
        sms_end_time: smsEndTime || null,
      };
      if (ippanelApiKey) {
        payload.ippanel_api_key = ippanelApiKey;
      }
      const res = await api.put('/user/ippanel-settings', payload);
      updateUserRef.current(res.data.user);
      setSmsSuccess('تنظیمات پیامک با موفقیت ذخیره شد.');
      setTimeout(() => setSmsSuccess(''), 3000);
      await fetchSmsStats();
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

        <div className="py-3">
          {!showPasswordForm ? (
            <button
              onClick={() => { setShowPasswordForm(true); clearPasswordMessages(); }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
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
                      <div className="py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 space-y-3">
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
                          <div className="max-w-md space-y-3 px-4">
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

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 rtl-text">
                  <Send className="w-3.5 h-3.5 text-brand-500" />
                  امروز
                </div>
                <div className="mt-1 flex items-baseline gap-1 rtl-text">
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">{toPersianNum(smsStats.today_sent || 0)}</span>
                  <span className="text-[10px] text-slate-400">پیامک</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 rtl-text">
                  <BarChart3 className="w-3.5 h-3.5 text-brand-500" />
                  کل ارسال
                </div>
                <div className="mt-1 flex items-baseline gap-1 rtl-text">
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">{toPersianNum(smsStats.total_sent || 0)}</span>
                  <span className="text-[10px] text-slate-400">پیامک</span>
                </div>
              </div>
            </div>

             <div>
               <label className="text-[10px] text-slate-400 rtl-text block mb-1">شماره موبایل</label>
               <input
                 type="tel"
                 value={phone}
                 onChange={(e) => setPhone(e.target.value)}
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
                 onChange={(e) => setIppanelSender(e.target.value)}
                 dir="ltr"
                 style={{ unicodeBidi: 'plaintext' }}
                 className="input-field w-full text-xs py-2 ltr-text text-left"
                 placeholder="1000xxxx"
               />
             </div>

             <div>
               <label className="text-[10px] text-slate-400 rtl-text block mb-1">حداقل فاصله ارسال (دقیقه)</label>
               <input
                 type="number"
                 min="1"
                 max="1440"
                 value={smsCooldown}
                 onChange={(e) => setSmsCooldown(e.target.value)}
                 className="input-field w-full text-xs py-2 text-left"
               />
               <p className="text-[9px] text-slate-400 mt-1 rtl-text">
                 اگر قیمت چند بار به یک سطح برسد، پیامک فقط یکبار در این بازه ارسال می‌شود.
               </p>
             </div>

             <div className="space-y-2">
               <p className="text-[10px] text-slate-400 rtl-text">بازه زمانی ارسال (اختیاری)</p>
               <div className="space-y-2">
                 <div>
                   <label className="text-[10px] text-slate-500 rtl-text block mb-1">از ساعت</label>
                   <input
                     type="time"
                     value={smsStartTime}
                     onChange={(e) => setSmsStartTime(e.target.value)}
                     className="input-field time-field w-full text-xs py-2"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] text-slate-500 rtl-text block mb-1">تا ساعت</label>
                   <input
                     type="time"
                     value={smsEndTime}
                     onChange={(e) => setSmsEndTime(e.target.value)}
                     className="input-field time-field w-full text-xs py-2"
                   />
                 </div>
               </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setSmsStartTime('08:45'); setSmsEndTime('12:30'); }}
                  className={`text-[10px] px-3 py-1.5 rounded-lg rtl-text transition-colors ${smsStartTime === '08:45' && smsEndTime === '12:30' ? 'bg-brand-500/20 text-brand-500 border border-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  ۸:۴۵ — ۱۲:۳۰
                </button>
                <button
                  type="button"
                  onClick={() => { setSmsStartTime('08:45'); setSmsEndTime('17:00'); }}
                  className={`text-[10px] px-3 py-1.5 rounded-lg rtl-text transition-colors ${smsStartTime === '08:45' && smsEndTime === '17:00' ? 'bg-brand-500/20 text-brand-500 border border-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  ۸:۴۵ — ۱۷:۰۰
                </button>
                {(smsStartTime || smsEndTime) && (
                  <button
                    type="button"
                    onClick={() => { setSmsStartTime(''); setSmsEndTime(''); }}
                    className="text-[10px] px-3 py-1.5 rounded-lg rtl-text bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                  >
                    حذف بازه
                  </button>
                )}
              </div>
              <p className="text-[9px] text-slate-400 rtl-text">
                خارج از این بازه، حتی در صورت عبور قیمت از سطح، پیامکی ارسال نمی‌شود.
              </p>
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
    </div>
  );
}
