const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Handle CORS preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { cart, shippingCost, shippingMethod } = JSON.parse(event.body);

    // Temporarily disable international shipping check for debugging
    // if (shippingMethod === 'international') {
    //   return {
    //     statusCode: 400,
    //     headers: {
    //       "Access-Control-Allow-Origin": "https://outbackgems.com.au",
    //       "Access-Control-Allow-Headers": "Content-Type",
    //     },
    //     body: JSON.stringify({ 
    //       error: "INTERNATIONAL_SHIPPING_SUSPENDED", 
    //       message: "International shipping is temporarily suspended. Please select Standard or Express delivery." 
    //     }),
    //   };
    // }

    const trustedProducts = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec').then(res => res.json());

    const validatedCart = cart.map(item => {
      const product = trustedProducts.find(p =>
        p["product id"] === item.id &&
        Number(p.weight) == Number(item.weight)
      );
      if (!product) {
        console.error('Product not found:', item, trustedProducts.map(p => ({
          id: p["product id"],
          weight: p.weight,
          unit: p.unit
        })));
        throw new Error(`Product not found: ${item.id}`);
      }
      // Use 'total price' if present, fallback to 'price'
      const price = Number(product["total price"] ?? product.price);
      if (!price) {
        console.error('Product price missing:', product);
        throw new Error(`Product price missing for: ${item.id}`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error(`Invalid quantity for: ${item.id}`);
      }
      // Check stock availability
      if (product.stock && item.quantity > product.stock) {
        throw new Error(`Not enough stock for: ${item.id}`);
      }
      return {
        id: product["product id"], // Add this line
        name: `${product["product name"]} (${product["weight"]}${product["unit"] || ""})`,
        price,
        quantity: item.quantity,
      };
    });

    // Calculate items array
    const items = validatedCart.map(item => ({
      name: item.name,
      sku: item.id, // Only SKU, no description
      unit_amount: { currency_code: 'AUD', value: item.price.toFixed(2) },
      quantity: item.quantity,
    }));


    // Calculate item_total as the sum of all items (products only)
    const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.unit_amount.value) * item.quantity), 0);

    // Recalculate shipping cost on server
    let validatedShippingCost = 0;
    if (itemsTotal >= 100) {
      validatedShippingCost = shippingMethod === 'express' ? 5.00 : 0;
    } else {
      validatedShippingCost = shippingMethod === 'express' ? 14.45 : 10.95;
    }
    const total = itemsTotal + validatedShippingCost;

    // Get PayPal access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', { // LIVE
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();

    // Check if token acquisition failed
    if (!tokenRes.ok || !tokenData.access_token) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://outbackgems.com.au",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ 
          error: "PAYPAL_TOKEN_FAILED", 
          message: "Failed to get PayPal access token",
          details: tokenData
        }),
      };
    }

    // Create PayPal order
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', { // LIVE
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': 'OGM-' + Date.now() // Unique request ID
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: 'OGM-' + Math.floor(100000 + Math.random() * 900000),
          amount: {
            currency_code: 'AUD',
            value: total.toFixed(2),
            breakdown: {
              item_total: { currency_code: 'AUD', value: itemsTotal.toFixed(2) },
              shipping: { currency_code: 'AUD', value: validatedShippingCost.toFixed(2) }
            }
          },
          items
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "Outback Gems & Minerals",
              locale: "en-AU",
              landing_page: "LOGIN",
              user_action: "PAY_NOW",
              return_url: 'https://outbackgems.com.au/thankyou.html',
              cancel_url: 'https://outbackgems.com.au/cancel.html'
            }
          }
        }
      })
    });
    const orderData = await orderRes.json();

    // Check if PayPal returned an error
    if (!orderRes.ok || orderData.error) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "https://outbackgems.com.au",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ 
          error: "PAYPAL_ORDER_CREATION_FAILED", 
          message: orderData.error?.message || "Failed to create PayPal order",
          details: orderData
        }),
      };
    }

    // Find approval URL
    const approvalUrl = orderData.links?.find(link => link.rel === 'approve')?.href;

    // If no approval URL found, return error with full response for debugging
    if (!approvalUrl) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "https://outbackgems.com.au",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ 
          error: "NO_APPROVAL_URL", 
          message: "PayPal order created but no approval URL found",
          orderData: orderData
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
        // ...other headers as needed
      },
      body: JSON.stringify({ id: orderData.id, approvalUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};