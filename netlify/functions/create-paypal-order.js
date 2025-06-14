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

    // Create PayPal order
    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', { // LIVE
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
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
        application_context: {
          return_url: 'https://outbackgems.com.au/thankyou.html',
          cancel_url: 'https://outbackgems.com.au/cancel.html',
          shipping_preference: "GET_FROM_FILE"
        }
      })
    });
    const orderData = await orderRes.json();

    // Find approval URL
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

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