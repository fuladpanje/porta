import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useUnit } from '../contexts/UnitContext';
import { useAuth } from '../hooks/useAuth';
import { useProfitLoss } from '../contexts/ProfitLossContext';
import { useStaleData } from '../contexts/StaleDataContext';
import api from '../lib/api';
import { formatPrice, formatPercent, formatNumber, toPersianNum } from '../lib/calculations';
import { PlusCircle, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Trash2, Edit3, FolderOpen, Package, Wallet, TrendingUp, TrendingDown, Pencil, Eye, EyeOff, ArrowUpDown, Tag, CircleCheckBig, Clock, Banknote, Percent, Sigma, Filter, Crosshair, MessageSquare } from 'lucide-react';
import { Chart as ChartComponent, Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart as ChartJS } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';

ChartJS.register(TreemapController, TreemapElement);
import { ConfirmModal } from '../components/ConfirmModal';
import { SymbolSearch } from '../components/SymbolSearch';


function formatPE(pe) {
  if (pe === null || pe === undefined || isNaN(Number(pe)) || Number(pe) === 0) return '?';
  return Number(pe).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
function SafeNumber(val) {
   const n = Number(val);
   return isNaN(n) ? 0 : n;
 }
const COLUMNS = [
  { key: 'symbol', label: 'نماد', hideable: false },
  { key: 'last_price', label: 'آخرین', hideable: false },
  { key: 'pe', label: 'P/E', hideable: true },
  { key: 'buy_price', label: 'قیمت خرید', hideable: true },
  { key: 'quantity', label: 'تعداد', hideable: true },
  { key: 'sell_price', label: 'فروش', hideable: true },
  { key: 'purchase_value', label: 'ارزش خرید', hideable: true },
  { key: 'totalValue', label: 'ارزش کل فعلی', hideable: true },
  { key: 'buyer_power', label: 'قدرت خریدار', hideable: true },
  { key: 'resistance', label: 'مقاومت', hideable: true },
  { key: 'support', label: 'حمایت', hideable: true },
  { key: 'pl', label: 'سود/زیان', hideable: true },
  { key: 'pct', label: 'درصد', hideable: true },
  { key: 'actions', label: 'عملیات', hideable: true },
];

const MOBILE_DEFAULT_COLUMNS = ['symbol', 'last_price', 'totalValue', 'pl', 'pct', 'actions'];

export default function Dashboard() {
  const { plMode, setPlMode } = useProfitLoss();
   const { dashboard, loading, refreshing, error, stale, fetchDashboard, refreshDashboard } = usePortfolio(plMode);
   const { stale: globalStale, setStale } = useStaleData();
   const { unit } = useUnit();
   const { user } = useAuth();

   const isStale = stale || globalStale;

   const [showPortfolioForm, setShowPortfolioForm] = useState(false);
   const [editingPortfolio, setEditingPortfolio] = useState(null);
   const [expanded, setExpanded] = useState({});
const [showItemForm, setShowItemForm] = useState(null);
     const [editingItem, setEditingItem] = useState(null);
      const [editingLevels, setEditingLevels] = useState(null);
      const [editingPortfolioSms, setEditingPortfolioSms] = useState(null);
      const [portfolioSmsData, setPortfolioSmsData] = useState({});
      const [confirm, setConfirm] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
    const [portfolioSort, setPortfolioSort] = useState('default');
    const [showPLAmount, setShowPLAmount] = useState(false);
    const [treemapColorMode, setTreemapColorMode] = useState('performance');
    const [activeChart, setActiveChart] = useState('allocation');
    const [chartsExpanded, setChartsExpanded] = useState(true);
    const [chartPortfolioId, setChartPortfolioId] = useState(null);
const [showInactiveChartItems, setShowInactiveChartItems] = useState(false);
      const [showInactivePortfolios, setShowInactivePortfolios] = useState(false);
      const [showPortfolios, setShowPortfolios] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboard_column_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const required = COLUMNS.filter((c) => !c.hideable).map((c) => c.key);
          let result = [...new Set([...required, ...parsed])];
          // یک‌بار برای کاربران قبلی — ستون قدرت خریدار پیش‌فرض نمایش داده شود
          if (!localStorage.getItem('dashboard_buyer_power_migrated')) {
            if (!result.includes('buyer_power')) {
              result.push('buyer_power');
            }
            try { localStorage.setItem('dashboard_buyer_power_migrated', '1'); } catch {}
          }
          try { localStorage.setItem('dashboard_column_preferences', JSON.stringify(result)); } catch {}
          return result;
        }
      }
    } catch {}
    // اولین بار — پیش‌فرض بر اساس اندازه صفحه و ذخیره در localStorage
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const defaults = isMobile ? MOBILE_DEFAULT_COLUMNS : COLUMNS.map((c) => c.key);
    try { localStorage.setItem('dashboard_column_preferences', JSON.stringify(defaults)); } catch {}
    return defaults;
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const columnFilterRef = useRef(null);

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      const result = COLUMNS.filter((c) => !c.hideable).every((c) => next.includes(c.key)) ? next : prev;
      try { localStorage.setItem('dashboard_column_preferences', JSON.stringify(result)); } catch {}
      return result;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(e.target)) {
        setShowColumnFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const userPrefs = user?.column_preferences;
    if (userPrefs && Array.isArray(userPrefs) && userPrefs.length > 0) {
      // فقط اگه localStorage خالیه از تنظیمات کاربر استفاده کن
      const stored = localStorage.getItem('dashboard_column_preferences');
      if (!stored) {
        const required = COLUMNS.filter((c) => !c.hideable).map((c) => c.key);
        const merged = [...new Set([...required, ...userPrefs])];
        setVisibleColumns(merged);
      }
    }
  }, [user?.column_preferences]);

  const sellFilter = { all: 'all', realized: 'sold', unrealized: 'unsold' }[plMode] || 'all';

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // دریافت تنظیمات SMS پرتفو
  useEffect(() => {
    const fetchPortfolioSmsSettings = async () => {
      try {
        const res = await api.get('/portfolio-sms-settings');
        setPortfolioSmsData(res.data.data || {});
      } catch {}
    };
    fetchPortfolioSmsSettings();
  }, []);

  // ریست فیلتر پرتفو اگه پرتفوی انتخاب‌شده دیگه در لیست نباشه
  useEffect(() => {
    if (chartPortfolioId == null) return;
    const ids = (dashboard?.portfolios || []).map((p) => p.id);
    if (!ids.includes(chartPortfolioId)) setChartPortfolioId(null);
  }, [dashboard, chartPortfolioId]);

  useEffect(() => {
    const handler = () => refreshDashboard();
    window.addEventListener('prices-refreshed', handler);
    return () => window.removeEventListener('prices-refreshed', handler);
  }, [refreshDashboard]);

  const portfolios = useMemo(() => {
    const list = (dashboard?.portfolios || []).map((p) => {
      const usePortfolioCommission = !!p.commission_enabled;
      const pCommissionEnabled = usePortfolioCommission ? true : (user?.commission_enabled || false);
      const pSellCommissionRate = usePortfolioCommission
          ? (p.sell_commission || 0.88) / 100
          : (user?.sell_commission || 0.88) / 100;
      const allItems = p.items || [];
      let items = allItems;
      if (sellFilter === 'sold') items = items.filter((i) => i.sell_price && i.sell_price > 0);
      else if (sellFilter === 'unsold') items = items.filter((i) => !i.sell_price || i.sell_price <= 0);
      const heldItems = allItems.filter((i) => !i.sell_price || i.sell_price <= 0);
      const valueItems = (sellFilter === 'all' && plMode === 'all') ? heldItems : items;
       const totalValue = valueItems.reduce((s, i) => {
         const price = i.sell_price && i.sell_price > 0 ? i.sell_price : (i.last_price || i.buy_price);
         const qty = SafeNumber(i.quantity);
         const sellComm = pCommissionEnabled ? SafeNumber(price) * qty * pSellCommissionRate : 0;
         return s + SafeNumber(price) * qty - sellComm;
       }, 0);
      const totalCost = valueItems.reduce((s, i) => s + SafeNumber(i.buy_price) * SafeNumber(i.quantity), 0);
const totalPL = items.reduce((s, i) => {
          const qty = SafeNumber(i.quantity);
          const buyTotal = SafeNumber(i.buy_price) * qty;
          const hasSell = i.sell_price && i.sell_price > 0;
          const hasLast = i.last_price && i.last_price > 0;
          if (sellFilter === 'sold' && hasSell) {
              const sellTotal = SafeNumber(i.sell_price) * qty;
              const sellComm = pCommissionEnabled ? sellTotal * pSellCommissionRate : 0;
              return s + (sellTotal - sellComm) - buyTotal;
            }
            if (sellFilter === 'unsold' && hasLast) {
              const lastTotal = SafeNumber(i.last_price) * qty;
              const lastComm = pCommissionEnabled ? lastTotal * pSellCommissionRate : 0;
              return s + (lastTotal - lastComm) - buyTotal;
            }
            if (sellFilter === 'all') {
              if (hasSell && (plMode === 'all' || plMode === 'realized')) {
                const sellTotal = SafeNumber(i.sell_price) * qty;
                const sellComm = pCommissionEnabled ? sellTotal * pSellCommissionRate : 0;
                return s + (sellTotal - sellComm) - buyTotal;
              }
              if (!hasSell && hasLast && (plMode === 'all' || plMode === 'unrealized')) {
                const lastTotal = SafeNumber(i.last_price) * qty;
                const lastComm = pCommissionEnabled ? lastTotal * pSellCommissionRate : 0;
                return s + (lastTotal - lastComm) - buyTotal;
              }
            }
            return s;
        }, 0);
const soldCost = items.reduce((s, i) => {
           const hasSell = i.sell_price && i.sell_price > 0;
           const hasLast = i.last_price && i.last_price > 0;
           if (sellFilter === 'sold' && hasSell) {
             return s + SafeNumber(i.buy_price) * SafeNumber(i.quantity);
           }
           if (sellFilter === 'unsold' && hasLast) {
             return s + SafeNumber(i.buy_price) * SafeNumber(i.quantity);
           }
           if (sellFilter === 'all') {
             if (hasSell && (plMode === 'all' || plMode === 'realized')) {
               return s + SafeNumber(i.buy_price) * SafeNumber(i.quantity);
             }
             if (!hasSell && hasLast && (plMode === 'all' || plMode === 'unrealized')) {
               return s + SafeNumber(i.buy_price) * SafeNumber(i.quantity);
             }
           }
           return s;
         }, 0);
       const totalPLPct = soldCost > 0 ? (totalPL / soldCost) * 100 : 0;
      return { ...p, _totalValue: totalValue, _totalCost: totalCost, _profitLoss: totalPL, _profitLossPct: totalPLPct, _heldCount: heldItems.length, _count: items.length };
    });
    if (portfolioSort === 'default') return list;
    return [...list].sort((a, b) => {
      if (portfolioSort === 'percent') return b._profitLossPct - a._profitLossPct;
      return b.total_value - a.total_value;
    });
  }, [dashboard, portfolioSort, user, plMode, sellFilter]);
