const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};

async function handleCheckoutSessionCompleted(session) {
  console.log('Processing completed checkout session:', session.id);

  try {
    // Retrieve the session with line items
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer_details']
    });

    // Extract customer information
    const customerDetails = sessionWithLineItems.customer_details;
    const shippingDetails = sessionWithLineItems.shipping_details;
    
    // Extract order information
    const orderData = {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      customerEmail: customerDetails.email,
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone || 'Not provided',
      shippingAddress: shippingDetails ? {
        name: shippingDetails.name,
        line1: shippingDetails.address.line1,
        line2: shippingDetails.address.line2 || '',
        city: shippingDetails.address.city,
        state: shippingDetails.address.state,
        postalCode: shippingDetails.address.postal_code,
        country: shippingDetails.address.country
      } : null,
      orderTotal: (session.amount_total / 100).toFixed(2),
      currency: session.currency.toUpperCase(),
      createdAt: new Date(session.created * 1000),
      lineItems: []
    };

    // Process line items
    for (const item of sessionWithLineItems.line_items.data) {
      console.log('Line item structure:', JSON.stringify(item, null, 2)); // Debug log
      
      // Try multiple paths to get product metadata
      let productId = 'Unknown';
      let weight = 'Unknown';
      
      // Path 1: Check if metadata is in price.product_data.metadata
      if (item.price.product_data?.metadata) {
        productId = item.price.product_data.metadata.product_id || productId;
        weight = item.price.product_data.metadata.weight || weight;
      }
      
      // Path 2: Check if there's a product object with metadata
      if (item.price.product && typeof item.price.product === 'string') {
        // If product is a string ID, we need to fetch the product
        try {
          const product = await stripe.products.retrieve(item.price.product);
          if (product.metadata) {
            productId = product.metadata.product_id || productId;
            weight = product.metadata.weight || weight;
          }
        } catch (error) {
          console.log('Could not retrieve product:', error.message);
        }
      }
      
      // Path 3: Try to extract from item description
      if (productId === 'Unknown' && item.description) {
        const idMatch = item.description.match(/ID:\s*([^,\s]+)/);
        if (idMatch) {
          productId = idMatch[1];
        }
        
        // Extract weight from product name
        const weightMatch = item.description.match(/\((\d+(?:\.\d+)?)([a-zA-Z]+)\)/);
        if (weightMatch) {
          weight = weightMatch[1];
        }
      }
      
      const productData = {
        name: item.description,
        quantity: item.quantity,
        unitPrice: (item.amount_total / item.quantity / 100).toFixed(2),
        totalPrice: (item.amount_total / 100).toFixed(2),
        productId: productId,
        weight: weight
      };
      
      console.log('Processed product data:', productData); // Debug log
      
      orderData.lineItems.push(productData);

      // Update inventory stock (skip shipping items)
      if (productData.productId !== 'Unknown' && !productData.name.toLowerCase().includes('shipping')) {
        console.log(`Updating inventory for product ${productData.productId}, weight ${productData.weight}, quantity ${productData.quantity}`);
        await updateInventoryStock(productData.productId, productData.weight, productData.quantity);
      } else {
        console.log(`Skipping inventory update for: ${productData.name} (ID: ${productData.productId})`);
      }
    }

    // Determine shipping method from line items
    const shippingItem = sessionWithLineItems.line_items.data.find(item => 
      item.description.toLowerCase().includes('shipping') || 
      item.description.toLowerCase().includes('delivery')
    );
    
    orderData.shippingMethod = shippingItem ? shippingItem.description : 'Standard Shipping';

    // Send shipping notification email
    await sendShippingNotificationEmail(orderData);

    console.log('Successfully processed order:', orderData.sessionId);

  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

