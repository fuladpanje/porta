import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { formatPrice, formatNumber, toPersianNum } from '../lib/calculations';

export default function AddPurchaseModal({ item, portfolioId, unit = 'rial', onClose, onSave }) {
  const [currentItem, setCurrentItem] = useState(item);
  const [addedQty, setAddedQty] = useState('');
  const [addedPrice, setAddedPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmTxId, setConfirmTxId] = useState(null);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  const unitLabel = unit === 'toman' ? 'تومان' : 'ریال';
  const stripCommas = (v) => v.replace(/[,،]/g, '');

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await api.get(`/portfolios/${portfolioId}/items/${currentItem.id}/transactions`);
      setTransactions(res.data.data || []);
    } catch {}
    setLoadingTx(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [portfolioId, currentItem.id]);

  // همگام‌سازی currentItem بعد از حذف/افزایش برای نمایش صحیح هدر و پیش‌نمایش
  const refreshCurrentItem = async () => {
    try {
      const res = await api.get(`/portfolios/${portfolioId}/items/${currentItem.id}`);
      if (res.data?.data) setCurrentItem(res.data.data);
    } catch {}
  };

  const handleDeleteTx = async (txId) => {
    setDeletingId(txId);
    setError('');
    try {
      const res = await api.delete(`/portfolios/${portfolioId}/items/${currentItem.id}/transactions/${txId}`);
      if (res.data?.data) setCurrentItem(res.data.data);
      await fetchTransactions();
      if (!res.data?.data) await refreshCurrentItem();
      // به‌روزرسانی داشبورد / جزئیات بدون بستن مودال
      onSave && onSave(true); // true = keep modal open
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در حذف تراکنش');
    } finally {
      setDeletingId(null);
    }
  };

  const oldQty = Number(currentItem.quantity) || 0;
  const oldPrice = Number(currentItem.buy_price) || 0;
  const addQtyNum = Number(stripCommas(String(addedQty))) || 0;
  const addPriceNum = Number(stripCommas(String(addedPrice))) || 0;

  // قیمت‌ها در بک‌اند همیشه ریال هستند؛ نمایش با unit
  const displayOldPrice = unit === 'toman' ? oldPrice / 10 : oldPrice;
  const displayAddPrice = addPriceNum; // کاربر به تومان/ریال وارد می‌کند

  let newQty = oldQty;
  let newAvg = oldPrice;
  let previewValid = false;
  if (addQtyNum > 0 && addPriceNum > 0) {
    const addPriceRial = unit === 'toman' ? addPriceNum * 10 : addPriceNum;
    newQty = oldQty + addQtyNum;
    newAvg = (oldQty * oldPrice + addQtyNum * addPriceRial) / newQty;
    previewValid = true;
  }
  const displayNewAvg = unit === 'toman' ? newAvg / 10 : newAvg;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!addQtyNum || addQtyNum <= 0) {
      setError('تعداد باید بزرگتر از صفر باشد');
      return;
    }
    if (!addPriceNum || addPriceNum <= 0) {
      setError('قیمت خرید باید بزرگتر از صفر باشد');
      return;
    }
    setLoading(true);
    try {
      const toman = unit === 'toman';
      const payload = {
        added_quantity: addQtyNum,
        added_price: toman ? addPriceNum * 10 : addPriceNum,
      };
      const res = await api.post(`/portfolios/${portfolioId}/items/${currentItem.id}/add-purchase`, payload);
      if (res.data?.data) setCurrentItem(res.data.data);
      setAddedQty('');
      setAddedPrice('');
      await fetchTransactions();
      onSave && onSave(true);
    } catch (err) {
      // فال‌بک برای هاست‌های با Response خالی یا خطای تراکنش: محاسبه محلی و PUT مستقیم
      const status = err.response?.status;
      const isEmptyResponse = !err.response?.data || (typeof err.response.data === 'string' && err.response.data.trim() === '');
      console.error('addPurchase error', err.response?.status, err.response?.data);
      if (status === 500 || isEmptyResponse || err.response?.data?.message?.includes('addPurchase')) {
        try {
          const toman = unit === 'toman';
          const addPriceRial = toman ? addPriceNum * 10 : addPriceNum;
          const fallbackQty = oldQty + addQtyNum;
          const fallbackAvg = Math.round((oldQty * oldPrice + addQtyNum * addPriceRial) / fallbackQty);
          const putRes = await api.put(`/portfolios/${portfolioId}/items/${currentItem.id}`, {
            quantity: fallbackQty,
            buy_price: fallbackAvg,
            added_quantity: addQtyNum,
            added_price: addPriceRial,
          });
          if (putRes.data?.data) setCurrentItem(putRes.data.data);
          setAddedQty('');
          setAddedPrice('');
          await fetchTransactions();
          onSave && onSave(true);
          return;
        } catch (fallbackErr) {
          console.error('fallback PUT failed', fallbackErr.response?.data);
        }
      }
      const msg = err.response?.data?.message || err.response?.data?.error || (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      setError(msg || 'خطا در افزایش موجودی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">افزایش موجودی</h3>
              <p className="text-xs text-slate-400">{currentItem.symbol} — فعلی: {toPersianNum(oldQty)} × {Math.round(Number(displayOldPrice)).toLocaleString('fa-IR')} {unitLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && (
            <div className="bg-danger/10 text-danger text-xs px-3 py-2 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">تعداد جدید *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addedQty}
                  onChange={(e) => setAddedQty(stripCommas(e.target.value))}
                  placeholder="مثلاً 500"
                  className="input-field w-full text-xs py-2 text-left"
                  dir="ltr"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">قیمت خرید جدید ({unitLabel}) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addedPrice}
                  onChange={(e) => setAddedPrice(stripCommas(e.target.value))}
                  placeholder={unit === 'toman' ? 'مثلاً 1500' : 'مثلاً 15000'}
                  className="input-field w-full text-xs py-2 text-left"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* پیش‌نمایش میانگین - تفکیک تعدادها */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-brand-500" /> پیش‌نمایش
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400">تعداد فعلی</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{toPersianNum(oldQty)}</p>
                </div>
                <div className={`rounded-lg p-3 border ${previewValid ? 'bg-brand-500/10 border-brand-200 dark:border-brand-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                  <p className="text-[10px] text-slate-400">تعداد کل</p>
                  <p className={`text-sm font-bold mt-1 ${previewValid ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
                    {previewValid ? toPersianNum(newQty) : '—'}
                  </p>
                </div>
              </div>
              <div className={`rounded-lg p-3 border text-center ${previewValid ? 'bg-success/10 border-success/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                <p className="text-[10px] text-slate-400">میانگین جدید</p>
                <p className={`text-base font-bold mt-1 ${previewValid ? 'text-success' : 'text-slate-400'}`}>
                  {previewValid ? `${Math.round(displayNewAvg).toLocaleString('fa-IR')} ${unitLabel}` : '—'}
                </p>
              </div>
              {previewValid && (
                <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">ارزش کل قبل</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(oldQty * displayOldPrice).toLocaleString('fa-IR')} {unitLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">ارزش کل بعد</span>
                    <span className="font-bold text-success">{Math.round(newQty * displayNewAvg).toLocaleString('fa-IR')} {unitLabel}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary text-xs py-1.5 px-3">
                انصراف
              </button>
              <button type="submit" disabled={loading || !previewValid} className="flex-1 btn-primary text-xs py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                {loading ? 'در حال ثبت...' : <><Plus className="w-3 h-3" /> افزایش</>}
              </button>
            </div>
          </form>

          {/* تاریخچه - نمایش تفکیک شده تعداد و قیمت */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">تاریخچه خریدها</h4>
            {loadingTx ? (
              <p className="text-xs text-slate-400">در حال بارگذاری...</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-slate-400">هنوز تاریخچه‌ای ثبت نشده</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transactions.map((tx) => {
                  const displayPrice = Math.round(Number(unit === 'toman' ? tx.price / 10 : tx.price)).toLocaleString('fa-IR');
                  const displayAvg = Math.round(Number(unit === 'toman' ? tx.resulting_avg_price / 10 : tx.resulting_avg_price)).toLocaleString('fa-IR');
                  return (
                    <div key={tx.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{new Date(tx.created_at).toLocaleDateString('fa-IR')}</span>
                          <span className="opacity-50">•</span>
                          <span>{new Date(tx.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <button
                          onClick={() => setConfirmTxId(tx.id)}
                          disabled={!!deletingId}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-danger hover:border-danger hover:text-white text-slate-400 hover:text-white transition-colors shrink-0"
                          title="حذف این تراکنش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs">
                          <span className="text-[10px] text-slate-400">تعداد</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{toPersianNum(Number(tx.quantity))}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs">
                          <span className="text-[10px] text-slate-400">قیمت</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{displayPrice} {unitLabel}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-md px-2.5 py-1 text-xs">
                          <span className="text-[10px] text-success/70">میانگین</span>
                          <span className="font-medium text-success">{displayAvg} {unitLabel}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {confirmTxId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmTxId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">حذف تراکنش</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">آیا از حذف این تراکنش مطمئن هستید؟ موجودی و میانگین دوباره محاسبه می‌شود.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setConfirmTxId(null)} disabled={!!deletingId} className="btn-secondary text-xs py-1.5 px-4">انصراف</button>
              <button
                onClick={() => {
                  const id = confirmTxId;
                  setConfirmTxId(null);
                  handleDeleteTx(id);
                }}
                disabled={!!deletingId}
                className="bg-danger hover:bg-danger/90 text-white text-xs py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {deletingId ? 'در حال حذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
