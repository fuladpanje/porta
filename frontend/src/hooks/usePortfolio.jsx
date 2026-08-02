import { useState, useCallback } from 'react';
import api from '../lib/api';

export function usePortfolio(plMode = 'all') {
  const [portfolios, setPortfolios] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard', { params: { pl_mode: plMode } });
      setDashboard(res.data.data);
      setPortfolios(res.data.data.portfolios || []);
      const allItems = res.data.data.portfolios?.flatMap((p) => p.items || []) || [];
      setItems(allItems);
      setStale(false);
    } catch (err) {
      setError(err.message);
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [plMode]);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard', { params: { pl_mode: plMode } });
      setDashboard(res.data.data);
      setPortfolios(res.data.data.portfolios || []);
      const allItems = res.data.data.portfolios?.flatMap((p) => p.items || []) || [];
      setItems(allItems);
      setStale(false);
    } catch (err) {
      setError(err.message);
      setStale(true);
    } finally {
      setRefreshing(false);
    }
  }, [plMode]);

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
    stale,
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
