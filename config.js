/**
 * Client-side configuration
 * Only contains non-sensitive, publishable keys and public URLs
 */

// This is Stripe's PUBLISHABLE key - safe to include in client-side code
// This key starts with 'pk_' and is meant to be public
const CONFIG = {
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51RSrS62LkmYKgi6m273LNQSjpKI8SnxNtiQMGcHijiiL3eliZZzqKDR00BL8uNlwYFloGGO3kyNQJKctTvEK4eB000e8dIlEQd',
  
  // Google Sheets public inventory URL (read-only, safe to expose)
  // This URL only returns product data and doesn't allow modifications
  GOOGLE_SHEETS_INVENTORY_URL: 'https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqqXA/exec'
};

// Make config available globally
window.CONFIG = CONFIG;
