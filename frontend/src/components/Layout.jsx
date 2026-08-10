import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useSize } from '../contexts/SizeContext';
import api from '../lib/api';

export function Layout({ children }) {
  const { size } = useSize();
  const maxWidth = size === 'fullwidth' ? '' : (size === 'large' ? 'max-w-7xl' : 'max-w-5xl');

  // بررسی دوره‌ای SMS پرتفو (هر 30 ثانیه) - مستقل از صفحه فعال
  useEffect(() => {
    const checkPortfolioSms = async () => {
      try {
        await api.post('/portfolio-sms-check');
      } catch {}
    };
    checkPortfolioSms();
    const interval = setInterval(checkPortfolioSms, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-slate-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className={`${maxWidth} mx-auto`}>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}