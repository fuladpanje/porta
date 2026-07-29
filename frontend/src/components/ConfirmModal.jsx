import React from 'react';

export function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm mx-4 shadow-xl animate-slide-up">
        <p className="text-sm text-slate-700 dark:text-slate-300 rtl-text">{message}</p>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">انصراف</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger text-xs py-1.5 px-3">{loading ? 'در حال پردازش...' : 'حذف'}</button>
        </div>
      </div>
    </div>
  );
}