import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

function formatPrice(price) {
  if (price == null) return '—';
  return Number(price).toLocaleString('fa-IR');
}

function CrossoverItem({ crossover, onDismiss }) {
  const isResistance = crossover.level_type?.startsWith('resistance');
  const levelLabel = crossover.level_label || (
    isResistance ? `مقاومت ${crossover.level_type === 'resistance_1' ? '۱' : '۲'}` : `حمایت ${crossover.level_type === 'support_1' ? '۱' : '۲'}`
  );

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
      isResistance
        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800'
    }`}>
      <div className={`mt-0.5 p-1.5 rounded-lg ${
        isResistance ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-sky-100 dark:bg-sky-900/50'
      }`}>
        {crossover.direction === 'up' || isResistance
          ? <TrendingUp className={`w-4 h-4 ${isResistance ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`} />
          : <TrendingDown className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-800 dark:text-white">{crossover.symbol}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isResistance
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
          }`}>
            {levelLabel}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {crossover.direction_label || (crossover.direction === 'up' ? 'شکست رو به بالا' : 'شکست رو به پایین')}
          {' — '}
          قیمت: {formatPrice(crossover.price)}
          {crossover.old_price != null && ` (${formatPrice(crossover.old_price)} → ${formatPrice(crossover.price)})`}
        </p>
        {crossover.level_value && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            سطح: {formatPrice(crossover.level_value)}
          </p>
        )}
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(crossover.id)} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors mt-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function NotificationPopup({ crossovers, onDismissAll, onDismissOne }) {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (crossovers && crossovers.length > 0) {
      setItems(crossovers);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setItems([]), 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [crossovers]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setItems([]);
      onDismissAll?.();
    }, 300);
  }, [onDismissAll]);

  if (items.length === 0) return null;

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
    }`}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              تشخیص کراس قیمت ({items.length})
            </span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {items.map((c, i) => (
            <CrossoverItem
              key={c.id || i}
              crossover={c}
              onDismiss={onDismissOne}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
