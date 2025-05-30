const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { cart, shippingCost, shippingMethod } = JSON.parse(event.body);

    // Calculate total (you should validate prices against your trusted source here)
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + Number(shippingCost);

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
            value: total.toFixed(2)
          }
        }],
        application_context: {
          return_url: 'https://YOUR_SITE.netlify.app/thankyou.html',
          cancel_url: 'https://YOUR_SITE.netlify.app/cancel.html'
        }
      })
    });
    const orderData = await orderRes.json();

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