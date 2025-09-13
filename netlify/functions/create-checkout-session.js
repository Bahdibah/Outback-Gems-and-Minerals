const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

  console.log('Function called with method:', event.httpMethod);
  console.log('Function called with headers:', event.headers);

  try {
    // Handle CORS preflight request
    if (event.httpMethod === "OPTIONS") {
      console.log('Handling OPTIONS preflight request');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: "",
      };
    }

    // Only allow POST requests for the main function
    if (event.httpMethod !== "POST") {
      console.log('Method not allowed:', event.httpMethod);
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      };
    }

    // Simple test response if body is missing (for debugging)
    if (!event.body) {
      console.log('No body provided - returning test response');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Function is working, but no body provided' }),
      };
    }

  try {
    console.log('Request body:', event.body);
    
    // Parse request body with error handling
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { cart, shippingMethod, shippingCost } = requestData;

    // First check: Reject international shipping requests immediately
    if (shippingMethod === 'international') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "INTERNATIONAL_SHIPPING_SUSPENDED", 
          message: "International shipping is temporarily suspended. Please select Standard or Express delivery." 
        }),
      };
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Cart is empty or invalid.' }),
      };
    }

    // Fetch all products from your Google Sheets API
    const productsRes = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec');
    const products = await productsRes.json();

    // Build Stripe line_items using trusted product data
    const line_items = cart.map(item => {
      const product = products.find(
        p => p["product id"] === item.id && Number(p["weight"]) === Number(item.weight)
      );
      if (!product) {
        throw new Error(`Product not found: ${item.id} (weight: ${item.weight})`);
      }
      const price = Number(product["total price"]);
      if (isNaN(price)) {
        throw new Error(`Invalid price for product: ${product["product name"]}`);
      }

      // --- DEBUG LOG ---
      let imageUrl = "";
      if (product["image url"]) {
        imageUrl = product["image url"].startsWith('http')
          ? product["image url"]
          : `https://6838195758ea7c00089e79f1--outbackgems.netlify.app/${product["image url"].replace(/\\/g, '/')}`;
        try {
          new URL(imageUrl);
        } catch {
          console.error(`Invalid image URL for product ${product["product id"]}:`, imageUrl);
          imageUrl = ""; // fallback to no image
        }
      }

      return {
        price_data: {
          currency: 'aud',
          product_data: {
            name: `${product["product name"]} (${product["weight"]}${product["unit"] || ""})`,
            description: `ID: ${product["product id"]}`,
            metadata: {
              product_id: product["product id"],
              weight: product["weight"]
            }
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add shipping cost as a line item if applicable
    if (shippingCost && shippingCost > 0) {
      line_items.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: shippingMethod === 'express' ? 'Express Shipping' : 'Standard Shipping',
          },
          unit_amount: Math.round(Number(shippingCost) * 100),
        },
        quantity: 1,
      });
    }

    const reference = 'OGM-' + Math.floor(100000 + Math.random() * 900000); // 6 digits

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['AU'],
      },
      phone_number_collection: {
        enabled: true
      },
      success_url: 'https://outbackgems.com.au/thankyou.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://outbackgems.com.au/cancel.html',
    });

    const orderSummary = [
      ...cart.map(item =>
        `${item.name} x${item.quantity} – $${(item.price * item.quantity).toFixed(2)}`
      ),
      shippingCost && shippingCost > 0
        ? `Shipping (${shippingMethod === 'express' ? 'Express' : 'Standard'}) – $${Number(shippingCost).toFixed(2)}`
        : null
    ].filter(Boolean).join('\n');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ id: session.id, orderSummary }),
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
  } catch (outerError) {
    console.error('Function error:', outerError);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({ error: 'Function execution error' }),
    };
  }
};