const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  try {
    const { cart, shippingMethod, customerEmail } = JSON.parse(event.body);

    // Fetch trusted products
    const trustedProducts = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec').then(res => res.json());

    // Validate cart and build order summary
    const validatedCart = cart.map(item => {
      const product = trustedProducts.find(p =>
        p["product id"] === item.id &&
        Number(p.weight) == Number(item.weight)
      );
      if (!product) throw new Error(`Product not found: ${item.id}`);
      const price = Number(product["total price"] ?? product.price);
      if (!price) throw new Error(`Product price missing for: ${item.id}`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error(`Invalid quantity for: ${item.id}`);
      if (product.stock && item.quantity > product.stock) throw new Error(`Not enough stock for: ${item.id}`);
      return {
        name: `${product["product name"]} (${product["weight"]}${product["unit"] || ""})`,
        price,
        quantity: item.quantity,
      };
    });

    // Calculate totals
    const itemsTotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let validatedShippingCost = 0;
    if (itemsTotal >= 100) {
      validatedShippingCost = shippingMethod === 'express' ? 5.00 : 0;
    } else {
      validatedShippingCost = shippingMethod === 'express' ? 14.45 : 10.95;
    }
    const total = itemsTotal + validatedShippingCost;

    // Generate reference number
    const reference = 'OGM-' + Date.now();

    // Compose order summary
    const orderSummary = validatedCart.map(item =>
      `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    // Bank details (replace with your real details)
    const bankDetails = `
Account Name: Outback Gems
BSB: 067 873
Account Number: 1104 2381
Reference: ${reference}
`;

    // Compose email
    const emailBody = `
Thank you for your order!

Please transfer the total amount to the following bank account:

${bankDetails}

Order Summary:
${orderSummary}

Shipping: ${shippingMethod === 'express' ? 'Express' : 'Standard'}
Total: $${total.toFixed(2)}

Please use the reference number above when making your transfer.
`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: '"Outback Gems" <support@outbackgems.com.au>',
      to: customerEmail,
      subject: 'Your Outback Gems & Minerals Order - Bank Transfer Details',
      text: emailBody
    });

    // Return details to frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        reference,
        bankDetails,
        orderSummary,
        shippingMethod: shippingMethod === 'express' ? 'Express' : 'Standard',
        total: total.toFixed(2)
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};