export function toPersianNum(n) {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
}

export function calculateProfitLoss(buyPrice, sellPrice) {
  if (!buyPrice || buyPrice === 0) return 0;
  if (!sellPrice || sellPrice === 0) return 0;
  return ((sellPrice - buyPrice) / buyPrice) * 100;
}

export function calculateProfitLossFromSupport(buyPrice, supportLevel) {
  if (!buyPrice || buyPrice === 0) return 0;
  if (!supportLevel) return 0;
  return ((supportLevel - buyPrice) / buyPrice) * 100;
}

export function calculateProfitLossFromResistance(buyPrice, resistanceLevel) {
  if (!buyPrice || buyPrice === 0) return 0;
  if (!resistanceLevel) return 0;
  return ((resistanceLevel - buyPrice) / buyPrice) * 100;
}

export function formatPercent(value) {
  const num = Number(value);
  if (isNaN(num)) return '۰';
  return num.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPrice(value, unit = 'rial', decimals = 0) {
  if (value == null || value === '') return '—';
  const v = unit === 'toman' ? Number(value) / 10 : Number(value);
  return v.toLocaleString('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatNumber(value, unit = 'rial') {
  if (value == null || value === '') return '—';
  const v = unit === 'toman' ? Number(value) / 10 : Number(value);
  return v.toLocaleString('fa-IR');
}

export function totalValue(items) {
  return items.reduce((sum, item) => {
    const price = item.sell_price && item.sell_price > 0 ? item.sell_price : item.buy_price;
    return sum + price * item.quantity;
  }, 0);
}

export function totalCost(items) {
  return items.reduce((sum, item) => sum + item.buy_price * item.quantity, 0);
}

export function totalProfitLoss(items) {
  return items.reduce((sum, item) => {
    if (item.sell_price && item.sell_price > 0) {
      return sum + (item.sell_price - item.buy_price) * item.quantity;
    }
    return sum;
  }, 0);
}

export function profitLossPercent(items) {
  const cost = totalCost(items);
  if (cost === 0) return 0;
  return (totalProfitLoss(items) / cost) * 100;
}