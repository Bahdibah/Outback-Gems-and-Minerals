const CACHE_KEY = 'productDataCache';
const CACHE_TIME_KEY = 'productDataCacheTime';
const CACHE_DURATION = 1000 * 60 * 30;
const INVENTORY_VERSION = '3.1'; // Increment this when you update inventory
const VERSION_KEY = 'inventoryVersion';

async function getProductData() {
  const now = Date.now();
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  const cachedVersion = localStorage.getItem(VERSION_KEY);

  // Check if cache is valid (not expired AND version matches)
  if (cached && cachedTime && cachedVersion === INVENTORY_VERSION && (now - cachedTime < CACHE_DURATION)) {
    return JSON.parse(cached);
  }

  // Try local inventory.json file first (fastest load)
  try {
    const localResponse = await fetch("inventory.json");
    if (localResponse.ok) {
      const data = await localResponse.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, now);
      localStorage.setItem(VERSION_KEY, INVENTORY_VERSION);
      return data;
    }
  } catch (error) {
    console.log('Local inventory.json not found, using Apps Script API fallback...');
  }

  // Fallback to Apps Script API (2-3 second delay)
  const response = await fetch("https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqqXA/exec");
  const data = await response.json();
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  localStorage.setItem(CACHE_TIME_KEY, now);
  localStorage.setItem(VERSION_KEY, INVENTORY_VERSION);
  return data;
}

// Function to clear the cache (useful for testing)
function clearProductCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIME_KEY);
  localStorage.removeItem(VERSION_KEY);
}

// Make clearProductCache available globally for debugging
window.clearProductCache = clearProductCache;

// Utility function to calculate price display for product cards
function calculatePriceDisplay(products, productId) {
  // Filter all variations of this product
  const variations = products.filter(product => product["product id"] === productId);
  
  if (variations.length === 0) return "Price unavailable";
  
  if (variations.length === 1) {
    // Single variant: show exact price
    const price = parseFloat(variations[0]["total price"]);
    return `$${price.toFixed(2)}`;
  }
  
  // Multiple variants: show price range
  const prices = variations.map(v => parseFloat(v["total price"])).filter(p => p > 0);
  if (prices.length === 0) return "Price unavailable";
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  if (minPrice === maxPrice) {
    return `$${minPrice.toFixed(2)}`;
  }
  
  // Show range for multiple prices
  return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
}