const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { cart, shippingCost, shippingMethod } = JSON.parse(event.body);

    const trustedProducts = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec').then(res => res.json());

    console.log('Trusted hap001:', trustedProducts.find(p => p["product id"] === "hap001"));

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
      return {
        name: `${product["product name"]} (${product["weight"]}${product["unit"] || ""})`,
        price,
        quantity: item.quantity,
      };
    });

    const itemsTotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = itemsTotal + Number(shippingCost);

    // Get PayPal access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();

    const items = validatedCart.map(item => ({
      name: item.name,
      unit_amount: { currency_code: 'AUD', value: item.price.toFixed(2) },
      quantity: item.quantity,
    }));

    // Add shipping as a separate item if needed
    if (shippingCost && shippingCost > 0) {
      items.push({
        name: shippingMethod === 'express' ? 'Express Shipping' : 'Standard Shipping',
        unit_amount: { currency_code: 'AUD', value: Number(shippingCost).toFixed(2) },
        quantity: 1,
      });
    }

    // Create PayPal order
    const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
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
              shipping: { currency_code: 'AUD', value: Number(shippingCost).toFixed(2) }
            }
          },
          items
        }],
        application_context: {
          return_url: 'https://outbackgems.netlify.app/thankyou.html',
          cancel_url: 'https://outbackgems.netlify.app/cancel.html',
          shipping_preference: "GET_FROM_FILE"
        }
      })
    });
    const orderData = await orderRes.json();
    console.log('PayPal order response:', orderData);

    // Find approval URL
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

    return {
      statusCode: 200,
      body: JSON.stringify({ id: orderData.id, approvalUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};