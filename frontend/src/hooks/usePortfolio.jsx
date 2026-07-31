import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const DASHBOARD_CACHE_KEY = 'api_cache_dashboard';
const DASHBOARD_CACHE_TTL = 60 * 60 * 1000;

function getCachedDashboard() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const { data, time } = JSON.parse(raw);
    if (Date.now() - time > DASHBOARD_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedDashboard(data) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data, time: Date.now() }));
  } catch {}
}

export function usePortfolio() {
  const [portfolios, setPortfolios] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async (force = false) => {
    try {
      setLoading(true);
      if (!force) {
        const cached = getCachedDashboard();
        if (cached) {
          setDashboard(cached);
          setPortfolios(cached.portfolios || []);
          const allItems = cached.portfolios?.flatMap((p) => p.items || []) || [];
          setItems(allItems);
          setLoading(false);
          return;
        }
      }
      const plMode = localStorage.getItem('profit_loss_by_sell') || 'all';
      const res = await api.get('/dashboard', { params: { pl_mode: plMode } });
      setDashboard(res.data.data);
      setPortfolios(res.data.data.portfolios || []);
      const allItems = res.data.data.portfolios?.flatMap((p) => p.items || []) || [];
      setItems(allItems);
      setCachedDashboard(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const plMode = localStorage.getItem('profit_loss_by_sell') || 'all';
      const res = await api.get('/dashboard', { params: { pl_mode: plMode } });
      setDashboard(res.data.data);
      setPortfolios(res.data.data.portfolios || []);
      const allItems = res.data.data.portfolios?.flatMap((p) => p.items || []) || [];
      setItems(allItems);
      setCachedDashboard(res.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await api.get('/portfolios');
      setPortfolios(res.data.data);
      const allItems = res.data.data.flatMap((p) => p.items || []);
      setItems(allItems);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchItems = useCallback(async (portfolioId) => {
    try {
      const res = await api.get(`/portfolios/${portfolioId}/items`);
      return res.data.data;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const createPortfolio = async (data) => {
    const res = await api.post('/portfolios', data);
    await refreshDashboard();
    return res.data.data;
  };

  const updatePortfolio = async (id, data) => {
    const res = await api.put(`/portfolios/${id}`, data);
    await refreshDashboard();
    return res.data.data;
  };

  const deletePortfolio = async (id) => {
    await api.delete(`/portfolios/${id}`);
    await refreshDashboard();
  };

  const createItem = async (portfolioId, data) => {
    const res = await api.post(`/portfolios/${portfolioId}/items`, data);
    await refreshDashboard();
    return res.data.data;
  };

  const updateItem = async (portfolioId, itemId, data) => {
    const res = await api.put(`/portfolios/${portfolioId}/items/${itemId}`, data);
    await refreshDashboard();
    return res.data.data;
  };

  const deleteItem = async (portfolioId, itemId) => {
    await api.delete(`/portfolios/${portfolioId}/items/${itemId}`);
    await refreshDashboard();
  };

  return {
    portfolios,
    items,
    dashboard,
    loading,
    refreshing,
    error,
    fetchDashboard,
    refreshDashboard,
    fetchPortfolios,
    fetchItems,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    createItem,
    updateItem,
    deleteItem,
  };
}