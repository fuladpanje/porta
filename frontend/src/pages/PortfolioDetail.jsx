import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, PlusCircle, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { formatPrice, formatPercent, formatNumber, toPersianNum } from '../lib/calculations';

export default function PortfolioDetail() {
  const { id } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/portfolios/${id}`);
      setPortfolio(res.data.data);
    } catch (err) {
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = async (itemId) => {
    if (!window.confirm('آیا از حذف این آیتم مطمئن هستید؟')) return;
    await api.delete(`/portfolios/${id}/items/${itemId}`);
    fetchData();
  };

  const handleRefreshPrices = async () => {
    try {
      setRefreshing(true);
      await api.post('/stocks/refresh');
      fetchData();
    } catch (err) {
      toast.error('خطا در بروزرسانی قیمت‌ها');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-white dark:bg-slate-900/60 border border-border rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-white dark:bg-slate-900/60 border border-border rounded-xl" />
        ))}
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted-foreground rtl-text">پرتفویی یافت نشد</p>
        <Link to="/dashboard" className="text-brand-600 dark:text-brand-400 hover:underline mt-4 inline-block rtl-text">
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت به داشبورد
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground rtl-text">{portfolio.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {toPersianNum(portfolio.items.length)} آیتم | ارزش کل: {typeof portfolio.total_value === 'number' ? portfolio.total_value.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'} ریال
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={handleRefreshPrices}
            disabled={refreshing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'بروزرسانی...' : 'بروزرسانی قیمت‌ها'}
          </button>
          <Link
            to={`/portfolios/${id}/items/new`}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            افزودن آیتم
          </Link>
        </div>
      </div>

      {portfolio.items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground rtl-text">هنوز آیتمی اضافه نشده</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolio.items.map((item) => (
            <div key={item.id} className="card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in">
<div className="flex-1">
                  <h3 className="font-medium text-foreground rtl-text text-lg">{item.symbol}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      خرید: {formatPrice(item.buy_price)} × {formatNumber(item.quantity)}
                    </span>
                    {item.last_price && (
                      <span className="text-sm text-brand-600 dark:text-brand-400 font-medium">
                        آخرین قیمت: {formatPrice(item.last_price)}
                      </span>
                    )}
                    {item.sell_price && (
                      <span className={Number(item.sell_price) >= Number(item.buy_price) ? 'text-success' : 'text-danger'}>
                        فروش: {formatPrice(item.sell_price)} ({formatPercent(item.profit_loss)})
                      </span>
                    )}
                    {item.resistance_1 && (
                      <span className="text-sm text-success-light">مقاومت۱: {formatPrice(item.resistance_1)} ({formatPercent(item.profit_loss_from_resistance_1)})</span>
                    )}
                    {item.support_1 && (
                      <span className="text-sm text-danger-light">حمایت۱: {formatPrice(item.support_1)} ({formatPercent(item.loss_from_support_1)})</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                <Link
                  to={`/portfolios/${portfolio.id}/items/${item.id}/edit`}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}