import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUnit } from '../contexts/UnitContext';
import api, { favoritesApi } from '../lib/api';
import { stockApi } from '../lib/api';
import { searchSymbolsLocal, clearSymbolCache } from '../lib/symbolCache';
import { formatPrice, formatPercent } from '../lib/calculations';
import { Search, Plus, X, Trash2, Star } from 'lucide-react';
import { toPersianNum } from '../lib/calculations';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeoutRef.current);
  }, [value, delay]);

  return debounced;
}

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
  const [hideNegativePE, setHideNegativePE] = useState(false);
  const [peMode, setPeMode] = useState('single');
  const [peSign, setPeSign] = useState(null);
  const [peMin, setPeMin] = useState('');
  const [peMax, setPeMax] = useState('');
  const [peOp, setPeOp] = useState('lt');
  const [peVal, setPeVal] = useState('');
  const debouncedPeMin = useDebounce(peMin, 300);
  const debouncedPeMax = useDebounce(peMax, 300);
  const debouncedPeVal = useDebounce(peVal, 300);
  const [plMode, setPlMode] = useState('single');
  const [plSign, setPlSign] = useState(null);
  const [plMin, setPlMin] = useState('');
  const [plMax, setPlMax] = useState('');
  const [plOp, setPlOp] = useState('lt');
  const [plVal, setPlVal] = useState('');
  const debouncedPlMin = useDebounce(plMin, 300);
  const debouncedPlMax = useDebounce(plMax, 300);
  const debouncedPlVal = useDebounce(plVal, 300);
  const [plpMode, setPlpMode] = useState('single');
  const [plpSign, setPlpSign] = useState(null);
  const [plpMin, setPlpMin] = useState('');
  const [plpMax, setPlpMax] = useState('');
  const [plpOp, setPlpOp] = useState('lt');
  const [plpVal, setPlpVal] = useState('');
  const debouncedPlpMin = useDebounce(plpMin, 300);
  const debouncedPlpMax = useDebounce(plpMax, 300);
  const debouncedPlpVal = useDebounce(plpVal, 300);
  const [pcpMode, setPcpMode] = useState('single');
  const [pcpSign, setPcpSign] = useState(null);
  const [pcpMin, setPcpMin] = useState('');
  const [pcpMax, setPcpMax] = useState('');
  const [pcpOp, setPcpOp] = useState('lt');
  const [pcpVal, setPcpVal] = useState('');
  const debouncedPcpMin = useDebounce(pcpMin, 300);
  const debouncedPcpMax = useDebounce(pcpMax, 300);
  const debouncedPcpVal = useDebounce(pcpVal, 300);
  const [diffMode, setDiffMode] = useState('single');
  const [diffSign, setDiffSign] = useState(null);
  const [diffMin, setDiffMin] = useState('');
  const [diffMax, setDiffMax] = useState('');
  const [diffOp, setDiffOp] = useState('lt');
  const [diffVal, setDiffVal] = useState('');
  const debouncedDiffMin = useDebounce(diffMin, 300);
  const debouncedDiffMax = useDebounce(diffMax, 300);
  const debouncedDiffVal = useDebounce(diffVal, 300);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => {
    try { return localStorage.getItem('porta_favorites_only') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('porta_favorites_only', showFavoritesOnly); } catch {}
  }, [showFavoritesOnly]);

  useEffect(() => {
    fetchSymbols();
    fetchFavorites();
  }, []);

  useEffect(() => {
    const handler = () => fetchSymbols(true);
    window.addEventListener('prices-refreshed', handler);
    return () => window.removeEventListener('prices-refreshed', handler);
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

  const fetchFavorites = async () => {
    try {
      const res = await favoritesApi.get();
      setFavorites(res.data.data || []);
    } catch {
      // silent
    }
  };

  const toggleFavorite = async (symbol) => {
    try {
      const res = await favoritesApi.toggle(symbol);
      const isFav = res.data.data.favorited;
      setFavorites((prev) => isFav ? [...prev, symbol] : prev.filter((s) => s !== symbol));
    } catch {
      // silent
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

  function filterByOp(list, key, op, val) {
  if (val === '') return list;
  const v = Number(val);
  if (isNaN(v)) return list;
  return list.filter((s) => {
    const itemVal = Number(s[key]);
    if (isNaN(itemVal)) return false;
    switch (op) {
      case 'lt': return itemVal < v;
      case 'lte': return itemVal <= v;
      case 'eq': return itemVal === v;
      case 'gte': return itemVal >= v;
      case 'gt': return itemVal > v;
      default: return true;
    }
  });
}

function filterByDiffOp(list, op, val) {
  if (val === '') return list;
  const v = Number(val);
  if (isNaN(v)) return list;
  return list.filter((s) => {
    const diff = SafeNumber(s.plp) - SafeNumber(s.pcp);
    switch (op) {
      case 'lt': return diff < v;
      case 'lte': return diff <= v;
      case 'eq': return diff === v;
      case 'gte': return diff >= v;
      case 'gt': return diff > v;
      default: return true;
    }
  });
}

function filterBySafeNumOp(list, key, op, val) {
  if (val === '') return list;
  const v = Number(val);
  if (isNaN(v)) return list;
  return list.filter((s) => {
    const itemVal = SafeNumber(s[key]);
    switch (op) {
      case 'lt': return itemVal < v;
      case 'lte': return itemVal <= v;
      case 'eq': return itemVal === v;
      case 'gte': return itemVal >= v;
      case 'gt': return itemVal > v;
      default: return true;
    }
  });
}

function filterByDiffOp(list, op, val) {
  if (val === '') return list;
  const v = Number(val);
  if (isNaN(v)) return list;
  return list.filter((s) => {
    const diff = SafeNumber(s.plp) - SafeNumber(s.pcp);
    switch (op) {
      case 'lt': return diff < v;
      case 'lte': return diff <= v;
      case 'eq': return diff === v;
      case 'gte': return diff >= v;
      case 'gt': return diff > v;
      default: return true;
    }
  });
}

function filterBySafeNumOp(list, key, op, val) {
  if (val === '') return list;
  const v = Number(val);
  if (isNaN(v)) return list;
  return list.filter((s) => {
    const itemVal = SafeNumber(s[key]);
    switch (op) {
      case 'lt': return itemVal < v;
      case 'lte': return itemVal <= v;
      case 'eq': return itemVal === v;
      case 'gte': return itemVal >= v;
      case 'gt': return itemVal > v;
      default: return true;
    }
  });
}

function signFilter(list, key, sign) {
  if (!sign) return list;
  return list.filter((s) => {
    const v = key === 'diff' ? SafeNumber(s.plp) - SafeNumber(s.pcp) : SafeNumber(s[key]);
    if (sign === 'pos') return v > 0;
    if (sign === 'neg') return v < 0;
    return true;
  });
}

const filtered = useMemo(() => {
  let list = symbols;
  if (showFavoritesOnly) {
    list = list.filter((s) => favorites.includes(s.name));
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.isin && s.isin.toLowerCase().includes(q))
    );
    list = [...list].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      const aFull = (a.fullName || '').toLowerCase();
      const bFull = (b.fullName || '').toLowerCase();
      const aFullStarts = aFull.startsWith(q);
      const bFullStarts = bFull.startsWith(q);
      if (aFullStarts && !bFullStarts) return -1;
      if (!aFullStarts && bFullStarts) return 1;
      return aName.localeCompare(bName, 'fa');
    });
  }
  if (hideNegativePE) {
    list = list.filter((s) => {
      const peVal = Number(s.pe);
      return !isNaN(peVal) && peVal > 0;
    });
  }
  if (peMode === 'between') {
    if (debouncedPeMin !== '' || debouncedPeMax !== '') {
      const min = debouncedPeMin !== '' ? Number(debouncedPeMin) : -Infinity;
      const max = debouncedPeMax !== '' ? Number(debouncedPeMax) : Infinity;
      list = list.filter((s) => {
        const v = Number(s.pe);
        if (isNaN(v)) return false;
        return v >= min && v <= max;
      });
    }
  } else {
    list = filterByOp(list, 'pe', peOp, debouncedPeVal);
  }
  list = signFilter(list, 'pe', peSign);
  if (plMode === 'between') {
    if (debouncedPlMin !== '' || debouncedPlMax !== '') {
      const min = debouncedPlMin !== '' ? Number(debouncedPlMin) : -Infinity;
      const max = debouncedPlMax !== '' ? Number(debouncedPlMax) : Infinity;
      list = list.filter((s) => {
        const v = SafeNumber(s.pl);
        return v >= min && v <= max;
      });
    }
  } else {
    list = filterBySafeNumOp(list, 'pl', plOp, debouncedPlVal);
  }
  list = signFilter(list, 'pl', plSign);
  if (plpMode === 'between') {
    if (debouncedPlpMin !== '' || debouncedPlpMax !== '') {
      const min = debouncedPlpMin !== '' ? Number(debouncedPlpMin) : -Infinity;
      const max = debouncedPlpMax !== '' ? Number(debouncedPlpMax) : Infinity;
      list = list.filter((s) => {
        const v = Number(s.plp);
        if (isNaN(v)) return false;
        return v >= min && v <= max;
      });
    }
  } else {
    list = filterByOp(list, 'plp', plpOp, debouncedPlpVal);
  }
  list = signFilter(list, 'plp', plpSign);
  if (pcpMode === 'between') {
    if (debouncedPcpMin !== '' || debouncedPcpMax !== '') {
      const min = debouncedPcpMin !== '' ? Number(debouncedPcpMin) : -Infinity;
      const max = debouncedPcpMax !== '' ? Number(debouncedPcpMax) : Infinity;
      list = list.filter((s) => {
        const v = Number(s.pcp);
        if (isNaN(v)) return false;
        return v >= min && v <= max;
      });
    }
  } else {
    list = filterByOp(list, 'pcp', pcpOp, debouncedPcpVal);
  }
  list = signFilter(list, 'pcp', pcpSign);
  if (diffMode === 'between') {
    if (debouncedDiffMin !== '' || debouncedDiffMax !== '') {
      const min = debouncedDiffMin !== '' ? Number(debouncedDiffMin) : -Infinity;
      const max = debouncedDiffMax !== '' ? Number(debouncedDiffMax) : Infinity;
      list = list.filter((s) => {
        const v = SafeNumber(s.plp) - SafeNumber(s.pcp);
        return v >= min && v <= max;
      });
    }
  } else {
    list = filterByDiffOp(list, diffOp, debouncedDiffVal);
  }
  list = signFilter(list, 'diff', diffSign);
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
      if (sortConfig.key === 'cs') {
        aVal = a.cs || '';
        bVal = b.cs || '';
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal, 'fa') : bVal.localeCompare(aVal, 'fa');
      }
      if (sortConfig.key === 'diff') {
        const aDiff = SafeNumber(a.plp) - SafeNumber(a.pcp);
        const bDiff = SafeNumber(b.plp) - SafeNumber(b.pcp);
        return sortConfig.direction === 'asc' ? aDiff - bDiff : bDiff - aDiff;
      }
      aVal = SafeNumber(a[sortConfig.key]);
      bVal = SafeNumber(b[sortConfig.key]);
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  return list;
}, [symbols, search, sortConfig, showFavoritesOnly, favorites, hideNegativePE, peMode, peSign, debouncedPeMin, debouncedPeMax, peOp, debouncedPeVal, plMode, plSign, debouncedPlMin, debouncedPlMax, plOp, debouncedPlVal, plpMode, plpSign, debouncedPlpMin, debouncedPlpMax, plpOp, debouncedPlpVal, pcpMode, pcpSign, debouncedPcpMin, debouncedPcpMax, pcpOp, debouncedPcpVal, diffMode, diffSign, debouncedDiffMin, debouncedDiffMax, diffOp, debouncedDiffVal]);

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
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
          placeholder="جستجوی نماد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full pr-9 pl-3 py-2 text-xs"
        />
        </div>
        <button
          type="button"
          onClick={() => setShowFavoritesOnly((p) => !p)}
          className={`p-2 rounded-lg shrink-0 transition-colors ${showFavoritesOnly ? 'text-yellow-500 bg-yellow-500/10' : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/10'}`}
          title={showFavoritesOnly ? 'نمایش همه' : 'فقط نمادهای ستاره‌دار'}
        >
          <Star className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
            <span className="text-slate-400 rtl-text font-medium w-36 shrink-0">P/E:</span>
            <div className="flex items-center gap-2 shrink-0">
            {peMode === 'between' ? (
              <>
                <input type="number" placeholder="حداقل" value={peMin} onChange={(e) => setPeMin(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
                <span className="text-slate-400 shrink-0">—</span>
                <input type="number" placeholder="حداکثر" value={peMax} onChange={(e) => setPeMax(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            ) : (
              <>
                <button type="button" onClick={() => { const ops = ['lt','lte','eq','gte','gt']; setPeOp(ops[(ops.indexOf(peOp) + 1) % ops.length]); }} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0 whitespace-nowrap w-[8rem] text-center overflow-hidden">
                  {peOp === 'lt' ? 'کمتر از' : peOp === 'lte' ? 'کمتر یا مساوی' : peOp === 'eq' ? 'مساوی' : peOp === 'gte' ? 'بیشتر یا مساوی' : 'بیشتر از'}
                </button>
                <input type="number" placeholder="مقدار" value={peVal} onChange={(e) => setPeVal(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            )}
            </div>
            <button type="button" onClick={() => { setPeMode(peMode === 'between' ? 'single' : 'between'); }} className="px-2 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors shrink-0 w-14">
              {peMode === 'between' ? 'بازه' : 'مقدار'}
            </button>
            <span className="inline-flex rounded-md shrink-0">
              <button type="button" onClick={() => setPeSign(peSign === null ? 'pos' : null)} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-r-md border transition-colors ${peSign === null ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>همه</button>
              <button type="button" onClick={() => setPeSign(peSign === 'pos' ? null : 'pos')} className={`px-2 py-1 text-xs font-medium w-10 text-center border-y transition-colors ${peSign === 'pos' ? 'bg-green-500/20 text-green-600 border-green-300 dark:border-green-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>مثبت</button>
              <button type="button" onClick={() => setPeSign(peSign === 'neg' ? null : 'neg')} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-l-md border transition-colors ${peSign === 'neg' ? 'bg-red-500/20 text-red-600 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>منفی</button>
            </span>
            <button type="button" onClick={() => { setPeMode('single'); setPeSign(null); setPeMin(''); setPeMax(''); setPeOp('lt'); setPeVal(''); }} className="mr-auto py-1 px-0.5 rounded text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
            <span className="text-slate-400 rtl-text font-medium w-36 shrink-0">آخرین قیمت ({unit === 'toman' ? 'تومان' : 'ریال'}):</span>
            <div className="flex items-center gap-2 shrink-0">
            {plMode === 'between' ? (
              <>
                <input type="number" placeholder="حداقل" value={plMin} onChange={(e) => setPlMin(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
                <span className="text-slate-400 shrink-0">—</span>
                <input type="number" placeholder="حداکثر" value={plMax} onChange={(e) => setPlMax(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            ) : (
              <>
                <button type="button" onClick={() => { const ops = ['lt','lte','eq','gte','gt']; setPlOp(ops[(ops.indexOf(plOp) + 1) % ops.length]); }} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0 whitespace-nowrap w-[8rem] text-center overflow-hidden">
                  {plOp === 'lt' ? 'کمتر از' : plOp === 'lte' ? 'کمتر یا مساوی' : plOp === 'eq' ? 'مساوی' : plOp === 'gte' ? 'بیشتر یا مساوی' : 'بیشتر از'}
                </button>
                <input type="number" placeholder="مقدار" value={plVal} onChange={(e) => setPlVal(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            )}
            </div>
            <button type="button" onClick={() => setPlMode(plMode === 'between' ? 'single' : 'between')} className="px-2 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors shrink-0 w-14">
              {plMode === 'between' ? 'بازه' : 'مقدار'}
            </button>
            <div className="w-[120px] shrink-0"></div>
            <button type="button" onClick={() => { setPlMode('single'); setPlSign(null); setPlMin(''); setPlMax(''); setPlOp('lt'); setPlVal(''); }} className="mr-auto py-1 px-0.5 rounded text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
            <span className="text-slate-400 rtl-text font-medium w-36 shrink-0">تغییر آخرین:</span>
            <div className="flex items-center gap-2 shrink-0">
            {plpMode === 'between' ? (
              <>
                <input type="number" placeholder="حداقل" value={plpMin} onChange={(e) => setPlpMin(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
                <span className="text-slate-400 shrink-0">—</span>
                <input type="number" placeholder="حداکثر" value={plpMax} onChange={(e) => setPlpMax(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            ) : (
              <>
                <button type="button" onClick={() => { const ops = ['lt','lte','eq','gte','gt']; setPlpOp(ops[(ops.indexOf(plpOp) + 1) % ops.length]); }} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0 whitespace-nowrap w-[8rem] text-center overflow-hidden">
                  {plpOp === 'lt' ? 'کمتر از' : plpOp === 'lte' ? 'کمتر یا مساوی' : plpOp === 'eq' ? 'مساوی' : plpOp === 'gte' ? 'بیشتر یا مساوی' : 'بیشتر از'}
                </button>
                <input type="number" placeholder="مقدار" value={plpVal} onChange={(e) => setPlpVal(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            )}
            </div>
            <button type="button" onClick={() => setPlpMode(plpMode === 'between' ? 'single' : 'between')} className="px-2 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors shrink-0 w-14">
              {plpMode === 'between' ? 'بازه' : 'مقدار'}
            </button>
            <span className="inline-flex rounded-md shrink-0">
              <button type="button" onClick={() => setPlpSign(plpSign === null ? 'pos' : null)} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-r-md border transition-colors ${plpSign === null ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>همه</button>
              <button type="button" onClick={() => setPlpSign(plpSign === 'pos' ? null : 'pos')} className={`px-2 py-1 text-xs font-medium w-10 text-center border-y transition-colors ${plpSign === 'pos' ? 'bg-green-500/20 text-green-600 border-green-300 dark:border-green-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>مثبت</button>
              <button type="button" onClick={() => setPlpSign(plpSign === 'neg' ? null : 'neg')} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-l-md border transition-colors ${plpSign === 'neg' ? 'bg-red-500/20 text-red-600 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>منفی</button>
            </span>
            <button type="button" onClick={() => { setPlpMode('single'); setPlpSign(null); setPlpMin(''); setPlpMax(''); setPlpOp('lt'); setPlpVal(''); }} className="mr-auto py-1 px-0.5 rounded text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
            <span className="text-slate-400 rtl-text font-medium w-36 shrink-0">تغییر پایانی:</span>
            <div className="flex items-center gap-2 shrink-0">
            {pcpMode === 'between' ? (
              <>
                <input type="number" placeholder="حداقل" value={pcpMin} onChange={(e) => setPcpMin(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
                <span className="text-slate-400 shrink-0">—</span>
                <input type="number" placeholder="حداکثر" value={pcpMax} onChange={(e) => setPcpMax(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            ) : (
              <>
                <button type="button" onClick={() => { const ops = ['lt','lte','eq','gte','gt']; setPcpOp(ops[(ops.indexOf(pcpOp) + 1) % ops.length]); }} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0 whitespace-nowrap w-[8rem] text-center overflow-hidden">
                  {pcpOp === 'lt' ? 'کمتر از' : pcpOp === 'lte' ? 'کمتر یا مساوی' : pcpOp === 'eq' ? 'مساوی' : pcpOp === 'gte' ? 'بیشتر یا مساوی' : 'بیشتر از'}
                </button>
                <input type="number" placeholder="مقدار" value={pcpVal} onChange={(e) => setPcpVal(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            )}
            </div>
            <button type="button" onClick={() => setPcpMode(pcpMode === 'between' ? 'single' : 'between')} className="px-2 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors shrink-0 w-14">
              {pcpMode === 'between' ? 'بازه' : 'مقدار'}
            </button>
            <span className="inline-flex rounded-md shrink-0">
              <button type="button" onClick={() => setPcpSign(pcpSign === null ? 'pos' : null)} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-r-md border transition-colors ${pcpSign === null ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>همه</button>
              <button type="button" onClick={() => setPcpSign(pcpSign === 'pos' ? null : 'pos')} className={`px-2 py-1 text-xs font-medium w-10 text-center border-y transition-colors ${pcpSign === 'pos' ? 'bg-green-500/20 text-green-600 border-green-300 dark:border-green-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>مثبت</button>
              <button type="button" onClick={() => setPcpSign(pcpSign === 'neg' ? null : 'neg')} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-l-md border transition-colors ${pcpSign === 'neg' ? 'bg-red-500/20 text-red-600 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>منفی</button>
            </span>
            <button type="button" onClick={() => { setPcpMode('single'); setPcpSign(null); setPcpMin(''); setPcpMax(''); setPcpOp('lt'); setPcpVal(''); }} className="mr-auto py-1 px-0.5 rounded text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs">
            <span className="text-slate-400 rtl-text font-medium w-36 shrink-0">اختلاف درصد:</span>
            <div className="flex items-center gap-2 shrink-0">
            {diffMode === 'between' ? (
              <>
                <input type="number" placeholder="حداقل" value={diffMin} onChange={(e) => setDiffMin(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
                <span className="text-slate-400 shrink-0">—</span>
                <input type="number" placeholder="حداکثر" value={diffMax} onChange={(e) => setDiffMax(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            ) : (
              <>
                <button type="button" onClick={() => { const ops = ['lt','lte','eq','gte','gt']; setDiffOp(ops[(ops.indexOf(diffOp) + 1) % ops.length]); }} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0 whitespace-nowrap w-[8rem] text-center overflow-hidden">
                  {diffOp === 'lt' ? 'کمتر از' : diffOp === 'lte' ? 'کمتر یا مساوی' : diffOp === 'eq' ? 'مساوی' : diffOp === 'gte' ? 'بیشتر یا مساوی' : 'بیشتر از'}
                </button>
                <input type="number" placeholder="مقدار" value={diffVal} onChange={(e) => setDiffVal(e.target.value)} className="input-field w-[7rem] py-1 text-xs text-center" dir="ltr" />
              </>
            )}
            </div>
            <button type="button" onClick={() => setDiffMode(diffMode === 'between' ? 'single' : 'between')} className="px-2 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors shrink-0 w-14">
              {diffMode === 'between' ? 'بازه' : 'مقدار'}
            </button>
            <span className="inline-flex rounded-md shrink-0">
              <button type="button" onClick={() => setDiffSign(diffSign === null ? 'pos' : null)} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-r-md border transition-colors ${diffSign === null ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>همه</button>
              <button type="button" onClick={() => setDiffSign(diffSign === 'pos' ? null : 'pos')} className={`px-2 py-1 text-xs font-medium w-10 text-center border-y transition-colors ${diffSign === 'pos' ? 'bg-green-500/20 text-green-600 border-green-300 dark:border-green-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>مثبت</button>
              <button type="button" onClick={() => setDiffSign(diffSign === 'neg' ? null : 'neg')} className={`px-2 py-1 text-xs font-medium w-10 text-center rounded-l-md border transition-colors ${diffSign === 'neg' ? 'bg-red-500/20 text-red-600 border-red-300 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>منفی</button>
            </span>
            <button type="button" onClick={() => { setDiffMode('single'); setDiffSign(null); setDiffMin(''); setDiffMax(''); setDiffOp('lt'); setDiffVal(''); }} className="mr-auto py-1 px-0.5 rounded text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={() => { setPeMode('single'); setPeSign(null); setPeMin(''); setPeMax(''); setPeOp('lt'); setPeVal(''); setHideNegativePE(false); setPlMode('single'); setPlSign(null); setPlMin(''); setPlMax(''); setPlOp('lt'); setPlVal(''); setPlpMode('single'); setPlpSign(null); setPlpMin(''); setPlpMax(''); setPlpOp('lt'); setPlpVal(''); setPcpMode('single'); setPcpSign(null); setPcpMin(''); setPcpMax(''); setPcpOp('lt'); setPcpVal(''); setDiffMode('single'); setDiffSign(null); setDiffMin(''); setDiffMax(''); setDiffOp('lt'); setDiffVal(''); }} className="p-1.5 rounded-full text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-500/10 transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 px-1">
        {toPersianNum(filtered.length)} نماد
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <th className="px-3 py-2 w-8"></th>
              <th onClick={() => toggleSort('name')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('name', 'نماد')}
              </th>
              <th onClick={() => toggleSort('fullName')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('fullName', 'نام کامل')}
              </th>
              <th onClick={() => toggleSort('pl')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('pl', `آخرین (${unit === 'toman' ? 'تومان' : 'ریال'})`)}
              </th>
              <th onClick={() => toggleSort('plp')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('plp', 'درصد تغییر آخرین')}
              </th>
              <th onClick={() => toggleSort('pcp')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('pcp', 'درصد تغییر پایانی')}
              </th>
              <th onClick={() => toggleSort('diff')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('diff', 'اختلاف درصد')}
              </th>
              <th onClick={() => toggleSort('pe')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('pe', 'P/E')}
              </th>
              <th onClick={() => toggleSort('cs')} className="px-3 py-2 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                {sortLabel('cs', 'گروه صنعت')}
              </th>
              <th className="px-3 py-2 text-right font-medium text-slate-400">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400 text-xs">
                  نمادی یافت نشد
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const plpVal = Number(s.plp);
              const pcpVal = Number(s.pcp);
              const diff = (!isNaN(plpVal) && !isNaN(pcpVal)) ? plpVal - pcpVal : null;
              return (
              <tr key={s.isin || s.name} className="border-b border-slate-50/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleFavorite(s.name)}
                    className="p-0.5 rounded transition-colors"
                    title={favorites.includes(s.name) ? 'حذف از نشان‌ها' : 'افزودن به نشان‌ها'}
                  >
                    <Star className={`w-3.5 h-3.5 ${favorites.includes(s.name) ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400'}`} fill={favorites.includes(s.name) ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {s.name}
                </td>
                <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[200px] truncate">
                  {s.fullName}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                  {s.pl ? formatPrice(s.pl, unit, 2) : '—'}
                </td>
                <td className={`px-3 py-2 font-medium ${plpVal > 0 ? 'text-success' : plpVal < 0 ? 'text-danger' : 'text-slate-500'}`}>
                  {s.plp != null && s.plp !== '' ? formatPercent(plpVal) : '—'}
                </td>
                <td className={`px-3 py-2 font-medium ${pcpVal > 0 ? 'text-success' : pcpVal < 0 ? 'text-danger' : 'text-slate-500'}`}>
                  {s.pcp != null && s.pcp !== '' ? formatPercent(pcpVal) : '—'}
                </td>
                <td className={`px-3 py-2 font-medium ${diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-slate-500'}`}>
                  {diff !== null ? formatPercent(diff) : '—'}
                </td>
                <td className={`px-3 py-2 font-medium ${s.pe < 0 ? 'text-danger' : 'text-slate-800 dark:text-slate-200'}`}>
                  {formatPE(s.pe)}
                </td>
                <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[120px] truncate">
                  {s.cs || '—'}
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
            );
            })}
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