const allItems = useMemo(() => {
     const rawPortfolios = dashboard?.portfolios || [];
     const activePortfolios = showInactivePortfolios ? rawPortfolios : rawPortfolios.filter((p) => p.active !== false && p.active !== 0);
     const filteredPortfolios = chartPortfolioId ? activePortfolios.filter((p) => p.id === chartPortfolioId) : activePortfolios;
     let items = filteredPortfolios.flatMap((p) => {
       const usePC = !!p.commission_enabled;
       const commEnabled = usePC ? true : (user?.commission_enabled || false);
       const commRate = usePC ? (p.sell_commission || 0.88) / 100 : (user?.sell_commission || 0.88) / 100;
       return (p.items || []).map((item) => ({ ...item, _commEnabled: commEnabled, _commRate: commRate }));
     });
     if (!showInactiveChartItems) {
       items = items.filter((i) => i.active !== false);
     }
     return items;
   }, [dashboard, showInactivePortfolios, showInactiveChartItems, chartPortfolioId, user?.commission_enabled, user?.sell_commission]);
    const allocationItems = useMemo(() => {
      const rawPortfolios = dashboard?.portfolios || [];
      const activePortfolios = showInactivePortfolios ? rawPortfolios : rawPortfolios.filter((p) => p.active !== false && p.active !== 0);
      const filteredPortfolios = chartPortfolioId ? activePortfolios.filter((p) => p.id === chartPortfolioId) : activePortfolios;
      let items = filteredPortfolios.flatMap((p) => p.items || []);
      if (!showInactiveChartItems) {
        items = items.filter((i) => i.active !== false);
      }
      return items;
    }, [dashboard, showInactivePortfolios, showInactiveChartItems, chartPortfolioId]);
   const totalAllItems = portfolios.reduce((sum, p) => sum + SafeNumber(p._count), 0);