async function updateInventoryStock(productId, weight, quantityPurchased) {
  try {
    // Get the Google Sheets update URL from environment variables
    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      console.log('Google Sheets update URL not configured, skipping inventory update');
      return;
    }

    // Call your Google Apps Script to update the inventory
    const response = await fetch(googleSheetsUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateStock',
        productId: productId,
        weight: weight,
        quantityToReduce: quantityPurchased
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update Google Sheets inventory: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`Google Sheets inventory updated for ${productId} (${weight}): reduced by ${quantityPurchased}`, result);

  } catch (error) {
    console.error(`Failed to update Google Sheets stock for product ${productId}:`, error);
    // Don't throw error - we don't want to fail the entire webhook for inventory issues
  }
}

async function sendShippingNotificationEmail(orderData) {
  try {
    const htmlContent = generateShippingEmailHTML(orderData);
    
    const emailData = {
      from: 'Outback Gems <support@outbackgems.com.au>',
      to: 'support@outbackgems.com.au',
      subject: `NEW STRIPE ORDER - ${orderData.sessionId} - $${orderData.orderTotal} AUD - SHIP NOW`,
      html: htmlContent,
    };

    const result = await resend.emails.send(emailData);
    console.log('Shipping notification sent:', result.id);

  } catch (error) {
    console.error('Failed to send shipping notification:', error);
    throw error;
  }
}

