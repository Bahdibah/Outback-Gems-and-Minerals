const CACHE_KEY = 'productDataCache';
const CACHE_TIME_KEY = 'productDataCacheTime';
const CACHE_DURATION = 1000 * 60 * 30;

async function getProductData() {
  const now = Date.now();
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cached && cachedTime && (now - cachedTime < CACHE_DURATION)) {
    return JSON.parse(cached);
  }

  // Try local inventory.json file first (instant load)
  try {
    const localResponse = await fetch("inventory.json");
    if (localResponse.ok) {
      const data = await localResponse.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, now);
      return data;
    }
  } catch (error) {
    console.log('Local inventory.json not found, using Apps Script API fallback');
  }

  // Fallback to Apps Script API (2-3 second delay)
  const response = await fetch("https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqqXA/exec");
  const data = await response.json();
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(CACHE_TIME_KEY, now);
  return data;
}