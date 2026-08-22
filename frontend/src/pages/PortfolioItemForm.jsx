import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft } from 'lucide-react';
import { ResistanceSupportForm } from '../components/PortfolioForm';
import { SymbolSearch } from '../components/SymbolSearch';
import { formatPercent, formatNumber } from '../lib/calculations';
import { useUnit } from '../contexts/UnitContext';

function stripCommas(v) {
  return v.replace(/[,،]/g, '');
}

export default function PortfolioItemForm() {
  const { portfolioId, itemId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(itemId);
  const { unit } = useUnit();

  const [symbol, setSymbol] = useState('');
  const [lastPrice, setLastPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [resistance1, setResistance1] = useState('');
  const [resistance2, setResistance2] = useState('');
  const [resistance3, setResistance3] = useState('');
  const [support1, setSupport1] = useState('');
  const [support2, setSupport2] = useState('');
  const [support3, setSupport3] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [symbolData, setSymbolData] = useState(null);
  const [isApiSymbol, setIsApiSymbol] = useState(false);

  const itemData = {
    buy_price: buyPrice,
    quantity,
    sell_price: sellPrice,
    resistance_1: resistance1,
    resistance_2: resistance2,
    resistance_3: resistance3,
    support_1: support1,
    support_2: support2,
    support_3: support3,
  };

  useEffect(() => {
    if (isEdit) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/portfolios/${portfolioId}/items/${itemId}`);
          const item = res.data.data;
          const toman = unit === 'toman';
          setSymbol(item.symbol);
          setLastPrice(toman && item.last_price ? item.last_price / 10 : (item.last_price ?? ''));
          setBuyPrice(toman && item.buy_price ? item.buy_price / 10 : item.buy_price);
          setQuantity(item.quantity);
          setSellPrice(toman && item.sell_price ? item.sell_price / 10 : (item.sell_price ?? ''));
          setResistance1(toman && item.resistance_1 ? item.resistance_1 / 10 : (item.resistance_1 ?? ''));
          setResistance2(toman && item.resistance_2 ? item.resistance_2 / 10 : (item.resistance_2 ?? ''));
          setResistance3(toman && item.resistance_3 ? item.resistance_3 / 10 : (item.resistance_3 ?? ''));
          setSupport1(toman && item.support_1 ? item.support_1 / 10 : (item.support_1 ?? ''));
          setSupport2(toman && item.support_2 ? item.support_2 / 10 : (item.support_2 ?? ''));
          setSupport3(toman && item.support_3 ? item.support_3 / 10 : (item.support_3 ?? ''));
          setIsApiSymbol(item.is_custom === false || item.is_custom === 0);
        } catch (err) {
          setError('خطا در بارگذاری اطلاعات');
        }
      };
      fetchData();
    }
  }, [isEdit, portfolioId, itemId]);

  const handleSymbolSelect = (symbolObj) => {
    setIsApiSymbol(true);
    setSymbol(symbolObj.name);
    if (symbolObj.pl != null) {
      setLastPrice(unit === 'toman' ? symbolObj.pl / 10 : symbolObj.pl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const toman = unit === 'toman';
    const data = {
      symbol,
      last_price: toman && lastPrice ? lastPrice * 10 : (lastPrice || null),
      buy_price: toman && buyPrice ? buyPrice * 10 : buyPrice,
      quantity,
      sell_price: toman && sellPrice ? sellPrice * 10 : (sellPrice || null),
      resistance_1: toman && resistance1 ? resistance1 * 10 : (resistance1 || null),
      resistance_2: toman && resistance2 ? resistance2 * 10 : (resistance2 || null),
      resistance_3: toman && resistance3 ? resistance3 * 10 : (resistance3 || null),
      support_1: toman && support1 ? support1 * 10 : (support1 || null),
      support_2: toman && support2 ? support2 * 10 : (support2 || null),
      support_3: toman && support3 ? support3 * 10 : (support3 || null),
      is_custom: !isApiSymbol,
    };

    try {
      if (isEdit) {
        await api.put(`/portfolios/${portfolioId}/items/${itemId}`, data);
      } else {
        const res = await api.post(`/portfolios/${portfolioId}/items`, data);
        if (res.data?.merged) {
          // اگر سهم تکراری بود، پیام میانگین را نمایش بده
          // همچنان به صفحه پرتفو برمی‌گردیم
        }
      }
      navigate(`/portfolios/${portfolioId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const buyPriceNum = Number(buyPrice) || 0;
  const qtyNum = Number(quantity) || 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={`/portfolios/${portfolioId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت
      </Link>

      <div className="card p-6 sm:p-8 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground mb-6 rtl-text">
          {isEdit ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}
        </h1>

        {error && (
          <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-lg text-sm font-medium mb-6" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="symbol" className="label">
                نام سهم / ارز
              </label>
              <SymbolSearch
                value={symbol}
                onChange={(val) => { setSymbol(val); setIsApiSymbol(false); }}
                onSelect={handleSymbolSelect}
                autoFocus
              />
            </div>

            {lastPrice && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">آخرین قیمت (از API)</p>
                <p className="font-medium text-foreground">
                  {unit === 'toman'
                    ? Number(lastPrice / 10).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : Number(lastPrice).toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                  } {unit === 'toman' ? 'تومان' : 'ریال'}
                </p>
              </div>
            )}

            {!lastPrice && (
              <div>
                <label htmlFor="lastPrice" className="label">
                  آخرین قیمت
                </label>
                <input
                  id="lastPrice"
                  type="number"
                  step="any"
                  min="0"
                  value={lastPrice}
                  onChange={(e) => setLastPrice(stripCommas(e.target.value))}
                  className="input-field"
                  placeholder="آخرین قیمت"
                />
              </div>
            )}

            <div>
              <label htmlFor="qty" className="label">
                تعداد
              </label>
              <input
                id="qty"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(stripCommas(e.target.value))}
                className="input-field"
                placeholder="0"
                required
              />
            </div>
          </div>

          <ResistanceSupportForm
            item={itemData}
            unit={unit}
            onChange={(updatedItem) => {
              setBuyPrice(updatedItem.buy_price ?? '');
              setQuantity(updatedItem.quantity ?? '');
              setSellPrice(updatedItem.sell_price ?? '');
              setResistance1(updatedItem.resistance_1 ?? '');
              setResistance2(updatedItem.resistance_2 ?? '');
              setResistance3(updatedItem.resistance_3 ?? '');
              setSupport1(updatedItem.support_1 ?? '');
              setSupport2(updatedItem.support_2 ?? '');
              setSupport3(updatedItem.support_3 ?? '');
            }}
          />

          <div className="border-t border-border pt-6">
            <h4 className="font-semibold text-foreground mb-3 rtl-text">پیش‌نمایش محاسبات سود/ضرر</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {buyPriceNum > 0 && qtyNum > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">ارزش کل فعلی</p>
                  <p className="font-medium text-foreground">
                    {formatNumber(buyPriceNum * qtyNum)} ریال
                  </p>
                </div>
              )}
              {sellPrice && Number(sellPrice) > 0 && buyPriceNum > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">سود/ضرر از فروش</p>
                  <p className={`font-medium ${Number(sellPrice) >= Number(buyPrice) ? 'text-success' : 'text-danger'}`}>
                    {formatPercent(((Number(sellPrice) - Number(buyPrice)) / Number(buyPrice)) * 100)}
                  </p>
                </div>
              )}
              {resistance1 && buyPriceNum > 0 && (
                <div className="bg-success-light rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">حداقل سود (مقاومت ۱)</p>
                  <p className="font-medium text-success">
                    {formatPercent(((Number(resistance1) - Number(buyPrice)) / Number(buyPrice)) * 100)}
                  </p>
                </div>
              )}
              {support1 && buyPriceNum > 0 && (
                <div className="bg-danger-light rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">حداکثر ضرر (حمایت ۱)</p>
                  <p className="font-medium text-danger">
                    {formatPercent(((Number(support1) - Number(buyPrice)) / Number(buyPrice)) * 100)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'در حال ذخیره...' : (isEdit ? 'بروزرسانی' : 'افزودن آیتم')}
          </button>
        </form>
      </div>
    </div>
  );
}