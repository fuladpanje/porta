import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useSize } from '../contexts/SizeContext';

export function Layout({ children }) {
  const { size } = useSize();
  const maxWidth = size === 'large' ? 'max-w-7xl' : 'max-w-5xl';

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