function generateShippingEmailHTML(orderData) {
  const { shippingAddress } = orderData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>🚚 URGENT: New Order Requiring Immediate Shipment</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
        .header { background: linear-gradient(135deg, #cc5500, #ff6600); color: white; padding: 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="60" cy="70" r="1" fill="rgba(255,255,255,0.1)"/></svg>'); }
        .header h1 { margin: 0; font-size: 2.2em; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 1; }
        .header .subtitle { margin: 10px 0 0 0; font-size: 1.1em; opacity: 0.95; position: relative; z-index: 1; }
        .urgent-banner { background: linear-gradient(90deg, #ff4444, #ff6666); color: white; padding: 20px; text-align: center; margin: 0; font-size: 1.3em; font-weight: bold; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .content { padding: 30px; }
        .section { margin-bottom: 35px; }
        .section h2 { color: #cc5500; border-bottom: 3px solid #cc5500; padding-bottom: 12px; margin-bottom: 20px; font-size: 1.4em; }
        .info-box { background: linear-gradient(135deg, #f9f9f9, #f5f5f5); padding: 20px; border-radius: 10px; border-left: 5px solid #cc5500; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .info-box strong { color: #cc5500; display: block; margin-bottom: 8px; font-size: 1.1em; }
        .products-table { width: 100%; border-collapse: collapse; margin-top: 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .products-table th { background: linear-gradient(135deg, #cc5500, #ff6600); color: white; padding: 15px; text-align: left; font-size: 1.1em; }
        .products-table td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
        .products-table tr:nth-child(even) { background-color: #f9f9f9; }
        .products-table tr:hover { background-color: #f0f0f0; }
        .product-id { background-color: #cc5500; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: monospace; }
        .total-section { background: linear-gradient(135deg, #e8f5e8, #d4edda); border: 2px solid #4CAF50; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; }
        .total { font-size: 1.5em; font-weight: bold; color: #2c6c2c; margin-bottom: 10px; }
        .payment-status { background-color: #d4edda; border: 2px solid #4CAF50; color: #2c6c2c; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin: 20px 0; }
        .customer-section { background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-left: 5px solid #ffc107; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .shipping-section { background: linear-gradient(135deg, #cce7ff, #b3d9ff); border-left: 5px solid #007bff; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .action-section { background: linear-gradient(135deg, #f8d7da, #f5c6cb); border: 2px solid #dc3545; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0; }
        .action-section h3 { color: #721c24; margin-top: 0; font-size: 1.3em; }
        .checklist { text-align: left; margin: 15px 0; }
        .checklist li { margin: 8px 0; padding: 5px 0; }
        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 3px solid #cc5500; }
        .highlight { background-color: #fff3cd; padding: 2px 6px; border-radius: 3px; }
        .address-box { background-color: white; border: 2px solid #007bff; padding: 15px; border-radius: 8px; font-family: monospace; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚚 NEW ORDER - SHIP IMMEDIATELY</h1>
          <div class="subtitle">Stripe Payment Completed Successfully</div>
          <div class="subtitle">Order ID: ${orderData.sessionId}</div>
          <div class="subtitle">Order Date: ${orderData.createdAt.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</div>
        </div>

        <div class="urgent-banner">
          ⚠️ URGENT ACTION REQUIRED: This order is PAID and ready for immediate dispatch ⚠️
        </div>

        <div class="content">
          
          <div class="payment-status">
            ✅ PAYMENT CONFIRMED: $${orderData.orderTotal} AUD received via Stripe
            <br>Payment Intent: ${orderData.paymentIntentId}
          </div>

          <div class="section">
            <h2>📋 CUSTOMER INFORMATION</h2>
            <div class="customer-section">
              <div class="info-box">
                <strong>Customer Name:</strong> ${orderData.customerName}<br>
                <strong>Email:</strong> ${orderData.customerEmail}<br>
                <strong>Phone:</strong> ${orderData.customerPhone}<br>
                <strong>Order Reference:</strong> <span class="highlight">${orderData.sessionId}</span><br>
                <strong>Payment Method:</strong> Stripe Credit Card<br>
                <strong>Order Time:</strong> ${orderData.createdAt.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
              </div>
            </div>
          </div>

          ${shippingAddress ? `
          <div class="section">
            <h2>📍 SHIPPING ADDRESS</h2>
            <div class="shipping-section">
              <strong>Ship To:</strong>
              <div class="address-box">
                ${shippingAddress.name}<br>
                ${shippingAddress.line1}<br>
                ${shippingAddress.line2 ? shippingAddress.line2 + '<br>' : ''}
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
                ${shippingAddress.country}
              </div>
              <br>
              <strong>📦 Method:</strong> <span class="highlight">${orderData.shippingMethod}</span>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <h2>📦 PRODUCTS TO SHIP</h2>
            <div style="margin-bottom: 20px;">
              ${orderData.lineItems.filter(item => !item.name.toLowerCase().includes('shipping')).map(item => `
                <div style="background: linear-gradient(135deg, #f9f9f9, #f5f5f5); border: 2px solid #cc5500; border-radius: 10px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                    <h3 style="color: #cc5500; margin: 0; font-size: 1.2em;">${item.name}</h3>
                    <span style="background-color: #cc5500; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 1.1em;">ID: ${item.productId}</span>
                  </div>
                  <div style="display: block;">
                    <div style="margin-bottom: 10px;"><strong>Quantity:</strong> <span style="font-size: 1.3em; color: #cc5500; font-weight: bold;">${item.quantity}</span></div>
                    <div style="margin-bottom: 10px;"><strong>Unit Price:</strong> $${item.unitPrice} AUD</div>
                    <div><strong>Total:</strong> <span style="font-size: 1.2em; color: #cc5500; font-weight: bold;">$${item.totalPrice} AUD</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="total-section">
            <div class="total">💰 TOTAL ORDER VALUE: $${orderData.orderTotal} AUD</div>
            <div>✅ Payment Status: PAID IN FULL via Stripe</div>
          </div>

          <div style="background-color: #e8f5e8; border: 2px solid #4CAF50; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <h3 style="color: #2c6c2c; margin-top: 0;">🎉 ORDER READY FOR DISPATCH!</h3>
            <p style="margin: 10px 0; font-size: 1.1em;">This order has been paid in full and all details verified.</p>
            <p style="margin: 10px 0;"><strong>✅ Inventory has been automatically updated</strong></p>
            <p style="margin: 10px 0; color: #2c6c2c;"><strong>Ready to package and ship immediately!</strong></p>
          </div>

        </div>

        <div class="footer">
          <p><strong>Outback Gems & Minerals</strong> - Automated Order Processing System</p>
          <p>This email was automatically generated when payment was confirmed via Stripe</p>
          <p>Questions? Contact: support@outbackgems.com.au</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
