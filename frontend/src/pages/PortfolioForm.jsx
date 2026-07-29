import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function PortfolioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/portfolios/${id}`);
          setName(res.data.data.name);
        } catch (err) {
          setError('خطا در بارگذاری اطلاعات');
        }
      };
      fetchData();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await api.put(`/portfolios/${id}`, { name });
      } else {
        await api.post('/portfolios', { name });
      }
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت به داشبورد
      </Link>

      <div className="card p-6 sm:p-8 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground mb-6 rtl-text">
          {isEdit ? 'ویرایش پرتفویی' : 'پرتفویی جدید'}
        </h1>

        {error && (
          <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-lg text-sm font-medium mb-6" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
          <div>
            <label htmlFor="name" className="label">
              نام پرتفویی
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="مثلاً پرتفویی اصلی"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (isEdit ? 'در حال به‌روزرسانی...' : 'در حال ذخیره...') : (isEdit ? 'به‌روزرسانی' : 'ذخیره')}
          </button>
        </form>
      </div>
    </div>
  );
}