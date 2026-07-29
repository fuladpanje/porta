import { stockApi } from './api';

const STORAGE_KEY = 'symbol_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

let cachedSymbols = null;
let lastError = null;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.time > CACHE_TTL) return null;
    return data.symbols;
  } catch {
    return null;
  }
}

function saveToStorage(symbols) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ symbols, time: Date.now() }));
  } catch {}
}

export async function searchSymbolsLocal(query) {
  if (cachedSymbols === null) {
    cachedSymbols = loadFromStorage();
  }

  if (cachedSymbols === null) {
    try {
      const res = await stockApi.searchSymbols('');
      cachedSymbols = res.data.data || [];
      if (res.data.message && cachedSymbols.length === 0) {
        lastError = res.data.message;
      } else {
        lastError = null;
        saveToStorage(cachedSymbols);
      }
    } catch (err) {
      lastError = err.response?.data?.message || 'خطا در دریافت نمادها. لطفاً کلید API را بررسی کنید.';
      cachedSymbols = [];
      throw err;
    }
  }

  const q = query.toLowerCase();
  const scored = [];

  for (const s of cachedSymbols) {
    const name = s.name.toLowerCase();
    const fullName = (s.fullName || '').toLowerCase();
    const isin = (s.isin || '').toLowerCase();
    let score = -1;

    if (name === q || fullName === q) {
      score = 100;
    } else if (name.startsWith(q)) {
      score = 90;
    } else if (fullName.startsWith(q)) {
      score = 80;
    } else if (name.includes(q)) {
      score = 50;
    } else if (fullName.includes(q)) {
      score = 40;
    } else if (isin.includes(q)) {
      score = 10;
    }

    if (score >= 0) {
      scored.push({ s, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name, 'fa'));
  return scored.map((x) => x.s);
}

export function getSymbolSearchError() {
  return lastError;
}

export function clearSymbolCache() {
  cachedSymbols = null;
  lastError = null;
  localStorage.removeItem(STORAGE_KEY);
}
