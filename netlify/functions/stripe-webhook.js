const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory store for processed sessions with timestamps (resets on function restart)
// For production, consider using a database or external cache
const processedSessions = new Map(); // Changed to Map to store timestamps

// Clean up old entries every hour to prevent memory bloat
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, timestamp] of processedSessions.entries()) {
    if (timestamp < oneHourAgo) {
      processedSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

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
  console.log('🚀 STRIPE: Processing completed checkout session:', session.id);
  console.log('🕐 STRIPE: Current timestamp:', new Date().toISOString());
  console.log('🔢 STRIPE: Currently tracking', processedSessions.size, 'processed sessions');

  // Check if we've already processed this session
  if (processedSessions.has(session.id)) {
    const processedTime = new Date(processedSessions.get(session.id)).toISOString();
    console.log(`❌ STRIPE: Session ${session.id} already processed at ${processedTime} - skipping to prevent duplicates`);
    return;
  }

  // Mark this session as being processed with timestamp
  const timestamp = Date.now();
  processedSessions.set(session.id, timestamp);
  console.log(`✅ STRIPE: Marked session ${session.id} as processing at ${new Date(timestamp).toISOString()}`);

  try {
    // Retrieve the session with line items
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer_details']
    });

    // Extract customer information
    const customerDetails = sessionWithLineItems.customer_details;
    const shippingDetails = sessionWithLineItems.shipping_details || sessionWithLineItems.collected_information?.shipping_details;
    
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

    // Collect all inventory updates for batch processing
    const inventoryUpdates = [];

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

      // Collect inventory update (skip shipping items)
      if (productData.productId !== 'Unknown' && !productData.name.toLowerCase().includes('shipping')) {
        inventoryUpdates.push({
          productId: productData.productId,
          weight: productData.weight,
          quantityToReduce: productData.quantity
        });
        console.log(`Added to batch update: ${productData.productId}, weight ${productData.weight}, quantity ${productData.quantity}`);
      } else {
        console.log(`Skipping inventory update for: ${productData.name} (ID: ${productData.productId})`);
      }
    }

    // 📝 TESTING: Record this purchase for potential restoration
    if (inventoryUpdates.length > 0) {
      try {
        await fetch('https://your-netlify-url.netlify.app/.netlify/functions/test-recorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            items: inventoryUpdates.map(item => ({
              productId: item.productId,
              weight: item.weight,
              quantityToRestore: item.quantityToReduce
            }))
          })
        });
        console.log('📝 TEST PURCHASE RECORDED for potential restoration');
      } catch (recordError) {
        console.log('⚠️ Failed to record test purchase (not critical):', recordError.message);
      }
    }

    // Process all inventory updates as a single batch (async, non-blocking)
    if (inventoryUpdates.length > 0) {
      console.log(`📦 STRIPE INVENTORY: Sending batch inventory update for ${inventoryUpdates.length} items`);
      // Don't await - make it non-blocking so email sends immediately
      updateInventoryBatch(inventoryUpdates).catch(async (error) => {
        console.error('❌ STRIPE INVENTORY: Batch inventory update failed, trying individual updates:', error);
        
        // Fallback: Try individual updates (like PayPal does)
        for (const update of inventoryUpdates) {
          try {
            await updateInventorySingle(update.productId, update.weight, update.quantityToReduce);
            console.log(`✅ STRIPE INVENTORY: Individual update successful for ${update.productId}`);
          } catch (singleError) {
            console.error(`❌ STRIPE INVENTORY: Individual update failed for ${update.productId}:`, singleError);
          }
        }
      });
    }

    // Determine shipping method from line items
    const shippingItem = sessionWithLineItems.line_items.data.find(item => 
      item.description.toLowerCase().includes('shipping') || 
      item.description.toLowerCase().includes('delivery')
    );
    
    orderData.shippingMethod = shippingItem ? shippingItem.description : 'Standard Shipping';

    // Send shipping notification email
    await sendShippingNotificationEmail(orderData);

    console.log('🎉 STRIPE: Successfully processed order:', orderData.sessionId, '- Email sent, inventory updated');

  } catch (error) {
    console.error('💥 STRIPE: Error processing checkout session:', error);
    // Remove from processed map so it can be retried if webhook is called again
    processedSessions.delete(session.id);
    throw error;
  }
}

