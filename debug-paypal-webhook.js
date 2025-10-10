// Debug script to test PayPal webhook configuration
// Run this to check your environment variables

console.log('=== PayPal Webhook Debug ===');
console.log('PAYPAL_WEBHOOK_ID:', process.env.PAYPAL_WEBHOOK_ID ? 'SET' : 'NOT SET');
console.log('PAYPAL_WEBHOOK_CLIENT_ID:', process.env.PAYPAL_WEBHOOK_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('PAYPAL_WEBHOOK_CLIENT_SECRET:', process.env.PAYPAL_WEBHOOK_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');

// Test if we can get PayPal access token
async function testPayPalAuth() {
  try {
    const clientId = process.env.PAYPAL_WEBHOOK_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_WEBHOOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log('❌ PayPal credentials not set');
      return;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (response.ok) {
      console.log('✅ PayPal authentication successful');
    } else {
      console.log('❌ PayPal authentication failed:', response.status);
    }
  } catch (error) {
    console.log('❌ PayPal auth error:', error.message);
  }
}

testPayPalAuth();