const totals = useMemo(() => {
      const totalValue = portfolios.reduce((s, p) => s + SafeNumber(p._totalValue), 0);
      const totalCost = portfolios.reduce((s, p) => s + SafeNumber(p._totalCost), 0);
      let totalPL = 0;
      let totalSoldCost = 0;
      portfolios.forEach((p) => {
        const usePortfolioCommission = !!p.commission_enabled;
        const pCommissionEnabled = usePortfolioCommission ? true : (user?.commission_enabled || false);
        const pSellCommissionRate = usePortfolioCommission
            ? (p.sell_commission || 0.88) / 100
            : (user?.sell_commission || 0.88) / 100;
        let items = p.items || [];
        if (sellFilter === 'sold') items = items.filter((i) => i.sell_price && i.sell_price > 0);
        else if (sellFilter === 'unsold') items = items.filter((i) => !i.sell_price || i.sell_price <= 0);
        items.forEach((item) => {
          const qty = SafeNumber(item.quantity);
          const buyTotal = SafeNumber(item.buy_price) * qty;
          const hasSell = item.sell_price && item.sell_price > 0;
          const hasLast = item.last_price && item.last_price > 0;
          if (sellFilter === 'sold' && hasSell) {
            const sellTotal = SafeNumber(item.sell_price) * qty;
            const sellComm = pCommissionEnabled ? sellTotal * pSellCommissionRate : 0;
            totalPL += (sellTotal - sellComm) - buyTotal;
            totalSoldCost += buyTotal;
          } else if (sellFilter === 'unsold' && hasLast) {
            const lastTotal = SafeNumber(item.last_price) * qty;
            const lastComm = pCommissionEnabled ? lastTotal * pSellCommissionRate : 0;
            totalPL += (lastTotal - lastComm) - buyTotal;
            totalSoldCost += buyTotal;
          } else if (sellFilter === 'all') {
            if (hasSell && (plMode === 'all' || plMode === 'realized')) {
              const sellTotal = SafeNumber(item.sell_price) * qty;
              const sellComm = pCommissionEnabled ? sellTotal * pSellCommissionRate : 0;
              totalPL += (sellTotal - sellComm) - buyTotal;
              totalSoldCost += buyTotal;
            } else if (!hasSell && hasLast && (plMode === 'all' || plMode === 'unrealized')) {
              const lastTotal = SafeNumber(item.last_price) * qty;
              const lastComm = pCommissionEnabled ? lastTotal * pSellCommissionRate : 0;
              totalPL += (lastTotal - lastComm) - buyTotal;
              totalSoldCost += buyTotal;
            }
          }
        });
      });
      const totalPLPct = totalSoldCost > 0 ? (totalPL / totalSoldCost) * 100 : 0;
      return { totalValue, totalCost, totalPL, totalPLPct, count: portfolios.length, itemCount: allItems.length };
   }, [portfolios, allItems, user, plMode, sellFilter]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[120px] h-16 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse" />
        <div className="h-24 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center">
        <p className="text-danger text-sm">{error}</p>
        <button onClick={fetchDashboard} className="btn-primary mt-2 text-xs py-1.5 px-4">دوباره تلاش</button>
      </div>
    );
  }

  if (!dashboard) return null;

    const handleCopy = (e, value, isPrice = true) => {
    const num = Number(value);
    const raw = isNaN(num) ? String(value) : String(isPrice && unit === 'toman' ? num / 10 : num);
    navigator.clipboard.writeText(raw).catch(() => {});
    const td = e.currentTarget;
    td.classList.add('copy-flash');
    setTimeout(() => td.classList.remove('copy-flash'), 600);
  };

  const getStatCopyValue = (s) => {
    if (s.format === 'num' || s.format === 'pct') return s.value;
    if (typeof s.value !== 'number' || isNaN(s.value)) return s.value;
    return unit === 'toman' ? s.value / 10 : s.value;
  };

  const togglePortfolio = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDeletePortfolio = (id, name) => {
      setConfirm({ message: `آیا از حذف پرتفو "${name}" مطمئن هستید؟`, onConfirm: async () => {
        try { await api.delete(`/portfolios/${id}`); refreshDashboard(); } catch (err) { alert(err.response?.data?.message || 'خطا'); }
        setConfirm(null);
      }});
    };

  const handleTogglePortfolioActive = async (portfolioId, currentActive) => {
    try { await api.put(`/portfolios/${portfolioId}/toggle-active`); refreshDashboard(); } catch (err) { alert(err.response?.data?.message || 'خطا'); }
  };

   const handleUpdateItem = async (portfolioId, itemId, data) => {
     try { await api.put(`/portfolios/${portfolioId}/items/${itemId}`, data); setEditingItem(null); refreshDashboard(); } catch (err) { alert(err.response?.data?.message || 'خطا'); }
   };
    const handleDeleteItem = (portfolioId, itemId) => {
      setConfirm({ message: 'آیا از حذف این آیتم مطمئن هستید؟', onConfirm: async () => {
        try { await api.delete(`/portfolios/${portfolioId}/items/${itemId}`); refreshDashboard(); } catch (err) { alert(err.response?.data?.message || 'خطا'); }
        setConfirm(null);
      }});
    };

    const handleToggleItemActive = async (portfolioId, itemId, currentActive) => {
      const portfolio = portfolios.find((p) => p.id === portfolioId);
      if (portfolio && (portfolio.active === false || portfolio.active === 0)) {
        return;
      }
      try { await api.put(`/portfolios/${portfolioId}/items/${itemId}`, { active: !currentActive }); refreshDashboard(); } catch (err) { alert(err.response?.data?.message || 'خطا'); }
    };

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortLabel = (key, label) => {
    if (sortConfig.key !== key) return label;
    return label + (sortConfig.dir === 'asc' ? ' ▲' : ' ▼');
  };

  return (
    <div className="space-y-4">

       {/* Stats Row */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
 {[
              { id: 'portfolios', label: 'پرتفوها', value: totals.count, format: 'num', icon: FolderOpen },
              { id: 'stocks', label: 'سهم‌ها', value: totalAllItems, format: 'num', icon: Package },
               { id: 'buyValue', label: 'ارزش کل خرید', value: (sellFilter === 'all' && plMode === 'all') ? null : totals.totalCost, format: 'price', icon: Wallet },
               { id: 'portfolioValue', label: 'ارزش کل پرتو', value: (sellFilter === 'all' && plMode === 'all') ? null : totals.totalValue, format: 'price', icon: Wallet },
 { id: 'totalPL', label: sellFilter === 'sold' ? 'محقق شده' : sellFilter === 'unsold' ? 'محقق نشده' : plMode === 'all' ? 'محقق شده + نشده' : plMode === 'realized' ? 'محقق شده' : 'محقق نشده', value: totals.totalPL, format: 'pl', positive: totals.totalPL >= 0, icon: totals.totalPL >= 0 ? TrendingUp : TrendingDown },
                { id: 'totalPLPct', label: sellFilter === 'sold' ? 'محقق شده' : sellFilter === 'unsold' ? 'محقق نشده' : plMode === 'all' ? 'محقق شده + نشده' : plMode === 'realized' ? 'محقق شده' : 'محقق نشده', value: totals.totalPLPct, format: 'pct', positive: totals.totalPL >= 0, icon: totals.totalPL >= 0 ? TrendingUp : TrendingDown },
            ].map((s) => {
            const Icon = s.icon;
            return (
             <div key={s.id} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 cursor-pointer" onDoubleClick={(e) => handleCopy(e, getStatCopyValue(s), false)}>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider rtl-text flex items-center gap-1">
                <Icon className="w-3 h-3" /> {s.label}
              </p>
               <p className={`text-sm font-bold mt-0.5 ${s.format === 'pl' && typeof s.value === 'number' && !isNaN(s.value) ? (s.value >= 0 ? 'text-success' : 'text-danger') : s.format === 'pct' && typeof s.value === 'number' && !isNaN(s.value) ? (s.value >= 0 ? 'text-success' : 'text-danger') : 'text-slate-800 dark:text-slate-200'} ${(s.id === 'portfolioValue' || s.id === 'totalPL' || s.id === 'totalPLPct') && isStale ? 'opacity-40' : ''}`}>
                 {s.format === 'num' ? toPersianNum(s.value) : s.format === 'price' && typeof s.value === 'number' && !isNaN(s.value)
                    ? <span className="flex flex-col leading-tight"><span className="whitespace-nowrap">{toPersianNum((unit === 'toman' ? s.value / 10 : s.value).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))}</span><span className="text-[10px] font-normal text-slate-400">{unit === 'toman' ? 'تومان' : 'ریال'}</span></span>
                    : s.format === 'pl' && typeof s.value === 'number' && !isNaN(s.value)
                    ? <span className="flex flex-col leading-tight"><span className="whitespace-nowrap">{toPersianNum((unit === 'toman' ? s.value / 10 : s.value).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))}</span><span className="text-[10px] font-normal text-slate-400">{unit === 'toman' ? 'تومان' : 'ریال'}</span></span>
                   : s.format === 'pct' && typeof s.value === 'number' && !isNaN(s.value)
                   ? <span className="flex flex-col leading-tight"><span className="whitespace-nowrap">{toPersianNum(s.value.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }))}</span><span className="text-[10px] font-normal text-slate-400">درصد</span></span>
                   : '—'}
              </p>
            </div>
            );
          })}
       </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChartsExpanded((current) => !current)}
                aria-expanded={chartsExpanded}
                aria-label={chartsExpanded ? 'بستن نمودارها' : 'باز کردن نمودارها'}
                className="p-1 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
              >
                {chartsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {activeChart === 'allocation' ? <Package className="w-4 h-4 text-brand-500" /> : activeChart === 'treemap' ? <Package className="w-4 h-4 text-brand-500" /> : <TrendingUp className="w-4 h-4 text-brand-500" />}
              <span className="sm:hidden">{activeChart === 'allocation' ? 'ترکیب' : activeChart === 'treemap' ? 'نقشه درختی' : 'سود و زیان'}</span>
              <span className="hidden sm:inline">{activeChart === 'allocation' ? 'ترکیب ارزش دارایی‌ها' : activeChart === 'treemap' ? 'نقشه درختی دارایی‌ها' : 'سود و زیان'}</span>
            </h2>
            <div className="flex items-center gap-2">
              {chartsExpanded && <div role="tablist" aria-label="نمودارهای داشبورد" className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[
                { id: 'allocation', label: 'ترکیب', icon: <Package className="w-3.5 h-3.5" /> },
                { id: 'treemap', label: 'نقشه درختی', icon: <Package className="w-3.5 h-3.5" /> },
                { id: 'profitLoss', label: 'سود و زیان', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              ].map((chart) => (
                <button
                  key={chart.id}
                  type="button"
                  role="tab"
                  aria-selected={activeChart === chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-colors rtl-text ${activeChart === chart.id ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {chart.icon}
                  <span className="hidden sm:inline">{chart.label}</span>
                </button>
              ))}
              </div>}
            </div>
          </div>

        <div className="relative bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
           {chartsExpanded && (
              <div className="flex items-center gap-4 mb-2 flex-row-reverse flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 rtl-text">پرتفوهای غیرفعال</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showInactivePortfolios}
                    onClick={() => {
                      const next = !showInactivePortfolios;
                      if (next) {
                        const hasInactivePortfolio = portfolios.some((p) => p.active === false || p.active === 0);
                        if (hasInactivePortfolio) {
                          setShowInactivePortfolios(true);
                          setShowInactiveChartItems(true);
                        } else {
                          const hasInactiveItems = portfolios.some((p) => (p.active !== false && p.active !== 0) && (p.items || []).some((i) => i.active === false));
                          if (hasInactiveItems) {
                            setShowInactiveChartItems(true);
                          }
                        }
                      } else {
                        setShowInactivePortfolios(false);
                        setShowInactiveChartItems(false);
                      }
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${showInactivePortfolios ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showInactivePortfolios ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 rtl-text">سهم‌های غیرفعال</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showInactiveChartItems}
                    onClick={() => {
                      const next = !showInactiveChartItems;
                      if (next) {
                        const hasInactivePortfolio = portfolios.some((p) => p.active === false || p.active === 0);
                        if (hasInactivePortfolio) {
                          setShowInactivePortfolios(true);
                        }
                      }
                      setShowInactiveChartItems(next);
                      if (!next) {
                        setShowInactivePortfolios(false);
                      }
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${showInactiveChartItems ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showInactiveChartItems ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {/* فیلتر پرتفو */}
                {(dashboard?.portfolios || []).length > 1 && (
                  <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <select
                      value={chartPortfolioId ?? ''}
                      onChange={(e) => setChartPortfolioId(e.target.value ? Number(e.target.value) : null)}
                      className="appearance-none text-[10px] bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 rounded-md shadow-sm pr-2.5 pl-6 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer rtl-text"
                      dir="rtl"
                    >
                      <option value="">همه پرتفوها</option>
                      {(dashboard?.portfolios || []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,4 6,8 10,4" />
                      </svg>
                    </span>
                  </div>
                )}
                {activeChart === 'treemap' && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setTreemapColorMode('performance')}
                      className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${treemapColorMode === 'performance' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      عملکرد
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreemapColorMode('allocation')}
                      className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${treemapColorMode === 'allocation' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      درصد
                    </button>
                  </div>
                )}
                {activeChart === 'profitLoss' && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setShowPLAmount(false)}
                      className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${!showPLAmount ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      درصد
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPLAmount(true)}
                      className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${showPLAmount ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      مبلغ
                    </button>
                  </div>
                )}
              </div>
            )}
  
           {chartsExpanded && <div role="tabpanel" className={`h-80 pb-4 ${activeChart !== 'profitLoss' ? 'mt-5' : ''}`}>
              {activeChart === 'allocation' && <PortfolioAllocationChart items={allItems} unit={unit} sellFilter={sellFilter} plMode={plMode} />}
               {activeChart === 'treemap' && <TreemapChart items={allItems} unit={unit} sellFilter={sellFilter} plMode={plMode} colorMode={treemapColorMode} />}
        {activeChart === 'profitLoss' && <PLChart items={allItems} showAmount={showPLAmount} unit={unit} plMode={plMode} />}
           </div>}
         </div>

       {/* Portfolios Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 rtl-text flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPortfolios((current) => !current)}
              aria-expanded={showPortfolios}
              aria-label={showPortfolios ? 'مخفی کردن پرتفوها' : 'نمایش پرتفوها'}
              className="p-1 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
            >
              {showPortfolios ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <FolderOpen className="w-4 h-4 text-brand-500" />
            پرتفوها
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{toPersianNum(portfolios.length)}</span>
          </h2>
          <div className="flex items-center gap-2">
            <div>
              <button
                onClick={() => {
                  const next = sellFilter === 'all' ? 'sold' : sellFilter === 'sold' ? 'unsold' : 'all';
                  const plMap = { all: 'all', sold: 'realized', unsold: 'unrealized' };
                  setPlMode(plMap[next]);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {sellFilter === 'all' ? <Sigma className="w-3 h-3" /> : sellFilter === 'sold' ? <CircleCheckBig className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                <span className={`hidden sm:inline ${sellFilter === 'sold' ? 'text-emerald-500' : sellFilter === 'unsold' ? 'text-amber-500' : ''}`}>{sellFilter === 'all' ? 'همه' : sellFilter === 'sold' ? 'فروش رفته' : 'فروش نرفته'}</span>
              </button>
            </div>
            <div>
              <button
                onClick={() => setPortfolioSort((prev) => prev === 'default' ? 'profit' : prev === 'profit' ? 'percent' : 'default')}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {portfolioSort === 'default' ? <ArrowUpDown className="w-3 h-3" /> : portfolioSort === 'profit' ? <Banknote className="w-3 h-3 text-emerald-500" /> : <Percent className="w-3 h-3 text-blue-500" />}
                <span className={`hidden sm:inline ${portfolioSort === 'profit' ? 'text-emerald-500' : portfolioSort === 'percent' ? 'text-blue-500' : ''}`}>{portfolioSort === 'default' ? 'ارزش' : portfolioSort === 'profit' ? 'مبلغ' : 'درصد'}</span>
              </button>
            </div>
            <div className="relative" ref={columnFilterRef}>
              <button
                onClick={() => setShowColumnFilter((v) => !v)}
                className={`text-[10px] hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${visibleColumns.length === COLUMNS.length ? 'text-slate-400' : 'text-brand-500'}`}
                title="فیلتر ستون‌ها"
              >
                <Filter className="w-3 h-3" />
              </button>
              {showColumnFilter && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 min-w-[160px]">
<p className="text-[10px] text-brand-500 mb-2 rtl-text">نمایش ستون ها</p>
                   {COLUMNS.filter((c) => c.hideable).map((col) => (
                     <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-xs text-slate-600 dark:text-slate-300 rtl-text">
                       <input
                         type="checkbox"
                         checked={visibleColumns.includes(col.key)}
                         onChange={() => toggleColumn(col.key)}
                         className="rounded border-slate-300 accent-brand-500 focus:ring-brand-500"
                       />
                       {col.label}
                     </label>
                   ))}
                  <button
                    onClick={() => {
                      const all = COLUMNS.map((c) => c.key);
                      setVisibleColumns(all);
                      try { localStorage.setItem('dashboard_column_preferences', JSON.stringify(all)); } catch {}
                    }}
                    className="mt-2 text-[10px] text-brand-500 hover:underline rtl-text"
                  >
                    نمایش همه ستون‌ها
                  </button>
                </div>
              )}
            </div>
            {!showPortfolioForm && !editingPortfolio && (
              <button onClick={() => setShowPortfolioForm(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> <span className="hidden sm:inline">افزودن پرتفو</span>
              </button>
            )}
          </div>
        </div>

         {showPortfolios && (
         <>
         {showPortfolioForm && (
           <InlinePortfolioForm onCancel={() => setShowPortfolioForm(false)} onSave={() => { setShowPortfolioForm(false); refreshDashboard(); }} />
         )}

         {editingPortfolio && (
           <InlinePortfolioForm
             initialName={editingPortfolio.name}
             portfolioId={editingPortfolio.id}
             onCancel={() => setEditingPortfolio(null)}
             onSave={() => { setEditingPortfolio(null); refreshDashboard(); }}
           />
         )}

         {editingLevels && (
           <LevelEditorPopup
             portfolioId={editingLevels.portfolioId}
             itemId={editingLevels.itemId}
             item={editingLevels.item}
             unit={unit}
             onClose={() => setEditingLevels(null)}
             onSave={() => { setEditingLevels(null); refreshDashboard(); }}
           />
         )}

{editingPortfolioSms && (
            <PortfolioSmsPopup
              portfolio={editingPortfolioSms}
              times={portfolioSmsData[editingPortfolioSms.id] || []}
              onClose={() => setEditingPortfolioSms(null)}
              onSave={(times) => {
                setPortfolioSmsData((prev) => ({ ...prev, [editingPortfolioSms.id]: times }));
                setEditingPortfolioSms(null);
              }}
            />
          )}

        {portfolios.length === 0 && !showPortfolioForm && !editingPortfolio && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400 text-xs rtl-text">هنوز پرتفو ندارید</p>
            <button onClick={() => setShowPortfolioForm(true)} className="btn-primary text-xs py-1.5 px-4 mt-3">افزودن اولین پرتفو</button>
          </div>
        )}

       {/* Portfolio Cards */}
       <div className="space-y-2">
         {portfolios.map((portfolio) => {
          const isExp = expanded[portfolio.id];
            let pi = [...(portfolio.items || [])];
            if (sellFilter === 'sold') pi = pi.filter((i) => i.sell_price && i.sell_price > 0);
            else if (sellFilter === 'unsold') pi = pi.filter((i) => !i.sell_price || i.sell_price <= 0);
            pi.sort((a, b) => {
              // اگر portfolioSort فعال باشه، آیتم‌ها هم بر اساس همون معیار sort میشن
              if (!sortConfig.key && portfolioSort !== 'default') {
                const calcPL = (i) => {
                  const price = SafeNumber(i.sell_price) > 0 ? SafeNumber(i.sell_price) : SafeNumber(i.last_price);
                  return price > 0 ? (price - SafeNumber(i.buy_price)) * SafeNumber(i.quantity) : 0;
                };
                const calcPct = (i) => {
                  const price = SafeNumber(i.sell_price) > 0 ? SafeNumber(i.sell_price) : SafeNumber(i.last_price);
                  return price > 0 && SafeNumber(i.buy_price) > 0 ? ((price - SafeNumber(i.buy_price)) / SafeNumber(i.buy_price)) * 100 : 0;
                };
                if (portfolioSort === 'profit') return calcPL(b) - calcPL(a);
                if (portfolioSort === 'percent') return calcPct(b) - calcPct(a);
              }
              if (sortConfig.key) {
                let aVal, bVal;
                switch (sortConfig.key) {
                  case 'symbol': aVal = a.symbol || ''; bVal = b.symbol || ''; return sortConfig.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                  case 'last_price': aVal = SafeNumber(a.last_price); bVal = SafeNumber(b.last_price); break;
                  case 'pe': aVal = SafeNumber(a.pe); bVal = SafeNumber(b.pe); break;
                  case 'buy_price': aVal = SafeNumber(a.buy_price); bVal = SafeNumber(b.buy_price); break;
                  case 'quantity': aVal = SafeNumber(a.quantity); bVal = SafeNumber(b.quantity); break;
                  case 'sell_price': aVal = SafeNumber(a.sell_price); bVal = SafeNumber(b.sell_price); break;
                  case 'purchase_value': aVal = SafeNumber(a.buy_price) * SafeNumber(a.quantity); bVal = SafeNumber(b.buy_price) * SafeNumber(b.quantity); break;
                  case 'totalValue': aVal = SafeNumber(a.sell_price || a.last_price || a.buy_price) * SafeNumber(a.quantity); bVal = SafeNumber(b.sell_price || b.last_price || b.buy_price) * SafeNumber(b.quantity); break;
                  case 'buyer_power': {
                    const aBuy = SafeNumber(a.buy_i_volume) > 0 && SafeNumber(a.buy_count_i) > 0 ? SafeNumber(a.buy_i_volume) / SafeNumber(a.buy_count_i) : 0;
                    const aSell = SafeNumber(a.sell_i_volume) > 0 && SafeNumber(a.sell_count_i) > 0 ? SafeNumber(a.sell_i_volume) / SafeNumber(a.sell_count_i) : 0;
                    const bBuy = SafeNumber(b.buy_i_volume) > 0 && SafeNumber(b.buy_count_i) > 0 ? SafeNumber(b.buy_i_volume) / SafeNumber(b.buy_count_i) : 0;
                    const bSell = SafeNumber(b.sell_i_volume) > 0 && SafeNumber(b.sell_count_i) > 0 ? SafeNumber(b.sell_i_volume) / SafeNumber(b.sell_count_i) : 0;
                    aVal = aSell > 0 ? aBuy / aSell : -9999;
                    bVal = bSell > 0 ? bBuy / bSell : -9999;
                    break;
                  }
case 'pl': aVal = (SafeNumber(a.sell_price) > 0 || SafeNumber(a.last_price) > 0) ? ((SafeNumber(a.sell_price) > 0 ? SafeNumber(a.sell_price) : SafeNumber(a.last_price)) - SafeNumber(a.buy_price)) * SafeNumber(a.quantity) : 0; bVal = (SafeNumber(b.sell_price) > 0 || SafeNumber(b.last_price) > 0) ? ((SafeNumber(b.sell_price) > 0 ? SafeNumber(b.sell_price) : SafeNumber(b.last_price)) - SafeNumber(b.buy_price)) * SafeNumber(b.quantity) : 0; break;
                   case 'pct': aVal = (SafeNumber(a.sell_price) > 0 || SafeNumber(a.last_price) > 0) ? (((SafeNumber(a.sell_price) > 0 ? SafeNumber(a.sell_price) : SafeNumber(a.last_price)) - SafeNumber(a.buy_price)) / SafeNumber(a.buy_price)) * 100 : 0; bVal = (SafeNumber(b.sell_price) > 0 || SafeNumber(b.last_price) > 0) ? (((SafeNumber(b.sell_price) > 0 ? SafeNumber(b.sell_price) : SafeNumber(b.last_price)) - SafeNumber(b.buy_price)) / SafeNumber(b.buy_price)) * 100 : 0; break;
                  case 'resistance': aVal = SafeNumber(a.last_price) > 0 && SafeNumber(a.resistance_1) > 0 ? (SafeNumber(a.resistance_1) - SafeNumber(a.last_price)) / SafeNumber(a.last_price) * 100 : -9999; bVal = SafeNumber(b.last_price) > 0 && SafeNumber(b.resistance_1) > 0 ? (SafeNumber(b.resistance_1) - SafeNumber(b.last_price)) / SafeNumber(b.last_price) * 100 : -9999; break;
                  case 'support': aVal = SafeNumber(a.last_price) > 0 && SafeNumber(a.support_1) > 0 ? (SafeNumber(a.last_price) - SafeNumber(a.support_1)) / SafeNumber(a.last_price) * 100 : -9999; bVal = SafeNumber(b.last_price) > 0 && SafeNumber(b.support_1) > 0 ? (SafeNumber(b.last_price) - SafeNumber(b.support_1)) / SafeNumber(b.last_price) * 100 : -9999; break;
                  default: return 0;
                }
                return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
              }
              return (a.active ? 0 : 1) - (b.active ? 0 : 1) ||
                (() => {
                  const calcTotalValue = (i) => {
                    const buyN = SafeNumber(i.buy_price);
                    const sellN = i.sell_price ? SafeNumber(i.sell_price) : null;
                    const lastN = i.last_price ? SafeNumber(i.last_price) : null;
                    const qtyN = SafeNumber(i.quantity);
                    const displayPrice = sellN || lastN;
                    const purchaseValue = buyN * qtyN;
                    const usePortfolioComm = !!portfolio.commission_enabled;
                    const commEnabled = usePortfolioComm ? true : (user?.commission_enabled || false);
                    const commRate = usePortfolioComm
                      ? (portfolio.sell_commission || 0.88) / 100
                      : (user?.sell_commission || 0.88) / 100;
                    const sellComm = commEnabled && displayPrice != null ? displayPrice * qtyN * commRate : 0;
                    return displayPrice != null ? displayPrice * qtyN - sellComm : purchaseValue;
                  };
                  return calcTotalValue(b) - calcTotalValue(a);
                })();
            });
          const pv = SafeNumber(portfolio._totalValue);
          const pc = SafeNumber(portfolio._totalCost);
          const pp = SafeNumber(portfolio._profitLossPct);
          const hideValues = sellFilter === 'all' && plMode === 'all';

          return (
            <div key={portfolio.id} className={`bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-shadow hover:shadow-sm ${!portfolio.active && showItemForm !== portfolio.id && !(editingItem && editingItem.portfolioId === portfolio.id) ? 'opacity-50' : ''}`}>
              {/* Portfolio Header */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors gap-2" onClick={() => togglePortfolio(portfolio.id)}>
                  <div className="flex items-center gap-2">
                  {isExp ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 rtl-text truncate">{portfolio.name}</span>
                   <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full shrink-0">{toPersianNum(SafeNumber(portfolio._count))} سهم</span>
                </div>
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">ارزش خرید</span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{hideValues ? '—' : toPersianNum((unit === 'toman' ? pc / 10 : pc).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + ' ' + (unit === 'toman' ? 'تومان' : 'ریال')}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">ارزش پرتفو</span>
                          <span className={`text-xs font-medium ${isStale ? 'opacity-40' : 'text-slate-700 dark:text-slate-300'}`}>{hideValues ? '—' : toPersianNum((unit === 'toman' ? pv / 10 : pv).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + ' ' + (unit === 'toman' ? 'تومان' : 'ریال')}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex flex-col items-center gap-0.5">
                           <span className="text-[10px] text-slate-400 dark:text-slate-500">{sellFilter === 'sold' ? 'محقق شده (درصد)' : sellFilter === 'unsold' ? 'محقق نشده (درصد)' : plMode === 'all' ? 'محقق شده + نشده (درصد)' : plMode === 'realized' ? 'محقق شده (درصد)' : 'محقق نشده (درصد)'}</span>
                            <span className={`text-xs font-bold ${isStale ? 'opacity-40' : ''} ${pp >= 0 ? 'text-success' : 'text-danger'}`}>{toPersianNum((unit === 'toman' ? SafeNumber(portfolio._profitLoss) / 10 : SafeNumber(portfolio._profitLoss)).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))} {unit === 'toman' ? 'تومان' : 'ریال'} {pp !== 0 && `(${toPersianNum(pp.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }))} درصد)`}</span>
                         </div>
                         <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
                         <div className="sm:hidden w-full border-t border-slate-200 dark:border-slate-700" />
                        <div className="sm:hidden flex items-center gap-1 w-full justify-center">
                          <button onClick={(e) => { e.stopPropagation(); handleTogglePortfolioActive(portfolio.id, portfolio.active); }} className="p-1 rounded hover:bg-brand/10 transition-colors shrink-0" title={portfolio.active ? 'غیرفعال کردن پرتفو' : 'فعال کردن پرتفو'}>
                            {portfolio.active ? <Eye className="w-3 h-3 text-success" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPortfolioSms(portfolio); }} className={`p-1 rounded transition-colors shrink-0 ${(portfolioSmsData[portfolio.id] || []).some(t => t.enabled) ? 'text-brand-500 bg-brand-500/10 hover:bg-brand-500/20' : 'text-slate-400 hover:text-brand-500 hover:bg-brand-500/10'}`} title="تنظیمات SMS پرتفو">
                            <Crosshair className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPortfolio(portfolio); }} className="p-1 rounded hover:bg-brand/10 transition-colors shrink-0" title="ویرایش پرتفو">
                            <Pencil className="w-3 h-3 text-brand-500" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(portfolio.id, portfolio.name); }} className="p-1 rounded hover:bg-danger/10 transition-colors shrink-0" title="حذف پرتفو">
                            <Trash2 className="w-3 h-3 text-danger" />
                          </button>
                        </div>
                        <div className="hidden sm:flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleTogglePortfolioActive(portfolio.id, portfolio.active); }} className="p-1 rounded hover:bg-brand/10 transition-colors shrink-0" title={portfolio.active ? 'غیرفعال کردن پرتفو' : 'فعال کردن پرتفو'}>
                            {portfolio.active ? <Eye className="w-3 h-3 text-success" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPortfolioSms(portfolio); }} className={`p-1 rounded transition-colors shrink-0 ${(portfolioSmsData[portfolio.id] || []).some(t => t.enabled) ? 'text-brand-500 bg-brand-500/10 hover:bg-brand-500/20' : 'text-slate-400 hover:text-brand-500 hover:bg-brand-500/10'}`} title="تنظیمات SMS پرتفو">
                            <Crosshair className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPortfolio(portfolio); }} className="p-1 rounded hover:bg-brand/10 transition-colors shrink-0" title="ویرایش پرتفو">
                            <Pencil className="w-3 h-3 text-brand-500" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(portfolio.id, portfolio.name); }} className="p-1 rounded hover:bg-danger/10 transition-colors shrink-0" title="حذف پرتفو">
                            <Trash2 className="w-3 h-3 text-danger" />
                          </button>
                        </div>
                    </div>
              </div>

              {isExp && (
                <div className="border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  {/* Modal Item Form */}
                  {showItemForm === portfolio.id && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full mx-4 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <InlineItemForm portfolioId={portfolio.id} onCancel={() => setShowItemForm(null)} onSave={() => { setShowItemForm(null); fetchDashboard(true); }} unit={unit} />
                      </div>
                    </div>
                  )}

                  {pi.length === 0 && (
                    <div className="px-3 py-4 text-center text-slate-400 text-xs">
                      هنوز آیتمی اضافه نشده
                    </div>
                  )}
                  {pi.length > 0 && (
                    <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                          <thead>
                             <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                               {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => (
                                 <th key={c.key} onClick={c.key === 'actions' ? undefined : (() => toggleSort(c.key))} className={`px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none ${c.key === 'actions' ? '' : ''}`}>{sortLabel(c.key, c.label)}</th>
                               ))}
                             </tr>
                          </thead>
                         <tbody>
                            {pi.map((item) => {
                              if (editingItem && editingItem.itemId === item.id && editingItem.portfolioId === portfolio.id) {
                                return (
                                  <tr key={item.id}>
                                    <td colSpan={visibleColumns.length} className="p-0">
                                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full mx-4 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
                                          <InlineItemForm
                                            portfolioId={portfolio.id}
                                            itemId={item.id}
                                            initialSymbol={item.symbol}
                                            initialBuyPrice={item.buy_price}
                                            initialQuantity={item.quantity}
                                            initialSellPrice={item.sell_price}
                                            initialLastPrice={item.last_price}
                                            initialIsCustom={item.is_custom}
                                            onCancel={() => setEditingItem(null)}
                                            onSave={() => { setEditingItem(null); refreshDashboard(); }}
                                            unit={unit}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                               );
                             }
 const buyN = SafeNumber(item.buy_price);
                               const sellN = item.sell_price ? SafeNumber(item.sell_price) : null;
                               const lastN = item.last_price ? SafeNumber(item.last_price) : null;
                               const qtyN = SafeNumber(item.quantity);
                               const isRealized = sellN !== null;
                                const displayPrice = sellN || lastN;
                               const purchaseValue = buyN * qtyN;
                               const _usePortfolioCommission = !!portfolio.commission_enabled;
                               const _itemCommissionEnabled = _usePortfolioCommission ? true : (user?.commission_enabled || false);
                               const _itemSellCommissionRate = _usePortfolioCommission
                                   ? (portfolio.sell_commission || 0.88) / 100
                                   : (user?.sell_commission || 0.88) / 100;
                               const sellComm = _itemCommissionEnabled && displayPrice != null ? displayPrice * qtyN * _itemSellCommissionRate : 0;
                                const totalValue = displayPrice != null ? displayPrice * qtyN - sellComm : purchaseValue;
                                const plAmount = displayPrice != null ? totalValue - purchaseValue : null;
                                const pl = plAmount !== null && purchaseValue > 0 ? (plAmount / purchaseValue) * 100 : null;
                                const buyIVol = SafeNumber(item.buy_i_volume);
                                const buyCntI = SafeNumber(item.buy_count_i);
                                const sellIVol = SafeNumber(item.sell_i_volume);
                                const sellCntI = SafeNumber(item.sell_count_i);
                                const allBuy = buyIVol > 0 && buyCntI > 0 ? buyIVol / buyCntI : 0;
                                const allSell = sellIVol > 0 && sellCntI > 0 ? sellIVol / sellCntI : 0;
                                const buyerPower = allBuy > 0 && allSell > 0 ? allBuy / allSell : null;
                               const isInactive = !item.active && portfolio.active !== false && portfolio.active !== 0;
                                 return (
<tr key={item.id} className={`border-b border-slate-50/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${!item.active && portfolio.active !== false && portfolio.active !== 0 ? 'opacity-75' : ''}`}>
                                      {visibleColumns.includes('symbol') && (
                                        <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                                           <span className={`w-2 h-2 rounded-full shrink-0 ${isRealized ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                           {item.is_custom && <span className="w-2 h-2 rounded-full shrink-0 bg-red-500" title="نماد در لیست API موجود نیست"></span>}
                                          {item.symbol}
                                        </td>
                                      )}
                                     {visibleColumns.includes('last_price') && (
                                       <td className={`px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap ${isStale ? 'opacity-40' : ''}`} onDoubleClick={(e) => handleCopy(e, item.last_price)}>{item.last_price ? formatPrice(item.last_price, unit, 2) : '—'}</td>
                                     )}
                                     {visibleColumns.includes('pe') && (
                                       <td className={`px-2 py-1.5 font-medium ${item.pe < 0 ? 'text-danger' : 'text-slate-800 dark:text-slate-200'} cursor-pointer whitespace-nowrap ${isStale ? 'opacity-40' : ''}`} onDoubleClick={(e) => handleCopy(e, item.pe, false)}>{item.pe ? formatPE(item.pe) : '—'}</td>
                                     )}
                                     {visibleColumns.includes('buy_price') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.buy_price)}>{formatPrice(item.buy_price, unit, 2)}</td>
                                     )}
                                     {visibleColumns.includes('quantity') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.quantity, false)}>{formatNumber(item.quantity)}</td>
                                     )}
                                     {visibleColumns.includes('sell_price') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.sell_price)}>{item.sell_price ? formatPrice(item.sell_price, unit, 2) : '—'}</td>
                                     )}
                                     {visibleColumns.includes('purchase_value') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, purchaseValue)}>{formatPrice(purchaseValue, unit)}</td>
                                     )}
                                      {visibleColumns.includes('totalValue') && (
                                        <td className={`px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap ${isStale ? 'opacity-40' : ''}`} onDoubleClick={(e) => handleCopy(e, totalValue)}>{formatPrice(totalValue, unit)}</td>
                                      )}
                                      {visibleColumns.includes('buyer_power') && (
                                        <td className={`px-2 py-1.5 font-medium cursor-pointer whitespace-nowrap ${buyerPower !== null ? (buyerPower > 1 ? 'text-success' : buyerPower < 1 ? 'text-danger' : 'text-slate-500') : 'text-slate-500'} ${isStale ? 'opacity-40' : ''}`} onDoubleClick={(e) => handleCopy(e, buyerPower, false)}>
                                          {buyerPower !== null ? toPersianNum(buyerPower.toLocaleString('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '—'}
                                        </td>
                                      )}
                                      {visibleColumns.includes('resistance') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.resistance_1)}>
                                         {item.resistance_1 ? <>
                                           {formatPrice(item.resistance_1, unit, 2)}
                                           {lastN > 0 && <span className="text-[9px] text-slate-400 mr-0.5">({((SafeNumber(item.resistance_1) - lastN) / lastN * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪)</span>}
                                         </> : '—'}
                                         {item.resistance_2 ? <>
                                           {' - '}{formatPrice(item.resistance_2, unit, 2)}
                                           {lastN > 0 && <span className="text-[9px] text-slate-400 mr-0.5">({((SafeNumber(item.resistance_2) - lastN) / lastN * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪)</span>}
                                         </> : ''}
                                       </td>
                                     )}
                                     {visibleColumns.includes('support') && (
                                       <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.support_1)}>
                                         {item.support_1 ? <>
                                           {formatPrice(item.support_1, unit, 2)}
                                           {lastN > 0 && <span className="text-[9px] text-slate-400 mr-0.5">({((lastN - SafeNumber(item.support_1)) / lastN * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪)</span>}
                                         </> : '—'}
                                         {item.support_2 ? <>
                                           {' - '}{formatPrice(item.support_2, unit, 2)}
                                           {lastN > 0 && <span className="text-[9px] text-slate-400 mr-0.5">({((lastN - SafeNumber(item.support_2)) / lastN * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪)</span>}
                                         </> : ''}
                                        </td>
                                     )}
                                     {visibleColumns.includes('pl') && (
                                       <td className={`px-2 py-1.5 font-medium cursor-pointer whitespace-nowrap ${isStale ? 'opacity-40' : ''} ${plAmount !== null ? (isInactive ? (plAmount >= 0 ? 'text-success' : 'text-danger') : (isRealized ? (plAmount >= 0 ? 'text-success' : 'text-danger') : (plAmount >= 0 ? `text-success ${isStale ? '' : 'opacity-90'}` : `text-danger ${isStale ? '' : 'opacity-90'}`))) : 'text-slate-500 italic'}`} onDoubleClick={(e) => handleCopy(e, plAmount)}>
                                           {plAmount !== null ? formatPrice(plAmount, unit) : '—'}
                                      </td>
                                     )}
                                     {visibleColumns.includes('pct') && (
                                       <td className={`px-2 py-1.5 whitespace-nowrap ${isStale ? 'opacity-40' : ''}`}>
                                         {pl != null ? (
                                           <span className={`flex items-center gap-0.5 font-medium ${isInactive ? (pl >= 0 ? 'text-success' : 'text-danger') : (isRealized ? (pl >= 0 ? 'text-success' : 'text-danger') : (pl >= 0 ? `text-success ${isStale ? '' : 'opacity-90'}` : `text-danger ${isStale ? '' : 'opacity-90'}`))}`}>
                                              {formatPercent(pl)}
                                           </span>
                                         ) : <span className="text-slate-500 italic">—</span>}
                                     </td>
                                     )}
                                     {visibleColumns.includes('actions') && (
                                       <td className="px-2 py-1.5 flex items-center gap-1 whitespace-nowrap">
                                       <button onClick={() => handleToggleItemActive(portfolio.id, item.id, item.active)} disabled={portfolio.active === false || portfolio.active === 0} className={`p-0.5 rounded transition-colors ${portfolio.active === false || portfolio.active === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-brand/10'}`} title={portfolio.active === false || portfolio.active === 0 ? 'ابتدا پرتفو را فعال کنید' : (item.active ? 'غیرفعال کردن' : 'فعال کردن')}>
                                           {item.active ? <Eye className="w-3 h-3 text-success" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                         </button>
                                          <button onClick={() => setEditingLevels({ portfolioId: portfolio.id, itemId: item.id, item })} className={`p-0.5 rounded transition-colors ${item.resistance_1 || item.support_1 ? 'text-brand-500 bg-brand-500/10 hover:bg-brand-500/20' : 'text-slate-400 hover:text-brand-500 hover:bg-brand-500/10'}`} title={item.resistance_1 || item.support_1 ? 'ویرایش سطوح' : 'تعریف سطوح'}>
                                            <Crosshair className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => setEditingItem({ portfolioId: portfolio.id, itemId: item.id })} className="p-0.5 rounded hover:bg-brand/10 transition-colors" title="ویرایش سهم">
                                            <Pencil className="w-3 h-3 text-brand-500" />
                                          </button>
                                         <button onClick={() => handleDeleteItem(portfolio.id, item.id)} className="p-0.5 rounded hover:bg-danger/10 transition-colors">
                                          <Trash2 className="w-3 h-3 text-danger" />
                                        </button>
                                     </td>
                                     )}
                                    </tr>
                             );
                           })}
                         </tbody>
                       </table>
                       </div>
{plMode === 'realized' && (portfolio.items || []).some((item) => !item.sell_price && item.last_price) && (
                          <div className="px-3 py-1 text-[9px] text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                            <span className="text-emerald-500 font-bold">●</span> سهم‌های فروش رفته (بر اساس قیمت فروش) در محاسبه لحاظ می‌شوند
                          </div>
                        )}
 {plMode === 'all' && (portfolio.items || []).some((item) => !item.sell_price && item.last_price) && (
                           <div className="px-3 py-1 text-[9px] text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                             <span className="text-emerald-500 font-bold">●</span> سهم‌های فروش رفته + <span className="text-amber-500 font-bold">●</span> سهم‌های فروش نرفته بر اساس آخرین قیمت و قیمت فروش در محاسبه لحاظ می‌شود
                           </div>
                         )}
 {plMode === 'unrealized' && (portfolio.items || []).some((item) => !item.sell_price && item.last_price) && (
                           <div className="px-3 py-1 text-[9px] text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                             <span className="text-amber-500 font-bold">●</span> سهم‌های فروش نرفته (بر اساس آخرین قیمت) در محاسبه لحاظ می‌شوند
                           </div>
                         )}
 {(portfolio.items || []).some((item) => item.is_custom) && (
                           <div className="px-3 py-1 text-[9px] text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                             <span className="text-red-500 font-bold">●</span> نمادهای وارد شده به صورت دستی (خارج از لیست نمادها — قیمت به صورت خودکار بروزرسانی نمی‌شود)
                           </div>
                         )}
                    </>
                  )}

                  <div className="px-3 py-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    {showItemForm !== portfolio.id && !editingItem && (
                      <button onClick={() => setShowItemForm(portfolio.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" /> افزودن سهم
                      </button>
                    )}
                  </div>
                 </div>
               )}
            </div>
          );
        })}
        </div>
        </>
        )}
        {!showPortfolios && (
          <button
            type="button"
            onClick={() => setShowPortfolios(true)}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
          >
            <ChevronRight className="w-3 h-3 rotate-180" /> نمایش پرتفوها
          </button>
        )}
        {confirm && (
         <ConfirmModal
           message={confirm.message}
           onConfirm={confirm.onConfirm}
           onCancel={() => setConfirm(null)}
           loading={false}
         />
       )}
     </div>
   );
 }

