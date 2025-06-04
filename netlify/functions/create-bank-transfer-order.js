const fetch = require('node-fetch');
const { Resend } = require('resend');

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
    const orderSummary = [
      ...validatedCart.map(item =>
        `${item.name} x${item.quantity} – $${(item.price * item.quantity).toFixed(2)}`
      ),
      `Shipping (${shippingMethod === 'express' ? 'Express' : 'Standard'}) – $${validatedShippingCost.toFixed(2)}`
    ].join('\n');

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

Please transfer the total amount to the following bank account to complete your order:

${bankDetails}

Order Summary:
${orderSummary}

Total: $${total.toFixed(2)}

Please use the reference number above when making your transfer.
`;

    const emailBodyHtml = `
  <p>Thank you for your order!</p>
  <p>Please transfer the total amount to the following bank account to complete your order:</p>
  <pre>${bankDetails}</pre>
  <p><strong>Order Summary:</strong><br>${orderSummary.replace(/\n/g, '<br>')}</p>
  <p><strong>Total:</strong> $${total.toFixed(2)}</p>
  <p>Please use the reference number above when making your transfer.</p>
  <br>
  <hr>
  <table style="margin-top:20px;">
    <tr>
      <td style="vertical-align:top;padding-right:12px;">
        <img src="https://outbackgems.com.au/images/favicon.png" alt="Outback Gems Logo" style="height:48px;width:48px;border-radius:8px;">
      </td>
      <td style="vertical-align:top;">
        <div style="font-size:1.1em;color:#cc5500;font-weight:bold;">Customer Support</div>
        <div style="font-size:1em;color:#333;">support@outbackgems.com.au</div>
        <div style="font-family:'Parisienne', 'Dancing Script', 'Sacramento', 'Allura', 'Satisfy', cursive; font-size:1.5em; color:#cc5500; margin-top:6px;">
          Outback Gems &amp; Minerals
        </div>
      </td>
    </tr>
  </table>
`;

    // Send email with Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Outback Gems <support@outbackgems.com.au>',
      to: customerEmail,
      subject: 'Your Outback Gems & Minerals Order - Bank Transfer Details',
      html: emailBodyHtml // Use html instead of text
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
        // ...other headers as needed
      },
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
      headers: {
        "Access-Control-Allow-Origin": "https://outbackgems.com.au",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};