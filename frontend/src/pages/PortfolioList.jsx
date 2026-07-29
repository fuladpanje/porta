import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PlusCircle, FolderOpen, Trash2, ArrowRight } from 'lucide-react';

export default function PortfolioList() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/portfolios');
        setPortfolios(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این پرتفویی مطمئن هستید؟')) return;
    await api.delete(`/portfolios/${id}`);
    const res = await api.get('/portfolios');
    setPortfolios(res.data.data);
  };

  const totalValue = portfolios.reduce(
    (sum, p) => sum + (p.total_value || 0),
    0
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white dark:bg-slate-900/60 border border-border rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground rtl-text">پرتفویی‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">
             ارزش کل: {totalValue.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ریال
          </p>
        </div>
        <Link to="/portfolios/new" className="btn-primary flex items-center gap-2 self-start">
          <PlusCircle className="w-5 h-5" />
          افزودن پرتفویی
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2 rtl-text">هیچ پرتفویی‌ای یافت نشد</h2>
          <p className="text-muted-foreground mb-6 rtl-text">
            اولین پرتفویی خود را اضافه کنید تا شروع کنید
          </p>
          <Link to="/portfolios/new" className="btn-primary inline-flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            افزودن پرتفویی
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="card card-interactive p-6 group animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-medium text-foreground rtl-text">{portfolio.name}</h3>
                <div className="flex gap-1">
                  <Link
                    to={`/portfolios/${portfolio.id}`}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="مشاهده"
                  >
                    <ArrowRight className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </Link>
                  <button
                    onClick={() => handleDelete(portfolio.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تعداد آیتم‌ها</span>
                  <span className="font-medium text-foreground">{portfolio.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ارزش کل</span>
                  <span className="font-medium text-foreground">
                    {typeof portfolio.total_value === 'number'
                      ? portfolio.total_value.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      : '—'}
                  </span>
                </div>
                {portfolio.total_profit_loss_percent !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">سود/ضرر</span>
                    <span className={`font-medium ${portfolio.total_profit_loss_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                      {portfolio.total_profit_loss_percent.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} درصد
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}