function InlinePortfolioForm({ onCancel, onSave, initialName, portfolioId }) {
  const [name, setName] = useState(initialName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(portfolioId);
  useEffect(() => { if (initialName) setName(initialName); }, [initialName]);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isEdit) {
        await api.put(`/portfolios/${portfolioId}`, { name });
      } else {
        await api.post('/portfolios', { name });
      }
      onSave();
    } catch (err) { setError(err.response?.data?.message || 'خطا'); } finally { setLoading(false); }
  };
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 animate-fade-in">
      <form onSubmit={handleSubmit} className="flex items-center gap-2" dir="rtl">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field flex-1 text-xs py-1.5" placeholder="نام پرتفو" required autoFocus />
        {error && <span className="text-[10px] text-danger">{error}</span>}
        <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5 px-3 min-w-[60px]">{loading ? '...' : isEdit ? 'ذخیره تغییرات' : 'ذخیره'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
      </form>
    </div>
  );
}

function cleanNum(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (isNaN(n)) return '';
  const rounded = Math.round(n);
  return String(rounded === n || Math.abs(rounded - n) < 0.0001 ? rounded : n);
}

function stripCommas(v) {
  return v.replace(/[,،]/g, '');
}

function InlineItemForm({ portfolioId, itemId, onCancel, onSave, initialSymbol, initialBuyPrice, initialQuantity, initialSellPrice, initialLastPrice, initialPe, initialIsCustom, unit }) {
  const toman = unit === 'toman';
  const conv = (v) => toman && v ? v / 10 : v;
  const [symbol, setSymbol] = useState(initialSymbol || '');
  const [buyPrice, setBuyPrice] = useState(cleanNum(conv(initialBuyPrice)));
  const [quantity, setQuantity] = useState(cleanNum(initialQuantity));
  const [sellPrice, setSellPrice] = useState(cleanNum(conv(initialSellPrice)));
  const [lastPrice, setLastPrice] = useState(cleanNum(conv(initialLastPrice)));
  const [pe, setPe] = useState(cleanNum(initialPe));
  const [isApiSymbol, setIsApiSymbol] = useState(initialIsCustom !== undefined ? !initialIsCustom : Boolean(initialLastPrice));
  const [buyIVolume, setBuyIVolume] = useState(null);
  const [buyCountI, setBuyCountI] = useState(null);
  const [sellIVolume, setSellIVolume] = useState(null);
  const [sellCountI, setSellCountI] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(itemId);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
       const rev = (v) => toman && v ? v * 10 : v;
        const payload = { symbol, buy_price: rev(buyPrice), quantity, sell_price: rev(sellPrice) || null, last_price: rev(lastPrice) || null, pe: pe || null, buy_i_volume: buyIVolume, buy_count_i: buyCountI, sell_i_volume: sellIVolume, sell_count_i: sellCountI, is_custom: !isApiSymbol };
      if (isEdit) {
        await api.put(`/portfolios/${portfolioId}/items/${itemId}`, payload);
      } else {
        await api.post(`/portfolios/${portfolioId}/items`, payload);
      }
      try { await api.post('/stocks/refresh', { manual: false }); } catch {}
      onSave();
    } catch (err) { setError(err.response?.data?.message || 'خطا'); } finally { setLoading(false); }
  };
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 rtl-text">{isEdit ? 'ویرایش سهم' : 'افزودن سهم به پرتفو'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
        <div>
          <label className="text-[10px] text-slate-400 rtl-text block mb-1">نماد</label>
          <SymbolSearch
            value={symbol}
            onChange={(val) => { setSymbol(val); setIsApiSymbol(false); }}
            onSelect={(s) => { setIsApiSymbol(true); setSymbol(s.name); if (s.pl) setLastPrice(String(Math.round(toman ? s.pl / 10 : s.pl))); if (s.pe) setPe(String(s.pe)); if (s.Buy_I_Volume) setBuyIVolume(s.Buy_I_Volume); if (s.Buy_CountI) setBuyCountI(s.Buy_CountI); if (s.Sell_I_Volume) setSellIVolume(s.Sell_I_Volume); if (s.Sell_CountI) setSellCountI(s.Sell_CountI); }}
            autoFocus={!isEdit}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 rtl-text block mb-1">آخرین قیمت ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
             <input type="number" inputMode="numeric" value={lastPrice} onChange={(e) => setLastPrice(stripCommas(e.target.value))} dir="ltr" className="input-field text-xs py-2 text-left" readOnly={isApiSymbol} />
           </div>
           <div>
             <label className="text-[10px] text-slate-400 rtl-text block mb-1">قیمت خرید ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
             <input type="number" inputMode="numeric" value={buyPrice} onChange={(e) => setBuyPrice(stripCommas(e.target.value))} dir="ltr" className="input-field text-xs py-2 text-left" required />
           </div>
         </div>
         <div className="grid grid-cols-2 gap-2">
           <div>
             <label className="text-[10px] text-slate-400 rtl-text block mb-1">تعداد</label>
             <input type="number" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(stripCommas(e.target.value))} dir="ltr" className="input-field text-xs py-2 text-left" required />
           </div>
           <div>
             <label className="text-[10px] text-slate-400 rtl-text block mb-1">قیمت فروش ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
             <input type="number" inputMode="numeric" value={sellPrice} onChange={(e) => setSellPrice(stripCommas(e.target.value))} dir="ltr" className="input-field text-xs py-2 text-left" />
          </div>
        </div>
        {error && <p className="text-[10px] text-danger">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5 px-3">{loading ? '...' : isEdit ? 'ذخیره تغییرات' : 'ذخیره'}</button>
          <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
        </div>
      </form>
    </div>
  );
}

