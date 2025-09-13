const crypto = require('crypto');
let fetch;
try {
  fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
} catch (e) {
  // fallback or error handling if needed
}

exports.handler = async (event) => {
  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://outbackgems.com.au",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  console.log('Cart validation function called');

  try {
    // Handle CORS preflight request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: "",
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { cart, shippingMethod } = requestData;

    // Validate input
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: 'Cart is empty or invalid.' 
        }),
      };
    }

    // Check for international shipping (reject immediately)
    if (shippingMethod === 'international') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: "International shipping is temporarily suspended. Please select Standard or Express delivery." 
        }),
      };
    }

    console.log('Fetching products from Google Sheets for validation...');
    const startTime = Date.now();

    // Fetch products from Google Sheets (this can take time, but that's OK here)
    let productsRes;
    try {
      productsRes = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCkmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 30000 // 30 second timeout
      });
    } catch (fetchError) {
      console.error('Network error fetching from Google Sheets:', fetchError.message);
      console.error('Full fetch error:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: 'Product validation service is temporarily unavailable. Validation will occur during checkout.' 
        }),
      };
    }
    
    console.log('Google Sheets response status:', productsRes.status, productsRes.statusText);
    console.log('Google Sheets response headers:', Object.fromEntries(productsRes.headers.entries()));
    
    if (!productsRes.ok) {
      console.error('Google Sheets returned error:', productsRes.status, productsRes.statusText);
      const errorText = await productsRes.text();
      console.error('Google Sheets error details:', errorText.substring(0, 500));
      
      // Check if it's a Google service error or 404
      if (errorText.includes('Google Docs encountered an error') || 
          errorText.includes('file you have requested does not exist') ||
          errorText.includes('Script function not found') ||
          productsRes.status === 404) {
        console.error('Google Apps Script appears to be down, unavailable, or not properly deployed');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ 
            valid: false,
            error: 'Product validation service is temporarily unavailable. Validation will occur during checkout.' 
          }),
        };
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: 'Unable to validate products at this time. Please try again in a moment.' 
        }),
      };
    }

    console.log('✅ Google Sheets request successful!');
    let products;
    try {
      const responseText = await productsRes.text();
      console.log('Google Sheets response length:', responseText.length);
      console.log('Google Sheets response start:', responseText.substring(0, 200));
      products = JSON.parse(responseText);
      console.log('Successfully parsed', products.length, 'products from Google Sheets');
    } catch (jsonError) {
      console.error('Failed to parse Google Sheets response as JSON:', jsonError);
      const responseText = await productsRes.text();
      console.error('Google Sheets response text:', responseText.substring(0, 500));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: 'Unable to validate products at this time. Please try again in a moment.' 
        }),
      };
    }
    
    const fetchDuration = Date.now() - startTime;
    console.log(`Product data fetched in ${fetchDuration}ms`);

    // Validate that we got an array of products
    if (!Array.isArray(products) || products.length === 0) {
      console.error('Google Sheets returned invalid product data:', typeof products, products?.length);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: 'Unable to validate products at this time. Please try again in a moment.' 
        }),
      };
    }

    // Generate timestamp for consistent validation
    const validationTimestamp = Date.now();
    
    // Validate each cart item against authoritative product data
    const validatedCart = [];
    const errors = [];

    for (const item of cart) {
      const product = products.find(
        p => p["product id"] === item.id && Number(p["weight"]) === Number(item.weight)
      );

      if (!product) {
        errors.push(`Product not found: ${item.id} (weight: ${item.weight})`);
        continue;
      }

      const authoritativePrice = Number(product["total price"]);
      if (isNaN(authoritativePrice)) {
        errors.push(`Invalid price for product: ${product["product name"]}`);
        continue;
      }

      // Check stock availability
      const availableStock = Number(product.stock || 0);
      if (availableStock <= 0) {
        errors.push(`Product "${product["product name"]}" is out of stock`);
        continue;
      }
      
      if (item.quantity > availableStock) {
        errors.push(`Product "${product["product name"]}" has only ${availableStock} in stock, but ${item.quantity} requested`);
        continue;
      }

      // Use authoritative data from Google Sheets
      validatedCart.push({
        id: product["product id"],
        name: product["product name"],
        price: authoritativePrice, // Server-validated price
        weight: product["weight"],
        unit: product["unit"] || "",
        quantity: item.quantity,
        availableStock: availableStock, // Include stock info for reference
        imageUrl: product["image url"] || "",
        validatedAt: validationTimestamp // Use consistent timestamp
      });
    }

    if (errors.length > 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          valid: false,
          error: `Validation failed: ${errors.join(', ')}` 
        }),
      };
    }

    // Generate a secure validation token (expires in 5 minutes)
    const validationData = {
      cart: validatedCart,
      timestamp: validationTimestamp,
      shippingMethod: shippingMethod
    };
    
    const validationToken = crypto
      .createHmac('sha256', process.env.VALIDATION_SECRET || 'fallback-secret-key')
      .update(JSON.stringify(validationData))
      .digest('hex');

    console.log(`Cart validation successful: ${validatedCart.length} items validated`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        valid: true,
        cart: validatedCart,
        validationToken: validationToken,
        validatedAt: validationTimestamp,
        message: `Successfully validated ${validatedCart.length} items`
      }),
    };

  } catch (error) {
    console.error('Validation function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        valid: false,
        error: 'Internal validation error. Please try again.' 
      }),
    };
  }
};
