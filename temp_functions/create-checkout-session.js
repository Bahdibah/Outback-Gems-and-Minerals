const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { cart } = JSON.parse(event.body);

    const line_items = cart.map(item => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.name,
          metadata: {
            product_id: item.id // Make sure your cart items have a unique 'id' property
          }
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'https://YOURDOMAIN.com/thankyou.html',
      cancel_url: 'https://YOURDOMAIN.com/cart.html',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};