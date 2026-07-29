import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { formatPrice, formatPercent } from '../lib/calculations';

export function ProfitLossDisplay({ buyPrice, sellPrice, label }) {
  const pl = buyPrice && sellPrice && sellPrice > 0
    ? ((sellPrice - buyPrice) / buyPrice) * 100
    : null;

  if (pl === null) return null;

  return (
    <div className={clsx(
      'text-sm font-medium px-3 py-1 rounded-lg',
      pl >= 0 ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
    )}>
      {label}: {formatPercent(pl)}
    </div>
  );
}

export function ResistanceSupportForm({ item, onChange, unit = 'rial' }) {
  const unitLabel = unit === 'toman' ? 'تومان' : 'ریال';
  const handleChange = (field, value) => {
    const cleaned = value.replace(/[,،]/g, '');
    const num = cleaned === '' ? null : parseFloat(cleaned);
    onChange({ ...item, [field]: num });
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground rtl-text">مقایس سهم / ارزش رزیو</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">قیمت خرید ({unitLabel})</label>
          <input
            type="number"
            step="any"
            min="0"
            value={item.buy_price ?? ''}
            onChange={(e) => onChange({ ...item, buy_price: e.target.value.replace(/[,،]/g, '') })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">تعداد</label>
          <input
            type="number"
            step="any"
            min="0"
            value={item.quantity ?? ''}
            onChange={(e) => onChange({ ...item, quantity: e.target.value.replace(/[,،]/g, '') })}
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">قیمت فروش ({unitLabel})</label>
          <input
            type="number"
            step="any"
            min="0"
            value={item.sell_price ?? ''}
            onChange={(e) => onChange({ ...item, sell_price: e.target.value.replace(/[,،]/g, '') })}
            className="input-field"
          />
          {item.sell_price && (
            <p className={clsx(
              'text-xs mt-1 font-medium',
              Number(item.sell_price) >= Number(item.buy_price) ? 'text-success' : 'text-danger'
            )}>
              {formatPercent(((Number(item.sell_price) - Number(item.buy_price)) / Number(item.buy_price)) * 100)}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="font-semibold text-foreground mb-3 rtl-text">مقاومت‌های بعدی ({unitLabel})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={`res-${i}`}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                مقاومت {i}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={item[`resistance_${i}`] ?? ''}
                onChange={(e) => handleChange(`resistance_${i}`, e.target.value)}
                className="input-field text-sm"
              />
              {item[`resistance_${i}`] && (
                <p className="text-xs text-success mt-1 font-medium">
                  {formatPercent(((Number(item[`resistance_${i}`]) - Number(item.buy_price)) / Number(item.buy_price)) * 100)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="font-semibold text-foreground mb-3 rtl-text">حمایت‌های بعدی ({unitLabel})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={`sup-${i}`}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                حمایت {i}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={item[`support_${i}`] ?? ''}
                onChange={(e) => handleChange(`support_${i}`, e.target.value)}
                className="input-field text-sm"
              />
              {item[`support_${i}`] && (
                <p className="text-xs text-danger mt-1 font-medium">
                  {formatPercent(((Number(item[`support_${i}`]) - Number(item.buy_price)) / Number(item.buy_price)) * 100)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}