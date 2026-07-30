import React, { useState, useEffect, useMemo } from 'react';
import { useUnit } from '../contexts/UnitContext';
import api from '../lib/api';
import { stockApi } from '../lib/api';
import { searchSymbolsLocal, clearSymbolCache } from '../lib/symbolCache';
import { formatPrice } from '../lib/calculations';
import { Search, RefreshCw, Plus, X } from 'lucide-react';
import { toPersianNum } from '../lib/calculations';

function formatPE(pe) {
  if (pe === null || pe === undefined || isNaN(Number(pe)) || Number(pe) === 0) return '—';
  return Number(pe).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function SafeNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function AddToPortfolioModal({ symbol, lastPrice, pe, onClose, onSuccess }) {
  const { unit } = useUnit();
  const toman = unit === 'toman';
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState('');
  const [lastPriceValue, setLastPriceValue] = useState(lastPrice ? String(toman ? SafeNumber(lastPrice) / 10 : SafeNumber(lastPrice)) : '');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [resistance1, setResistance1] = useState('');
  const [resistance2, setResistance2] = useState('');
  const [support1, setSupport1] = useState('');
  const [support2, setSupport2] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const res = await api.get('/portfolios');
      const list = res.data.data || [];
      setPortfolios(list);
      if (list.length === 1) setPortfolioId(list[0].id);
    } catch {
      setError('خطا در دریافت پرتفوها');
    } finally {
      setFetching(false);
    }
  };

  const toRial = (v) => {
    const n = Number(v);
    if (!n) return null;
    return unit === 'toman' ? n * 10 : n;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!portfolioId || !buyPrice || !quantity) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/portfolios/${portfolioId}/items`, {
        symbol,
        last_price: toRial(lastPriceValue),
        pe: pe || null,
        buy_price: toRial(buyPrice),
        quantity: Number(quantity),
        sell_price: toRial(sellPrice) || null,
        resistance_1: toRial(resistance1) || null,
        resistance_2: toRial(resistance2) || null,
        support_1: toRial(support1) || null,
        support_2: toRial(support2) || null,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در افزودن آیتم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white rtl-text">افزودن {symbol} به پرتفو</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {fetching ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Portfolio Select */}
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">پرتفو</label>
              {portfolios.length === 0 ? (
                <p className="text-xs text-danger">پرتفویی وجود ندارد</p>
              ) : (
                <select
                  value={portfolioId}
                  onChange={(e) => setPortfolioId(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  required
                >
                  <option value="">انتخاب پرتفو...</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Last Price + Buy Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">آخرین قیمت ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
                <input
                  type="number"
                  value={lastPriceValue}
                  onChange={(e) => setLastPriceValue(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">قیمت خرید ({unit === 'toman' ? 'تومان' : 'ریال'}) *</label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  required
                  min="0"
                />
              </div>
            </div>

            {/* Quantity + Sell Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">تعداد *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1 rtl-text">قیمت فروش ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="input-field w-full text-xs py-2"
                  min="0"
                />
              </div>
            </div>

            {/* Resistance */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-red-500 mb-1 rtl-text">مقاومت ۱</label>
                <input
                  type="number"
                  value={resistance1}
                  onChange={(e) => setResistance1(e.target.value)}
                  className="input-field w-full text-xs py-2 border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400"
                  placeholder="مقاومت ۱"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-red-500 mb-1 rtl-text">مقاومت ۲</label>
                <input
                  type="number"
                  value={resistance2}
                  onChange={(e) => setResistance2(e.target.value)}
                  className="input-field w-full text-xs py-2 border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400"
                  placeholder="مقاومت ۲"
                  min="0"
                />
              </div>
            </div>

            {/* Support */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-green-500 mb-1 rtl-text">حمایت ۱</label>
                <input
                  type="number"
                  value={support1}
                  onChange={(e) => setSupport1(e.target.value)}
                  className="input-field w-full text-xs py-2 border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400"
                  placeholder="حمایت ۱"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-green-500 mb-1 rtl-text">حمایت ۲</label>
                <input
                  type="number"
                  value={support2}
                  onChange={(e) => setSupport2(e.target.value)}
                  className="input-field w-full text-xs py-2 border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400"
                  placeholder="حمایت ۲"
                  min="0"
                />
              </div>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={onClose} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
              <button type="submit" disabled={loading || !portfolioId || !buyPrice || !quantity} className="btn-primary text-xs py-1.5 px-3">
                {loading ? 'در حال پردازش...' : 'افزودن'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AllSymbols() {
  const { unit } = useUnit();
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [addToModal, setAddToModal] = useState(null);

  useEffect(() => {
    fetchSymbols();
  }, []);

  const fetchSymbols = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) clearSymbolCache();
      const data = await searchSymbolsLocal('');
      setSymbols(data);
    } catch (err) {
      setError('خطا در دریافت نمادها');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortLabel = (key, label) => {
    if (sortConfig.key !== key) return label;
    return `${label} ${sortConfig.direction === 'asc' ? '▲' : '▼'}`;
  };

  const filtered = useMemo(() => {
    let list = symbols;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s.isin && s.isin.toLowerCase().includes(q))
      );
    }
    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'name') {
          aVal = a.name || '';
          bVal = b.name || '';
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, 'fa') : bVal.localeCompare(aVal, 'fa');
        }
        if (sortConfig.key === 'fullName') {
          aVal = a.fullName || '';
          bVal = b.fullName || '';
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, 'fa') : bVal.localeCompare(aVal, 'fa');
        }
        aVal = SafeNumber(a[sortConfig.key]);
        bVal = SafeNumber(b[sortConfig.key]);
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [symbols, search, sortConfig]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-1/3" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button onClick={() => fetchSymbols(true)} className="btn-primary text-xs px-4 py-2">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">همه نمادها</h1>
        <button
          onClick={() => fetchSymbols(true)}
          disabled={loading}
          className="p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
          title="بروزرسانی"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="جستجوی نماد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pr-9 pl-3 py-2 text-xs"
        />
      </div>

      <div className="text-[10px] text-slate-400 px-1">
        {toPersianNum(filtered.length)} نماد
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <th onClick={() => toggleSort('name')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('name', 'نماد')}
              </th>
              <th onClick={() => toggleSort('fullName')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('fullName', 'نام کامل')}
              </th>
              <th onClick={() => toggleSort('pl')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('pl', 'آخرین')}
              </th>
              <th onClick={() => toggleSort('pe')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('pe', 'P/E')}
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-400 text-xs">
                  نمادی یافت نشد
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.isin || s.name} className="border-b border-slate-50/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {s.name}
                </td>
                <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[200px] truncate">
                  {s.fullName}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {s.pl ? formatPrice(s.pl, unit, 2) : '—'}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {formatPE(s.pe)}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setAddToModal(s)}
                    className="p-1 rounded-lg hover:bg-brand-500/10 transition-colors"
                    title="افزودن به پرتفو"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addToModal && (
        <AddToPortfolioModal
          symbol={addToModal.name}
          lastPrice={addToModal.pl}
          pe={addToModal.pe}
          onClose={() => setAddToModal(null)}
          onSuccess={() => {
            setAddToModal(null);
          }}
        />
      )}
    </div>
  );
}
