import { stockApi } from './api';

let cachedSymbols = null;
let lastError = null;
let lastMetaData = null;
let isFromDatabaseCache = false;

export async function searchSymbolsLocal(query, force = false) {
  if (!force && cachedSymbols !== null) {
    return filterAndSort(cachedSymbols, query);
  }

  try {
    const res = await stockApi.searchSymbols('', force);
    cachedSymbols = res.data.data || [];
    isFromDatabaseCache = res.data.from_cache ?? false;
    lastMetaData = {
      from_cache: res.data.from_cache ?? false,
      last_updated: res.data.last_updated ?? null,
    };
    if (res.data.message && cachedSymbols.length === 0) {
      lastError = res.data.message;
    } else {
      lastError = null;
    }
  } catch (err) {
    lastError = err.response?.data?.message || 'خطا در دریافت نمادها.';
    throw err;
  }

  return filterAndSort(cachedSymbols, query);
}

function filterAndSort(list, query) {
  const q = query.toLowerCase();
  const scored = [];

  for (const s of list) {
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

export function getSymbolMetaData() {
  return lastMetaData;
}

export function isDataFromCache() {
  return isFromDatabaseCache;
}

export function clearSymbolCache() {
  cachedSymbols = null;
  lastError = null;
  lastMetaData = null;
  isFromDatabaseCache = false;
}
