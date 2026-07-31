import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useUnit } from '../contexts/UnitContext';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { formatPrice, formatPercent, formatNumber, toPersianNum } from '../lib/calculations';
import { PlusCircle, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Trash2, BarChart3, Edit3, FolderOpen, Package, Wallet, TrendingUp, TrendingDown, Pencil, Eye, EyeOff, ArrowUpDown, Tag, CircleCheckBig, Clock, Banknote, Percent, Sigma } from 'lucide-react';
import { Chart as ChartComponent, Line, Bar, Doughnut } from 'react-chartjs-2';
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
export default function Dashboard() {
  const { dashboard, loading, refreshing, error, fetchDashboard, refreshDashboard } = usePortfolio();
  const { unit } = useUnit();
  const { user } = useAuth();
   const [showPortfolioForm, setShowPortfolioForm] = useState(false);
   const [editingPortfolio, setEditingPortfolio] = useState(null);
   const [expanded, setExpanded] = useState({});
const [showItemForm, setShowItemForm] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
    const [portfolioSort, setPortfolioSort] = useState('default');
    const [showPLAmount, setShowPLAmount] = useState(false);
    const [activeChart, setActiveChart] = useState('allocation');
    const [chartsExpanded, setChartsExpanded] = useState(true);
const [showInactiveChartItems, setShowInactiveChartItems] = useState(false);
     const [showInactivePortfolios, setShowInactivePortfolios] = useState(false);
     const [showPortfolios, setShowPortfolios] = useState(true);
     const [sellFilter, setSellFilter] = useState('all');

  const plMode = localStorage.getItem('profit_loss_by_sell') || 'all';

  useEffect(() => {
    const handler = () => {
      const mode = localStorage.getItem('profit_loss_by_sell') || 'all';
      const filterMap = { all: 'all', realized: 'sold', unrealized: 'unsold' };
      setSellFilter(filterMap[mode] || 'all');
      refreshDashboard();
    };
    window.addEventListener('pl-by-sell-changed', handler);
    return () => window.removeEventListener('pl-by-sell-changed', handler);
  }, [refreshDashboard]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

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
     const activePortfolios = showInactivePortfolios ? portfolios : portfolios.filter((p) => p.active !== false && p.active !== 0);
     let items = activePortfolios.flatMap((p) => p.items || []);
     if (!showInactiveChartItems) {
       items = items.filter((i) => i.active !== false);
     }
     return items;
   }, [portfolios, showInactivePortfolios, showInactiveChartItems]);
    const allocationItems = useMemo(() => {
      const activePortfolios = showInactivePortfolios ? portfolios : portfolios.filter((p) => p.active !== false && p.active !== 0);
      let items = activePortfolios.flatMap((p) => p.items || []);
      if (!showInactiveChartItems) {
        items = items.filter((i) => i.active !== false);
      }
      return items;
    }, [portfolios, showInactivePortfolios, showInactiveChartItems]);
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
    const raw = isNaN(num) ? String(value) : String(Math.round(isPrice && unit === 'toman' ? num / 10 : num));
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
      <div className="flex gap-2 flex-wrap">
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
            <div key={s.id} className="flex-1 min-w-[100px] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 cursor-pointer" onDoubleClick={(e) => handleCopy(e, getStatCopyValue(s), false)}>
             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider rtl-text flex items-center gap-1">
               <Icon className="w-3 h-3" /> {s.label}
             </p>
             <p className={`text-sm font-bold mt-0.5 ${s.format === 'pl' && typeof s.value === 'number' && !isNaN(s.value) ? (s.value >= 0 ? 'text-success' : 'text-danger') : s.format === 'pct' && typeof s.value === 'number' && !isNaN(s.value) ? (s.value >= 0 ? 'text-success' : 'text-danger') : 'text-slate-800 dark:text-slate-200'}`}>
                {s.format === 'num' ? toPersianNum(s.value) : s.format === 'price' && typeof s.value === 'number' && !isNaN(s.value)
                   ? toPersianNum((unit === 'toman' ? s.value / 10 : s.value).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + ' ' + (unit === 'toman' ? 'تومان' : 'ریال')
                   : s.format === 'pl' && typeof s.value === 'number' && !isNaN(s.value)
                   ? toPersianNum((unit === 'toman' ? s.value / 10 : s.value).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + ' ' + (unit === 'toman' ? 'تومان' : 'ریال')
                  : s.format === 'pct' && typeof s.value === 'number' && !isNaN(s.value)
                  ? toPersianNum(s.value.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })) + ' درصد'
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
              {activeChart === 'allocation' ? <Package className="w-4 h-4 text-brand-500" /> : activeChart === 'treemap' ? <Package className="w-4 h-4 text-brand-500" /> : activeChart === 'price' ? <BarChart3 className="w-4 h-4 text-brand-500" /> : <TrendingUp className="w-4 h-4 text-brand-500" />}
              {activeChart === 'allocation' ? 'ترکیب ارزش دارایی‌ها' : activeChart === 'treemap' ? 'نقشه درختی دارایی‌ها' : activeChart === 'price' ? 'نمودار قیمت‌ها' : 'سود و زیان'}
            </h2>
            <div className="flex items-center gap-2">
              {chartsExpanded && <div role="tablist" aria-label="نمودارهای داشبورد" className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[
                { id: 'allocation', label: 'ترکیب' },
                { id: 'treemap', label: 'نقشه درختی' },
                { id: 'price', label: 'قیمت' },
                { id: 'profitLoss', label: 'سود و زیان' },
              ].map((chart) => (
                <button
                  key={chart.id}
                  type="button"
                  role="tab"
                  aria-selected={activeChart === chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  className={`px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-colors rtl-text ${activeChart === chart.id ? 'bg-white dark:bg-slate-700 text-brand-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {chart.label}
                </button>
              ))}
              </div>}
            </div>
          </div>

        <div className="relative bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          {chartsExpanded && (
             <div className="flex items-center gap-4 mb-2 flex-row-reverse">
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
             {activeChart === 'allocation' && <PortfolioAllocationChart items={allItems} unit={unit} />}
              {activeChart === 'treemap' && <TreemapChart items={allItems} unit={unit} />}
              {activeChart === 'price' && <PriceChart items={allItems} unit={unit} />}
              {activeChart === 'profitLoss' && <PLChart items={allItems} showAmount={showPLAmount} unit={unit} />}
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
                  setSellFilter(next);
                  const plMap = { all: 'all', sold: 'realized', unsold: 'unrealized' };
                  localStorage.setItem('profit_loss_by_sell', plMap[next]);
                  window.dispatchEvent(new Event('pl-by-sell-changed'));
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
                <span className={`hidden sm:inline ${portfolioSort === 'profit' ? 'text-emerald-500' : portfolioSort === 'percent' ? 'text-blue-500' : ''}`}>{portfolioSort === 'default' ? 'پیش‌فرض' : portfolioSort === 'profit' ? 'مبلغ' : 'درصد'}</span>
              </button>
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
case 'pl': aVal = (SafeNumber(a.sell_price) > 0 || SafeNumber(a.last_price) > 0) ? ((SafeNumber(a.sell_price) > 0 ? SafeNumber(a.sell_price) : SafeNumber(a.last_price)) - SafeNumber(a.buy_price)) * SafeNumber(a.quantity) : 0; bVal = (SafeNumber(b.sell_price) > 0 || SafeNumber(b.last_price) > 0) ? ((SafeNumber(b.sell_price) > 0 ? SafeNumber(b.sell_price) : SafeNumber(b.last_price)) - SafeNumber(b.buy_price)) * SafeNumber(b.quantity) : 0; break;
                   case 'pct': aVal = (SafeNumber(a.sell_price) > 0 || SafeNumber(a.last_price) > 0) ? (((SafeNumber(a.sell_price) > 0 ? SafeNumber(a.sell_price) : SafeNumber(a.last_price)) - SafeNumber(a.buy_price)) / SafeNumber(a.buy_price)) * 100 : 0; bVal = (SafeNumber(b.sell_price) > 0 || SafeNumber(b.last_price) > 0) ? (((SafeNumber(b.sell_price) > 0 ? SafeNumber(b.sell_price) : SafeNumber(b.last_price)) - SafeNumber(b.buy_price)) / SafeNumber(b.buy_price)) * 100 : 0; break;
                  case 'resistance': aVal = SafeNumber(a.last_price) > 0 && SafeNumber(a.resistance_1) > 0 ? (SafeNumber(a.resistance_1) - SafeNumber(a.last_price)) / SafeNumber(a.last_price) * 100 : -9999; bVal = SafeNumber(b.last_price) > 0 && SafeNumber(b.resistance_1) > 0 ? (SafeNumber(b.resistance_1) - SafeNumber(b.last_price)) / SafeNumber(b.last_price) * 100 : -9999; break;
                  case 'support': aVal = SafeNumber(a.last_price) > 0 && SafeNumber(a.support_1) > 0 ? (SafeNumber(a.last_price) - SafeNumber(a.support_1)) / SafeNumber(a.last_price) * 100 : -9999; bVal = SafeNumber(b.last_price) > 0 && SafeNumber(b.support_1) > 0 ? (SafeNumber(b.last_price) - SafeNumber(b.support_1)) / SafeNumber(b.last_price) * 100 : -9999; break;
                  default: return 0;
                }
                return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal;
              }
              return (a.active ? 0 : 1) - (b.active ? 0 : 1);
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
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{hideValues ? '—' : toPersianNum((unit === 'toman' ? pv / 10 : pv).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })) + ' ' + (unit === 'toman' ? 'تومان' : 'ریال')}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{sellFilter === 'sold' ? 'محقق شده (درصد)' : sellFilter === 'unsold' ? 'محقق نشده (درصد)' : plMode === 'all' ? 'محقق شده + نشده (درصد)' : plMode === 'realized' ? 'محقق شده (درصد)' : 'محقق نشده (درصد)'}</span>
                          <span className={`text-xs font-bold ${pp >= 0 ? 'text-success' : 'text-danger'}`}>{toPersianNum((unit === 'toman' ? SafeNumber(portfolio._profitLoss) / 10 : SafeNumber(portfolio._profitLoss)).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }))} {unit === 'toman' ? 'تومان' : 'ریال'} {pp !== 0 && `(${toPersianNum(pp.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }))} درصد)`}</span>
                        </div>
                        <div className="sm:hidden w-full border-t border-slate-200 dark:border-slate-700" />
                        <div className="sm:hidden flex items-center gap-1 w-full justify-center">
                          <button onClick={(e) => { e.stopPropagation(); handleTogglePortfolioActive(portfolio.id, portfolio.active); }} className="p-1 rounded hover:bg-brand/10 transition-colors shrink-0" title={portfolio.active ? 'غیرفعال کردن پرتفو' : 'فعال کردن پرتفو'}>
                            {portfolio.active ? <Eye className="w-3 h-3 text-success" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
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
                              <th onClick={() => toggleSort('symbol')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('symbol', 'نماد')}</th>
                               <th onClick={() => toggleSort('last_price')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('last_price', 'آخرین')}</th>
                               <th onClick={() => toggleSort('pe')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('pe', 'P/E')}</th>
                              <th onClick={() => toggleSort('buy_price')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('buy_price', 'قیمت خرید')}</th>
                              <th onClick={() => toggleSort('quantity')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('quantity', 'تعداد')}</th>
                              <th onClick={() => toggleSort('sell_price')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('sell_price', 'فروش')}</th>
                              <th onClick={() => toggleSort('purchase_value')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('purchase_value', 'ارزش خرید')}</th>
                               <th onClick={() => toggleSort('totalValue')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('totalValue', 'ارزش کل فعلی')}</th>
                              <th onClick={() => toggleSort('resistance')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('resistance', 'مقاومت')}</th>
                              <th onClick={() => toggleSort('support')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('support', 'حمایت')}</th>
                              <th onClick={() => toggleSort('pl')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('pl', 'سود / زیان')}</th>
                              <th onClick={() => toggleSort('pct')} className="px-2 py-1.5 text-right font-medium text-slate-400 rtl-text cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">{sortLabel('pct', 'درصد')}</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-400">عملیات</th>
                            </tr>
                         </thead>
                         <tbody>
                            {pi.map((item) => {
                              if (editingItem && editingItem.itemId === item.id && editingItem.portfolioId === portfolio.id) {
                                return (
                                  <tr key={item.id}>
                                    <td colSpan={13} className="p-0">
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
                                            initialResistance1={item.resistance_1}
                                            initialResistance2={item.resistance_2}
                                            initialSupport1={item.support_1}
                                            initialSupport2={item.support_2}
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
                               const isInactive = !item.active && portfolio.active !== false && portfolio.active !== 0;
                                 return (
                                   <tr key={item.id} className={`border-b border-slate-50/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${!item.active && portfolio.active !== false && portfolio.active !== 0 ? 'opacity-75' : ''}`}>
                                    <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                                       <span className={`w-2 h-2 rounded-full shrink-0 ${isRealized ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                      {item.symbol}
                                    </td>
                                     <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.last_price)}>{item.last_price ? formatPrice(item.last_price, unit, 2) : '—'}</td>
                                       <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.pe, false)}>{item.pe ? formatPE(item.pe) : '—'}</td>
                                     <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.buy_price)}>{formatPrice(item.buy_price, unit, 2)}</td>
                                      <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.quantity, false)}>{formatNumber(item.quantity)}</td>
                                     <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, item.sell_price)}>{item.sell_price ? formatPrice(item.sell_price, unit, 2) : '—'}</td>
                                      <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, purchaseValue)}>{formatPrice(purchaseValue, unit)}</td>
                                      <td className="px-2 py-1.5 text-slate-500 cursor-pointer whitespace-nowrap" onDoubleClick={(e) => handleCopy(e, totalValue)}>{formatPrice(totalValue, unit)}</td>
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
                                 <td className={`px-2 py-1.5 font-medium cursor-pointer whitespace-nowrap ${plAmount !== null ? (isInactive ? (plAmount >= 0 ? 'text-success' : 'text-danger') : (isRealized ? (plAmount >= 0 ? 'text-success' : 'text-danger') : (plAmount >= 0 ? 'text-success opacity-90' : 'text-danger opacity-90'))) : 'text-slate-500 italic'}`} onDoubleClick={(e) => handleCopy(e, plAmount)}>
                                         {plAmount !== null ? formatPrice(plAmount, unit) : '—'}
                                     </td>
                                      <td className="px-2 py-1.5 whitespace-nowrap">
                                        {pl != null ? (
                                          <span className={`flex items-center gap-0.5 font-medium ${isInactive ? (pl >= 0 ? 'text-success' : 'text-danger') : (isRealized ? (pl >= 0 ? 'text-success' : 'text-danger') : (pl >= 0 ? 'text-success opacity-90' : 'text-danger opacity-90'))}`}>
                                             {formatPercent(pl)}
                                          </span>
                                        ) : <span className="text-slate-500 italic">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 flex items-center gap-1 whitespace-nowrap">
                                    <button onClick={() => handleToggleItemActive(portfolio.id, item.id, item.active)} disabled={portfolio.active === false || portfolio.active === 0} className={`p-0.5 rounded transition-colors ${portfolio.active === false || portfolio.active === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-brand/10'}`} title={portfolio.active === false || portfolio.active === 0 ? 'ابتدا پرتفو را فعال کنید' : (item.active ? 'غیرفعال کردن' : 'فعال کردن')}>
                                        {item.active ? <Eye className="w-3 h-3 text-success" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                      </button>
                                     <button onClick={() => setEditingItem({ portfolioId: portfolio.id, itemId: item.id })} className="p-0.5 rounded hover:bg-brand/10 transition-colors">
                                       <Pencil className="w-3 h-3 text-brand-500" />
                                     </button>
                                     <button onClick={() => handleDeleteItem(portfolio.id, item.id)} className="p-0.5 rounded hover:bg-danger/10 transition-colors">
                                       <Trash2 className="w-3 h-3 text-danger" />
                                     </button>
                                  </td>
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
                             <span className="text-emerald-500 font-bold">●</span> <span className="text-amber-500 font-bold">●</span> سهم‌های فروش رفته + سهم‌های فروش نرفته بر اساس آخرین قیمت و قیمت فروش در محاسبه لحاظ می‌شود
                           </div>
                         )}
 {plMode === 'unrealized' && (portfolio.items || []).some((item) => !item.sell_price && item.last_price) && (
                           <div className="px-3 py-1 text-[9px] text-muted-foreground border-t border-slate-100 dark:border-slate-800">
                             <span className="text-amber-500 font-bold">●</span> سهم‌های فروش نرفته (بر اساس آخرین قیمت) در محاسبه لحاظ می‌شوند
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
  return isNaN(n) ? '' : (Number.isInteger(n) ? String(n) : String(n));
}

function stripCommas(v) {
  return v.replace(/[,،]/g, '');
}

function InlineItemForm({ portfolioId, itemId, onCancel, onSave, initialSymbol, initialBuyPrice, initialQuantity, initialSellPrice, initialLastPrice, initialPe, initialResistance1, initialResistance2, initialSupport1, initialSupport2, unit }) {
  const toman = unit === 'toman';
  const conv = (v) => toman && v ? v / 10 : v;
  const [symbol, setSymbol] = useState(initialSymbol || '');
  const [buyPrice, setBuyPrice] = useState(cleanNum(conv(initialBuyPrice)));
  const [quantity, setQuantity] = useState(cleanNum(initialQuantity));
  const [sellPrice, setSellPrice] = useState(cleanNum(conv(initialSellPrice)));
  const [lastPrice, setLastPrice] = useState(cleanNum(conv(initialLastPrice)));
  const [pe, setPe] = useState(cleanNum(initialPe));
  const [resistance1, setResistance1] = useState(cleanNum(conv(initialResistance1)));
  const [resistance2, setResistance2] = useState(cleanNum(conv(initialResistance2)));
  const [support1, setSupport1] = useState(cleanNum(conv(initialSupport1)));
  const [support2, setSupport2] = useState(cleanNum(conv(initialSupport2)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(itemId);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
       const rev = (v) => toman && v ? v * 10 : v;
       const payload = { symbol, buy_price: rev(buyPrice), quantity, sell_price: rev(sellPrice) || null, last_price: rev(lastPrice) || null, pe: pe || null, resistance_1: rev(resistance1) || null, resistance_2: rev(resistance2) || null, resistance_3: null, support_1: rev(support1) || null, support_2: rev(support2) || null, support_3: null };
      if (isEdit) {
        await api.put(`/portfolios/${portfolioId}/items/${itemId}`, payload);
      } else {
        await api.post(`/portfolios/${portfolioId}/items`, payload);
      }
      onSave();
    } catch (err) { setError(err.response?.data?.message || 'خطا'); } finally { setLoading(false); }
  };
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
        <div>
          <label className="text-[10px] text-slate-400 rtl-text block mb-1">نماد</label>
          <SymbolSearch
            value={symbol}
            onChange={setSymbol}
            onSelect={(s) => { setSymbol(s.name); if (s.pl) setLastPrice(String(toman ? s.pl / 10 : s.pl)); if (s.pe) setPe(String(s.pe)); }}
            autoFocus={!isEdit}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 rtl-text block mb-1">آخرین قیمت ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
            <input type="text" inputMode="numeric" value={lastPrice} onChange={(e) => setLastPrice(stripCommas(e.target.value))} className="input-field text-xs py-2" placeholder="آخرین قیمت" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 rtl-text block mb-1">قیمت خرید ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
            <input type="text" inputMode="numeric" value={buyPrice} onChange={(e) => setBuyPrice(stripCommas(e.target.value))} className="input-field text-xs py-2" placeholder="قیمت خرید" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 rtl-text block mb-1">تعداد</label>
            <input type="text" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(stripCommas(e.target.value))} className="input-field text-xs py-2" placeholder="تعداد" required />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 rtl-text block mb-1">قیمت فروش ({unit === 'toman' ? 'تومان' : 'ریال'})</label>
            <input type="text" inputMode="numeric" value={sellPrice} onChange={(e) => setSellPrice(stripCommas(e.target.value))} className="input-field text-xs py-2" placeholder="قیمت فروش" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-red-500 rtl-text block mb-1">مقاومت ۱</label>
            <input type="text" inputMode="numeric" value={resistance1} onChange={(e) => setResistance1(stripCommas(e.target.value))} className="input-field text-xs py-2 border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400" placeholder="مقاومت ۱" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-red-500 rtl-text block mb-1">مقاومت ۲</label>
            <input type="text" inputMode="numeric" value={resistance2} onChange={(e) => setResistance2(stripCommas(e.target.value))} className="input-field text-xs py-2 border-red-200 dark:border-red-900/50 focus:ring-red-500/40 focus:border-red-400" placeholder="مقاومت ۲" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-green-500 rtl-text block mb-1">حمایت ۱</label>
            <input type="text" inputMode="numeric" value={support1} onChange={(e) => setSupport1(stripCommas(e.target.value))} className="input-field text-xs py-2 border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400" placeholder="حمایت ۱" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-green-500 rtl-text block mb-1">حمایت ۲</label>
            <input type="text" inputMode="numeric" value={support2} onChange={(e) => setSupport2(stripCommas(e.target.value))} className="input-field text-xs py-2 border-green-200 dark:border-green-900/50 focus:ring-green-500/40 focus:border-green-400" placeholder="حمایت ۲" />
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

function PortfolioAllocationChart({ items, unit }) {
  const allocation = useMemo(() => {
    const values = new Map();

    items.forEach((item) => {
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
  }, [items]);

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

function PriceChart({ items, unit }) {
    const plMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('profit_loss_by_sell') || 'all') : 'all';
    const validItems = useMemo(() => {
      if (!items || items.length === 0) return [];
      return items.filter((i) => {
        if (i.buy_price == null || i.buy_price <= 0 || !i.symbol) return false;
        const hasSell = i.sell_price && i.sell_price > 0;
        const hasLast = i.last_price && i.last_price > 0;
        if (plMode === 'realized') return hasSell;
        if (plMode === 'unrealized') return !hasSell && hasLast;
        return hasSell || hasLast;
      });
    }, [items, plMode]);
    const chartData = useMemo(() => {
      if (validItems.length === 0) return null;
      const labels = validItems.map((i) => i.symbol);
      const buyData = validItems.map((i) => SafeNumber(i.buy_price));
      const sellData = validItems.map((i) => SafeNumber(i.sell_price && i.sell_price > 0 ? i.sell_price : i.last_price));
      return {
        labels,
        datasets: [
{ label: 'خرید', data: buyData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.10)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2 },
          { label: 'فروش / آخرین قیمت', data: sellData, borderColor: '#10B981', backgroundColor: 'transparent', borderDash: [4, 4], tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        ],
     };
   }, [validItems]);
  const options = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 12, color: '#94A3B8', font: { size: 10 } } },
        tooltip: { direction: 'rtl', bodyAlign: 'right', titleAlign: 'right', displayColors: false, padding: 10, cornerRadius: 8, bodyFont: { size: 11, family: "'Vazirmatn', system-ui, sans-serif" }, backgroundColor: '#0F172A', borderColor: 'transparent', borderWidth: 0, callbacks: { label: (ctx) => { const item = validItems[ctx.dataIndex]; const value = unit === 'toman' ? (ctx.parsed?.y ?? 0) / 10 : (ctx.parsed?.y ?? 0); const label = ctx.datasetIndex === 0 ? 'خرید' : (item && item.sell_price && item.sell_price > 0 ? 'فروش' : 'آخرین قیمت'); const lines = [`${label}: ${value.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'}`]; if (item) { const sellN = item.sell_price && item.sell_price > 0 ? SafeNumber(item.sell_price) : null; const isRealized = sellN !== null; lines.push(isRealized ? 'سود محقق شده' : 'سود محقق نشده'); } return lines; }, labelTextColor: (ctx) => ctx.datasetIndex === 0 ? '#34D399' : '#F87171' } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94A3B8', font: { size: 9, weight: '600' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
      y: { border: { display: false }, grid: { color: 'rgba(148, 163, 184, 0.16)', drawTicks: false }, ticks: { color: '#94A3B8', font: { size: 9 }, padding: 6, maxTicksLimit: 4, callback: (value) => Number(unit === 'toman' ? Number(value) / 10 : value).toLocaleString('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }) } },
    },
    elements: { line: { borderWidth: 2 }, point: { radius: 2 } },
  }), [unit, validItems]);
  if (!chartData) return <div className="h-36 flex items-center justify-center text-slate-300 text-xs">بدون داده قیمت</div>;
  return <div className="h-full"><Line key="price-chart" data={chartData} options={options} /></div>;
}

function PLChart({ items, showAmount, unit }) {
   const plMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('profit_loss_by_sell') || 'all') : 'all';
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
const percentages = valid.map((i) => {
        const sellPrice = (i.sell_price && i.sell_price > 0) ? i.sell_price : i.last_price;
        return SafeNumber(((sellPrice - i.buy_price) / i.buy_price * 100).toFixed(1));
      });
      const amounts = valid.map((i) => {
        const sellPrice = (i.sell_price && i.sell_price > 0) ? i.sell_price : i.last_price;
        const amount = (SafeNumber(sellPrice) - SafeNumber(i.buy_price)) * SafeNumber(i.quantity);
       return unit === 'toman' ? amount / 10 : amount;
     });
    const data = showAmount
      ? amounts
      : percentages;
    const labels = valid.map((i) => i.symbol);
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

function TreemapChart({ items, unit }) {
  const chartRef = useRef(null);

  const treemapData = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items
      .filter((i) => i.symbol && i.symbol.trim() !== '' && ((i.last_price && i.last_price > 0) || (i.sell_price && i.sell_price > 0)))
      .map((i) => {
        const price = (i.sell_price && i.sell_price > 0) ? i.sell_price : (i.last_price || i.buy_price);
        const value = SafeNumber(price) * SafeNumber(i.quantity);
        const buyTotal = SafeNumber(i.buy_price) * SafeNumber(i.quantity);
        const pl = value - buyTotal;
        const plPct = buyTotal > 0 ? ((pl / buyTotal) * 100) : 0;
        const hasSell = i.sell_price && i.sell_price > 0;
        return { symbol: i.symbol, value, pl, plPct, hasSell };
      });
  }, [items]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        direction: 'rtl',
        bodyAlign: 'right',
        titleAlign: 'right',
        displayColors: false,
        padding: 10,
        cornerRadius: 8,
        backgroundColor: '#0F172A',
        titleFont: { size: 11, weight: '600', family: "'Vazirmatn', system-ui, sans-serif" },
        bodyFont: { size: 11, family: "'Vazirmatn', system-ui, sans-serif" },
        callbacks: {
          title: (items) => {
            const d = items[0]?.raw?._data;
            return d?.symbol || '';
          },
          label: (ctx) => {
            const d = ctx.raw?._data;
            if (!d) return '';
            const totalVal = treemapData.reduce((s, i) => s + (i.value || 0), 0);
            const amount = unit === 'toman' ? d.value / 10 : d.value;
            const pct = totalVal > 0 ? ((d.value / totalVal) * 100) : 0;
            const plSign = d.plPct >= 0 ? '+' : '';
            return `${amount.toLocaleString('fa-IR', { maximumFractionDigits: 0 })} ${unit === 'toman' ? 'تومان' : 'ریال'} (${pct.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪) | ${plSign}${d.plPct.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪ سود/زیان`;
          },
        },
      },
    },
  }), [unit, treemapData]);

  if (treemapData.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-xs rtl-text">داده‌ای برای نمایش نقشه درختی وجود ندارد.</div>;
  }

  return (
    <div className="h-full">
      <ChartComponent
        ref={chartRef}
        type="treemap"
        data={{
          datasets: [{
            tree: treemapData,
            key: 'value',
            groups: ['symbol'],
            spacing: 1,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.15)',
            backgroundColor: (ctx) => {
              if (!ctx.raw?._data || ctx.raw._data.pl === undefined) return '#6366F1';
              const pl = ctx.raw._data.pl;
              if (pl >= 0) {
                const intensity = Math.min(Math.abs(pl) / (ctx.raw._data.value || 1), 1);
                return `rgba(16, 185, 129, ${0.35 + intensity * 0.45})`;
              }
              const intensity = Math.min(Math.abs(pl) / (ctx.raw._data.value || 1), 1);
              return `rgba(239, 68, 68, ${0.35 + intensity * 0.45})`;
            },
            labels: {
              display: true,
              align: 'center',
              position: 'middle',
              overflow: 'fit',
              color: '#F8FAFC',
              font: { size: 10, weight: '600', family: "'Vazirmatn', system-ui, sans-serif" },
              formatter: (ctx) => {
                const d = ctx.raw?._data;
                if (!d || d.plPct === undefined || d.plPct === null) return [d?.symbol || '', ''];
                const pct = d.plPct >= 0 ? `+${d.plPct.toFixed(1)}%` : `${d.plPct.toFixed(1)}%`;
                return [d.symbol, pct];
              },
            },
            captions: { display: false },
            options,
          }],
        }}
      />
    </div>
  );
}