function LevelEditorPopup({ portfolioId, itemId, item, unit, onClose, onSave }) {
  const toman = unit === 'toman';
  const conv = (v) => toman && v ? v / 10 : v;
  const rev = (v) => toman && v ? v * 10 : v;
  const [resistance1, setResistance1] = useState(cleanNum(conv(item.resistance_1)));
  const [resistance2, setResistance2] = useState(cleanNum(conv(item.resistance_2)));
  const [support1, setSupport1] = useState(cleanNum(conv(item.support_1)));
  const [support2, setSupport2] = useState(cleanNum(conv(item.support_2)));
  const [smsR1, setSmsR1] = useState(item.sms_resistance_1_count || 0);
  const [smsR2, setSmsR2] = useState(item.sms_resistance_2_count || 0);
  const [smsS1, setSmsS1] = useState(item.sms_support_1_count || 0);
  const [smsS2, setSmsS2] = useState(item.sms_support_2_count || 0);
  const [smsCooldown, setSmsCooldown] = useState(item.sms_cooldown_minutes || 60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/portfolios/${portfolioId}/items/${itemId}`, {
        symbol: item.symbol,
        buy_price: item.buy_price,
        quantity: item.quantity,
        sell_price: item.sell_price,
        last_price: item.last_price,
        resistance_1: rev(resistance1) || null,
        resistance_2: rev(resistance2) || null,
        support_1: rev(support1) || null,
        support_2: rev(support2) || null,
        sms_resistance_1_count: parseInt(smsR1) || 0,
        sms_resistance_2_count: parseInt(smsR2) || 0,
        sms_support_1_count: parseInt(smsS1) || 0,
        sms_support_2_count: parseInt(smsS2) || 0,
        sms_cooldown_minutes: parseInt(smsCooldown) || 60,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const unitLabel = toman ? 'تومان' : 'ریال';
  const [sentCounts, setSentCounts] = useState({});

  useEffect(() => {
    if (item?.symbol) {
      api.get(`/user-symbol-levels/${item.symbol}/sent-counts`).then(r => setSentCounts(r.data?.data || {})).catch(() => {});
    }
  }, [item?.symbol]);

  const SmsBtn = ({ levelKey, value, onChange }) => {
    const enabled = value > 0;
    const sent = sentCounts[levelKey] || 0;
    const completed = enabled && sent >= value;

    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(enabled ? 0 : 1)}
          className={`h-[30px] w-6 rounded-lg text-[8px] font-bold transition-all flex items-center justify-center ${enabled ? (completed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' : 'bg-brand-500 text-white') : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          title={enabled ? (completed ? 'تمام شده — کلیک: غیرفعال' : 'فعال — کلیک: غیرفعال') : 'غیرفعال — کلیک: فعال'}>
          {completed ? '✔' : enabled ? '●' : '○'}
        </button>
        {enabled && (
          <div className="flex items-center h-[30px] rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="px-1 py-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">−</button>
            <span className="px-1 text-[9px] font-bold text-slate-700 dark:text-slate-300 min-w-[16px] text-center">{value}</span>
            <button type="button" onClick={() => onChange(Math.min(100, value + 1))} className="px-1 py-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">+</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">سطوح {item.symbol}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1.5">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-2 space-y-1">
              <div className="space-y-1">
                <div>
                  <label className="text-[10px] font-bold text-red-500 block mb-0.5">مقاومت ۱</label>
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" value={resistance1} onChange={(e) => setResistance1(stripCommas(e.target.value))} dir="ltr" className="input-field text-[11px] py-1 flex-1 text-left border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400" placeholder={unitLabel} />
                    <SmsBtn levelKey="resistance_1" value={smsR1} onChange={setSmsR1} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-red-500 block mb-0.5">مقاومت ۲</label>
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" value={resistance2} onChange={(e) => setResistance2(stripCommas(e.target.value))} dir="ltr" className="input-field text-[11px] py-1 flex-1 text-left border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400" placeholder={unitLabel} />
                    <SmsBtn levelKey="resistance_2" value={smsR2} onChange={setSmsR2} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-green-50 dark:bg-green-900/10 p-2 space-y-1">
              <div className="space-y-1">
                <div>
                  <label className="text-[10px] font-bold text-green-500 block mb-0.5">حمایت ۱</label>
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" value={support1} onChange={(e) => setSupport1(stripCommas(e.target.value))} dir="ltr" className="input-field text-[11px] py-1 flex-1 text-left border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400" placeholder={unitLabel} />
                    <SmsBtn levelKey="support_1" value={smsS1} onChange={setSmsS1} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-green-500 block mb-0.5">حمایت ۲</label>
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" value={support2} onChange={(e) => setSupport2(stripCommas(e.target.value))} dir="ltr" className="input-field text-[11px] py-1 flex-1 text-left border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400" placeholder={unitLabel} />
                    <SmsBtn levelKey="support_2" value={smsS2} onChange={setSmsS2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(() => {
            const showCooldown = [smsR1, smsR2, smsS1, smsS2].some(v => v >= 2);
            return (
              <div className={`flex items-center gap-2 rounded-lg p-2 border transition-opacity ${showCooldown ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100/50 dark:border-slate-800/50 opacity-40'}`}>
                <span className="text-[9px] text-slate-400 shrink-0">حداقل فاصله ارسال:</span>
                <input type="number" inputMode="numeric" min="1" max="1440" value={smsCooldown} onChange={(e) => setSmsCooldown(e.target.value)} disabled={!showCooldown} className="input-field text-[10px] py-0.5 px-1.5 w-12 text-center disabled:opacity-50 disabled:cursor-not-allowed" />
                <span className="text-[8px] text-slate-400">دقیقه</span>
              </div>
            );
          })()}

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5 space-y-1.5 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">راهنمای پیامک سطوح</p>
            <div className="space-y-1 text-[8px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <div className="flex items-start gap-1.5">
                <span className="text-slate-400 shrink-0">○</span>
                <span>غیرفعال: پیامکی ارسال نمی‌شود.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-brand-500 shrink-0">●</span>
                <span>فعال: با +/− تعداد ارسال را مشخص کنید. ۱ = فقط یک‌بار.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0">✔</span>
                <span>تمام شده. کلیک کنید تا غیرفعال شود.</span>
              </div>
            </div>
          </div>

          {error && <p className="text-[10px] text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-3">{saving ? '...' : 'ذخیره سطوح'}</button>
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PortfolioSmsPopup({ portfolio, times: initialTimes, onClose, onSave }) {
  const [times, setTimes] = useState(
    initialTimes.length > 0
      ? initialTimes.map(t => ({ ...t }))
      : [{ id: null, send_time: '17:00', enabled: true }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addTime = () => {
    setTimes(prev => [...prev, { id: null, send_time: '17:00', enabled: true }]);
  };

  const removeTime = (idx) => {
    setTimes(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTime = (idx, field, value) => {
    setTimes(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async () => {
    if (times.length === 0) {
      setError('حداقل یک زمان ارسال لازم است');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(`/portfolio-sms-settings/${portfolio.id}`, {
        times: times.map(t => ({ send_time: (t.send_time || '').slice(0, 5), enabled: t.enabled })),
      });
      onSave(times.map(t => ({ ...t })));
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">پیامک روزانه {portfolio.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div className="space-y-3">
          {times.map((t, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <input
                type="time"
                value={t.send_time}
                onChange={(e) => updateTime(idx, 'send_time', e.target.value)}
                className="input-field text-xs py-1.5 flex-1"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => updateTime(idx, 'enabled', !t.enabled)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${t.enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${t.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              {times.length > 1 && (
                <button onClick={() => removeTime(idx)} className="text-slate-400 hover:text-danger text-xs shrink-0">&times;</button>
              )}
            </div>
          ))}

          <button onClick={addTime} className="w-full text-[10px] text-brand-500 hover:text-brand-600 py-1.5 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
            + افزودن زمان
          </button>

          <div className="text-[10px] text-slate-400 rtl-text bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
            <p className="mb-1">📱 محتوای پیامک:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>ارزش فعلی پرتفو</li>
              <li>سود/زیان محقق نشده (مبلغ + درصد)</li>
            </ul>
          </div>

          {error && <p className="text-[10px] text-danger">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary text-xs py-1.5 px-3 flex-1">
              {saving ? '...' : 'ذخیره'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioAllocationChart({ items, unit, sellFilter, plMode }) {
  const filtered = useMemo(() => {
    if (!items) return [];
    if (sellFilter === 'sold') return items.filter((i) => i.sell_price && i.sell_price > 0);
    if (sellFilter === 'unsold') return items.filter((i) => !i.sell_price || i.sell_price <= 0);
    return items.filter((i) => {
      const hasSell = i.sell_price && i.sell_price > 0;
      const hasLast = i.last_price && i.last_price > 0;
      if (plMode === 'realized') return hasSell;
      if (plMode === 'unrealized') return !hasSell && hasLast;
      return true;
    });
  }, [items, sellFilter, plMode]);

  const allocation = useMemo(() => {
    const values = new Map();

    filtered.forEach((item) => {
      const price = SafeNumber(item.sell_price) > 0
        ? SafeNumber(item.sell_price)
        : (SafeNumber(item.last_price) > 0 ? SafeNumber(item.last_price) : SafeNumber(item.buy_price));
      const value = price * SafeNumber(item.quantity);

      if (item.symbol && value > 0) {
        values.set(item.symbol, (values.get(item.symbol) || 0) + value);
      }
    });

    const sorted = [...values.entries()].sort(([, left], [, right]) => right - left);
    const leading = sorted.slice(0, 6);
    const otherValue = sorted.slice(6).reduce((sum, [, value]) => sum + value, 0);

    if (otherValue > 0) leading.push(['سایر', otherValue]);

    return leading;
  }, [filtered]);

  const totalValue = useMemo(() => allocation.reduce((sum, [, value]) => sum + value, 0), [allocation]);

  const chartData = useMemo(() => {
    if (allocation.length === 0) return null;

    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6', '#94A3B8'];

    return {
      labels: allocation.map(([symbol]) => symbol),
      datasets: [{
        data: allocation.map(([, value]) => value),
        backgroundColor: allocation.map((_, index) => colors[index % colors.length]),
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 8,
      }],
    };
  }, [allocation]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', padding: 12, color: '#94A3B8', font: { size: 10 } },
      },
      tooltip: {
        direction: 'rtl',
        bodyAlign: 'right',
        titleAlign: 'right',
        displayColors: false,
        padding: 10,
        cornerRadius: 8,
        backgroundColor: '#0F172A',
        bodyFont: { size: 11, family: "'Vazirmatn', system-ui, sans-serif" },
        callbacks: {
          label: (context) => {
            const value = context.parsed || 0;
            const amount = unit === 'toman' ? value / 10 : value;
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
            return `${amount.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'} (${percentage.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪)`;
          },
        },
      },
    },
  }), [totalValue, unit]);

  if (!chartData) return <div className="h-full flex items-center justify-center text-slate-400 text-xs rtl-text">داده‌ای برای نمایش ترکیب دارایی‌ها وجود ندارد.</div>;

  const displayedTotal = unit === 'toman' ? totalValue / 10 : totalValue;

  return (
    <div className="relative h-full">
      <Doughnut key={`portfolio-allocation-${unit}`} data={chartData} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pr-16">
        <span className="text-[10px] text-slate-400 rtl-text">ارزش کل</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{displayedTotal.toLocaleString('fa-IR', { notation: 'compact', maximumFractionDigits: 1 })}</span>
      </div>
    </div>
  );
}

function PLChart({ items, showAmount, unit, plMode }) {
   const chartData = useMemo(() => {
      const valid = items.filter((i) => {
        if (!i.buy_price || i.buy_price <= 0 || !i.symbol) return false;
        const hasSell = i.sell_price && i.sell_price > 0;
        const hasLast = i.last_price && i.last_price > 0;
        if (plMode === 'realized') return hasSell;
        if (plMode === 'unrealized') return !hasSell && hasLast;
        return hasSell || hasLast;
      });
     if (valid.length === 0) return null;

      // build combined array then sort
      const combined = valid.map((i) => {
        const sellPrice = (i.sell_price && i.sell_price > 0) ? i.sell_price : i.last_price;
        const pct = SafeNumber(((sellPrice - i.buy_price) / i.buy_price * 100).toFixed(1));
        const rawAmount = (SafeNumber(sellPrice) - SafeNumber(i.buy_price)) * SafeNumber(i.quantity);
        const amount = unit === 'toman' ? rawAmount / 10 : rawAmount;
        return { symbol: i.symbol, pct, amount };
      });

      // when showing % → sort by pct desc; when showing amount → sort by amount desc
      combined.sort((a, b) => showAmount ? b.amount - a.amount : b.pct - a.pct);

      const labels = combined.map((c) => c.symbol);
      const percentages = combined.map((c) => c.pct);
      const amounts = combined.map((c) => c.amount);

    const data = showAmount ? amounts : percentages;
    const bgColors = data.map((d) => d >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)');
    return {
      labels,
datasets: [{
         label: plMode === 'all' ? 'سود/ضرر (محقق شده + نشده)' : plMode === 'realized' ? 'سود/ضرر (محقق شده)' : 'سود/ضرر (محقق نشده)',
        data,
        profitLossAmounts: amounts,
        profitLossPercentages: percentages,
        backgroundColor: bgColors,
        borderColor: data.map((d) => d >= 0 ? '#059669' : '#dc2626'),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.72,
      }],
    };
  }, [items, showAmount, unit, plMode]);
  const options = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { direction: 'rtl', bodyAlign: 'right', titleAlign: 'right', displayColors: false, padding: 10, cornerRadius: 8, bodyFont: { size: 11, family: "'Vazirmatn', system-ui, sans-serif" }, backgroundColor: '#0F172A', callbacks: { label: (ctx) => `درصد: ${(ctx.dataset.profitLossPercentages?.[ctx.dataIndex] ?? 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`, afterLabel: (ctx) => `مبلغ: ${(ctx.dataset.profitLossAmounts?.[ctx.dataIndex] ?? 0).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'}`, labelTextColor: (ctx) => (ctx.dataset.profitLossPercentages?.[ctx.dataIndex] ?? 0) >= 0 ? '#34D399' : '#F87171' } } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#94A3B8', font: { size: 9, weight: '600' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
      },
      y: {
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.16)', drawTicks: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 9 },
          padding: 6,
          maxTicksLimit: 4,
          callback: (value) => `${Number(value).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}${showAmount ? '' : '٪'}`,
        },
      },
    },
  }), [showAmount, unit]);
  if (!chartData) return <div className="h-24 flex items-center justify-center text-slate-300 text-xs">بدون داده فروش</div>;
  return <div className="h-full"><Bar key="pl-chart" data={chartData} options={options} /></div>;
}

function TreemapChart({ items, unit, sellFilter, plMode, colorMode }) {
  const isDark = document.documentElement.classList.contains('dark');
  const chartRef = useRef(null);
  const prevColorModeRef = useRef(null);
  const shouldAnimate = prevColorModeRef.current !== colorMode;

  useEffect(() => {
    prevColorModeRef.current = colorMode;
  });

  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (sellFilter === 'sold') return items.filter((i) => i.sell_price && i.sell_price > 0);
    if (sellFilter === 'unsold') return items.filter((i) => !i.sell_price || i.sell_price <= 0);
    return items.filter((i) => {
      const hasSell = i.sell_price && i.sell_price > 0;
      const hasLast = i.last_price && i.last_price > 0;
      if (plMode === 'realized') return hasSell;
      if (plMode === 'unrealized') return !hasSell && hasLast;
      return hasSell || hasLast;
    });
  }, [items, sellFilter, plMode]);

  const treemapData = useMemo(() => {
    if (filteredItems.length === 0) return [];
    return filteredItems
      .filter((i) => i.symbol && i.symbol.trim() !== '' && ((i.last_price && i.last_price > 0) || (i.sell_price && i.sell_price > 0)))
      .map((i) => {
        const price = (i.sell_price && i.sell_price > 0) ? i.sell_price : (i.last_price || i.buy_price);
        const qty = SafeNumber(i.quantity);
        const rawValue = SafeNumber(price) * qty;
        const sellComm = i._commEnabled ? rawValue * i._commRate : 0;
        const value = rawValue - sellComm;
        const buyTotal = SafeNumber(i.buy_price) * qty;
        const pl = value - buyTotal;
        const plPct = buyTotal > 0 ? ((pl / buyTotal) * 100) : 0;
        const hasSell = i.sell_price && i.sell_price > 0;
        const size = colorMode === 'performance' ? Math.abs(pl) : value;
        return { symbol: i.symbol, value, pl, plPct, hasSell, size, item: i };
      });
  }, [filteredItems, colorMode]);

   const options = useMemo(() => ({
     responsive: true,
     maintainAspectRatio: false,
     animation: shouldAnimate,
     onClick: (event, elements, chart) => {
       const tooltip = chart.tooltip;
       if (elements.length === 0) {
         tooltip.setActiveElements([]);
         chart.update('none');
         return;
       }
       const activeEls = tooltip.getActiveElements();
       if (activeEls.length > 0 && activeEls[0].datasetIndex === elements[0].datasetIndex && activeEls[0].index === elements[0].index) {
         tooltip.setActiveElements([]);
         chart.update('none');
       }
     },
     plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        direction: 'rtl',
        bodyAlign: 'right',
        titleAlign: 'right',
        displayColors: false,
        boxWidth: 0,
        boxHeight: 0,
        padding: 10,
        cornerRadius: 8,
        backgroundColor: '#0F172A',
        titleFont: { size: 11, weight: '600', family: "'Vazirmatn', system-ui, sans-serif" },
        bodyFont: { size: 11, family: "'Vazirmatn', system-ui, sans-serif" },
        callbacks: {
          title: (items) => {
            const raw = items[0]?.raw;
            const d = Array.isArray(raw?._data) ? raw._data[0] : raw?._data;
            return d?.symbol || raw?.g || items[0]?.label || '';
          },
          labelTextColor: (ctx) => {
            const raw = ctx.raw;
            const d = Array.isArray(raw?._data) ? raw._data[0] : raw?._data;
            const symbol = d?.symbol || raw?.g || '';
            const match = treemapData.find(i => i.symbol === symbol);
            return (match?.plPct ?? 0) >= 0 ? '#34D399' : '#F87171';
          },
          label: (ctx) => {
            const raw = ctx.raw;
            const d = Array.isArray(raw?._data) ? raw._data[0] : raw?._data;
            const symbol = d?.symbol || raw?.g || '';
            const match = treemapData.find(i => i.symbol === symbol);
            if (!match) return '';
            const value = match.value;
            const pl = match.pl;
            const plPct = match.plPct;
            if (!value) return '';
            const amount = unit === 'toman' ? value / 10 : value;
            const plAmount = unit === 'toman' ? pl / 10 : pl;
            const plPctStr = plPct.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
            return [
              `ارزش: ${amount.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'}`,
              `سود/زیان: ${plAmount.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'} (${plPctStr}٪)`
            ];
          },
        },
      },
    },
  }), [unit, treemapData, shouldAnimate]);

  if (treemapData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-xs rtl-text">داده‌ای برای نمایش نقشه درختی وجود ندارد.</div>;
  }

  return (
    <div className="h-full">
      <ChartComponent
        key={colorMode}
        ref={chartRef}
        type="treemap"
        options={options}
        data={{
          datasets: [{
            label: 'دارایی‌ها',
            tree: treemapData,
            key: 'size',
            groups: ['symbol'],
            spacing: 1,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            backgroundColor: (ctx) => {
              const raw = ctx.raw;
              const d = Array.isArray(raw?._data) ? raw._data[0] : raw?._data;
              const symbol = d?.symbol || raw?.g || '';
              const match = treemapData.find(i => i.symbol === symbol);
              const orig = match?.item;
              const value = match?.value ?? 0;
              const totalVal = treemapData.reduce((s, i) => s + (i.value || 0), 0);
              if (!value || !totalVal) return '#6366F1';
              if (colorMode === 'performance') {
                const plPct = match?.plPct ?? 0;
                if (plPct >= 0) {
                  const intensity = Math.min(Math.abs(plPct) / 100, 1);
                  const alpha = isDark ? (0.35 + intensity * 0.55) : (0.7 + intensity * 0.3);
                  return `rgba(16, 185, 129, ${alpha})`;
                }
                const intensity = Math.min(Math.abs(plPct) / 100, 1);
                const alpha = isDark ? (0.35 + intensity * 0.55) : (0.7 + intensity * 0.3);
                return `rgba(239, 68, 68, ${alpha})`;
              }
              const ratio = value / totalVal;
              const alpha = isDark ? (0.25 + ratio * 0.75) : (0.65 + ratio * 0.35);
              return `rgba(99, 102, 241, ${Math.min(alpha, 1)})`;
            },
            labels: {
              display: true,
              align: 'center',
              position: 'middle',
              overflow: 'fit',
              color: '#F8FAFC',
              font: { size: 10, weight: '600', family: "'Vazirmatn', system-ui, sans-serif" },
              formatter: (ctx) => {
                const raw = ctx.raw;
                const d = Array.isArray(raw?._data) ? raw._data[0] : raw?._data;
                const symbol = d?.symbol || raw?.g || '';
                const match = treemapData.find(i => i.symbol === symbol);
                if (colorMode === 'performance') {
                  const pl = match?.pl;
                  if (pl === undefined || pl === null) return [symbol, ''];
                  const plAmount = unit === 'toman' ? pl / 10 : pl;
                  const amountStr = plAmount.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
                  return [symbol, amountStr];
                }
                const value = match?.value ?? 0;
                const totalVal = treemapData.reduce((s, i) => s + (i.value || 0), 0);
                const pct = totalVal > 0 ? ((value / totalVal) * 100) : 0;
                const pctStr = pct.toLocaleString('fa-IR', { maximumFractionDigits: 1 });
                return [symbol, `${pctStr}٪`];
              },
            },
            captions: { display: false },
          }],
        }}
      />
    </div>
  );
}
