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

  const response = await fetch("https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec");
  const data = await response.json();
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(CACHE_TIME_KEY, now);
  return data;
}