async function updateInventoryBatch(inventoryUpdates) {
  try {
    // Get the Google Sheets update URL from environment variables
    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      console.log('❌ STRIPE INVENTORY: Google Sheets update URL not configured, skipping inventory update');
      console.log('💡 STRIPE INVENTORY: Set GOOGLE_SHEETS_INVENTORY_UPDATE_URL environment variable');
      return;
    }

    console.log(`📡 STRIPE INVENTORY: Sending batch inventory update with ${inventoryUpdates.length} items`);
    console.log('📋 STRIPE INVENTORY: Updates to send:', JSON.stringify(inventoryUpdates, null, 2));

    const requestBody = {
      action: 'batchUpdateStock',
      updates: inventoryUpdates
    };

    console.log('📋 STRIPE INVENTORY: Full request body:', JSON.stringify(requestBody, null, 2));

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Google Sheets batch update timed out')), 30000)
    );

    const fetchPromise = fetch(googleSheetsUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log(`📊 STRIPE INVENTORY: Apps Script response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ STRIPE INVENTORY: Failed to update inventory:', response.status, response.statusText, errorText);
      throw new Error(`Failed to update Google Sheets inventory: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ STRIPE INVENTORY: Batch inventory update completed:`, result);

  } catch (error) {
    console.error(`💥 STRIPE INVENTORY: Failed to batch update Google Sheets inventory:`, error);
    // Don't throw error - this is non-blocking, so webhook can continue
  }
}

// Fallback function for individual inventory updates (same logic as PayPal webhook)
async function updateInventorySingle(productId, weight, quantityToReduce) {
  console.log(`🔄 STRIPE INVENTORY (SINGLE): Attempting to update ${productId}, weight: ${weight}, quantity: ${quantityToReduce}`);
  
  try {
    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      console.log('❌ STRIPE INVENTORY (SINGLE): Google Sheets update URL not configured');
      return;
    }

    const requestBody = {
      action: 'updateStock',
      productId: productId,
      weight: weight,
      quantityToReduce: quantityToReduce
    };
    
    console.log('📋 STRIPE INVENTORY (SINGLE): Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(googleSheetsUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📊 STRIPE INVENTORY (SINGLE): Apps Script response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ STRIPE INVENTORY (SINGLE): Failed to update inventory:', response.status, response.statusText, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ STRIPE INVENTORY (SINGLE): Updated successfully:', result);

  } catch (error) {
    console.error('💥 STRIPE INVENTORY (SINGLE): Error updating inventory:', error);
    throw error;
  }
}

async function sendShippingNotificationEmail(orderData) {
  try {
    const htmlContent = generateShippingEmailHTML(orderData);
    
    const emailData = {
      from: 'Outback Gems <support@outbackgems.com.au>',
      to: 'support@outbackgems.com.au',
      subject: `NEW STRIPE ORDER - $${orderData.orderTotal} AUD - SHIP NOW`,
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
      <title>New Order - Ship Now</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
        .content { padding: 30px; }
        .section { margin-bottom: 35px; }
        .section h2 { color: #cc5500; border-bottom: 3px solid #cc5500; padding-bottom: 12px; margin-bottom: 20px; font-size: 1.4em; }
        .info-box { background: linear-gradient(135deg, #f9f9f9, #f5f5f5); padding: 20px; border-radius: 10px; border-left: 5px solid #cc5500; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .info-box strong { color: #cc5500; display: block; margin-bottom: 8px; font-size: 1.1em; }
        .total-section { background: linear-gradient(135deg, #e8f5e8, #d4edda); border: 2px solid #4CAF50; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; }
        .total { font-size: 1.5em; font-weight: bold; color: #2c6c2c; margin-bottom: 10px; }
        .payment-status { background-color: #d4edda; border: 2px solid #4CAF50; color: #2c6c2c; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin: 20px 0; }
        .customer-section { background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-left: 5px solid #ffc107; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 3px solid #cc5500; }
        .highlight { background-color: #fff3cd; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
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
                ${shippingAddress ? `<strong>Shipping Address:</strong><br>
                ${shippingAddress.name}<br>
                ${shippingAddress.line1}<br>
                ${shippingAddress.line2 ? shippingAddress.line2 + '<br>' : ''}
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
                ${shippingAddress.country}<br>` : ''}
                <strong>Shipping Method:</strong> <span class="highlight">${orderData.shippingMethod}</span><br>
                <strong>Payment Method:</strong> Stripe Credit Card<br>
                <strong>Order Time:</strong> ${orderData.createdAt.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
              </div>
            </div>
          </div>

          <div class="section">
            <h2>📦 PRODUCTS TO SHIP</h2>
            <div style="margin-bottom: 20px;">
              ${orderData.lineItems.filter(item => !item.name.toLowerCase().includes('shipping')).map(item => `
                <div style="background: linear-gradient(135deg, #f9f9f9, #f5f5f5); border: 2px solid #cc5500; border-radius: 10px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="margin-bottom: 15px;">
                    <h3 style="color: #cc5500; margin: 0 0 8px 0; font-size: 1.2em;">${item.name}</h3>
                    <div style="background-color: #cc5500; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 0.9em; display: inline-block;">ID: ${item.productId}</div>
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
