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
    const { orderId } = JSON.parse(event.body);

    // Get PayPal access token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();

    // Get order details to check shipping address
    const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    const orderData = await orderRes.json();

    // Check if shipping address is in Australia
    const shippingAddress = orderData.purchase_units?.[0]?.shipping?.address;
    const isAustralian = !shippingAddress || shippingAddress.country_code === 'AU';

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        valid: isAustralian,
        countryCode: shippingAddress?.country_code,
        message: isAustralian ? 
          "Address validated" : 
          "We only ship within Australia. Please use an Australian shipping address."
      }),
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
