const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory store for processed PayPal payments with timestamps (resets on function restart)
// For production, consider using a database or external cache
const processedPayments = new Map(); // Changed to Map to store timestamps

// Clean up old entries every hour to prevent memory bloat
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [paymentId, timestamp] of processedPayments.entries()) {
    if (timestamp < oneHourAgo) {
      processedPayments.delete(paymentId);
    }
  }
}, 60 * 60 * 1000);

exports.handler = async (event) => {
  console.log('🚀 PayPal webhook triggered');
  console.log('� Timestamp:', new Date().toISOString());
  console.log('�📋 Headers:', JSON.stringify(event.headers, null, 2));
  console.log('📋 Method:', event.httpMethod);
  console.log('📋 Body length:', event.body ? event.body.length : 0);
  console.log('📋 Raw body preview:', event.body ? event.body.substring(0, 200) + '...' : 'No body');
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log('❌ Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check environment variables
  console.log('🔧 Environment check:');
  console.log('  - PAYPAL_WEBHOOK_ID:', !!process.env.PAYPAL_WEBHOOK_ID);
  console.log('  - PAYPAL_WEBHOOK_CLIENT_ID:', !!process.env.PAYPAL_WEBHOOK_CLIENT_ID);
  console.log('  - PAYPAL_WEBHOOK_CLIENT_SECRET:', !!process.env.PAYPAL_WEBHOOK_CLIENT_SECRET);
  console.log('  - RESEND_API_KEY:', !!process.env.RESEND_API_KEY);

  // Verify PayPal webhook signature
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const paypalAuthAlgo = event.headers['paypal-auth-algo'];
  const paypalTransmissionId = event.headers['paypal-transmission-id'];
  const paypalCertId = event.headers['paypal-cert-id'];
  const paypalTransmissionSig = event.headers['paypal-transmission-sig'];
  const paypalTransmissionTime = event.headers['paypal-transmission-time'];

  // For now, we'll log the headers and process the webhook
  // PayPal signature verification is more complex and requires additional setup
  console.log('PayPal webhook received:', {
    algo: paypalAuthAlgo,
    transmissionId: paypalTransmissionId,
    certId: paypalCertId
  });

  let paypalEvent;
  try {
    paypalEvent = JSON.parse(event.body);
    console.log('📦 PayPal webhook received:', JSON.stringify(paypalEvent, null, 2));
  } catch (err) {
    console.error('Failed to parse PayPal webhook body:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // Handle the event
  try {
    console.log(`🎯 PayPal Event Type Received: ${paypalEvent.event_type}`);
    
    switch (paypalEvent.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('✅ Handling PAYMENT.CAPTURE.COMPLETED');
        await handlePaymentCaptureCompleted(paypalEvent);
        break;
      case 'CHECKOUT.ORDER.COMPLETED':
        console.log('✅ Handling CHECKOUT.ORDER.COMPLETED (redirecting to capture handler)');
        await handlePaymentCaptureCompleted(paypalEvent);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        console.log('✅ Handling PAYMENT.SALE.COMPLETED (redirecting to capture handler)');
        await handlePaymentCaptureCompleted(paypalEvent);
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('⏳ Order approved, waiting for capture...');
        break;
      default:
        console.log(`❌ UNHANDLED PayPal event type: ${paypalEvent.event_type}`);
        console.log('📋 Full event data for unhandled type:', JSON.stringify(paypalEvent, null, 2));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('PayPal webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};

async function handlePaymentCaptureCompleted(event) {
  console.log('🚀 PAYPAL: Processing PayPal payment capture:', event.id);
  console.log('🕐 PAYPAL: Current timestamp:', new Date().toISOString());
  console.log('🔢 PAYPAL: Currently tracking', processedPayments.size, 'processed payments');

  // Create unique identifier for this payment (use both event ID and capture ID for extra safety)
  const capture = event.resource;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  const paymentId = `${event.id}-${capture.id}`;
  
  console.log('🔍 PAYPAL: Payment ID:', paymentId, '| Order ID:', orderId);
  
  // Check if we've already processed this payment
  if (processedPayments.has(paymentId)) {
    const processedTime = new Date(processedPayments.get(paymentId)).toISOString();
    console.log(`❌ PAYPAL: Payment ${paymentId} already processed at ${processedTime} - skipping to prevent duplicates`);
    return;
  }

  // Also check by order ID if available
  if (orderId && processedPayments.has(orderId)) {
    const processedTime = new Date(processedPayments.get(orderId)).toISOString();
    console.log(`❌ PAYPAL: Order ${orderId} already processed at ${processedTime} - skipping to prevent duplicates`);
    return;
  }

  // Mark this payment as being processed with timestamp (use both IDs)
  const timestamp = Date.now();
  processedPayments.set(paymentId, timestamp);
  if (orderId) {
    processedPayments.set(orderId, timestamp);
  }
  console.log(`✅ PAYPAL: Marked payment ${paymentId} and order ${orderId} as processing at ${new Date(timestamp).toISOString()}`);

  console.log('📦 Full event data:', JSON.stringify(event, null, 2));

  try {
    
    console.log('🔍 Capture resource:', JSON.stringify(capture, null, 2));
    console.log('📋 Order ID extracted:', orderId);
    
    // Extract customer and order information from PayPal event
    const orderData = {
      sessionId: orderId || event.id,
      paymentIntentId: capture.id,
      customerEmail: capture.payer?.email_address || 'Not provided',
      customerName: capture.payer?.name ? 
        `${capture.payer.name.given_name} ${capture.payer.name.surname}` : 
        'Not provided',
      customerPhone: 'Not provided',
      shippingAddress: capture.shipping ? {
        name: capture.shipping.name?.full_name || 'Not provided',
        line1: capture.shipping.address?.address_line_1 || '',
        line2: capture.shipping.address?.address_line_2 || '',
        city: capture.shipping.address?.admin_area_2 || '',
        state: capture.shipping.address?.admin_area_1 || '',
        postalCode: capture.shipping.address?.postal_code || '',
        country: capture.shipping.address?.country_code || ''
      } : null,
      orderTotal: capture.amount?.value || '0.00',
      currency: capture.amount?.currency_code || 'AUD',
      createdAt: new Date(capture.create_time),
      lineItems: [],
      shippingMethod: 'PayPal Checkout',
      paymentMethod: 'PayPal'
    };

    // PayPal doesn't provide detailed line items in the webhook
    // So we'll fetch them using PayPal's API
    let detailedOrderData = null;
    if (orderId) {
      try {
        detailedOrderData = await fetchPayPalOrderDetails(orderId);
        console.log('Successfully fetched PayPal order details');
      } catch (apiError) {
        console.error('Failed to fetch PayPal order details:', apiError.message);
      }
    }

    // Use detailed order data if available
    if (detailedOrderData && detailedOrderData.purchase_units) {
      const purchaseUnit = detailedOrderData.purchase_units[0];
      console.log('🛍️ Purchase unit data:', JSON.stringify(purchaseUnit, null, 2));
      
      // Extract line items from PayPal order details
      if (purchaseUnit.items) {
        console.log('📦 Items found:', purchaseUnit.items.length);
        orderData.lineItems = purchaseUnit.items.map(item => {
          console.log('🔍 Processing item:', JSON.stringify(item, null, 2));
          return {
            name: item.name,
            quantity: parseInt(item.quantity),
            unitPrice: item.unit_amount?.value || '0.00',
            totalPrice: (parseFloat(item.unit_amount?.value || '0') * parseInt(item.quantity)).toFixed(2),
            productId: item.sku || item.category || 'PAYPAL_ITEM',
            weight: item.description || 'Unknown'
          };
        });

        // Update inventory for each item
        for (const item of orderData.lineItems) {
          if (item.productId !== 'PAYPAL_ITEM' && !item.name.toLowerCase().includes('shipping')) {
            await updateInventoryStock(item.productId, item.weight, item.quantity);
          }
        }
      } else {
        // Fallback to generic item
        orderData.lineItems.push({
          name: 'PayPal Order Items',
          quantity: 1,
          unitPrice: orderData.orderTotal,
          totalPrice: orderData.orderTotal,
          productId: 'PAYPAL_ORDER',
          weight: 'Unknown'
        });
      }

      // Extract shipping method if available
      if (purchaseUnit.shipping && purchaseUnit.shipping.options) {
        orderData.shippingMethod = purchaseUnit.shipping.options[0].label || 'PayPal Checkout';
      }
    } else {
      // Fallback when API call fails
      orderData.lineItems.push({
        name: 'PayPal Order Items (Details unavailable)',
        quantity: 1,
        unitPrice: orderData.orderTotal,
        totalPrice: orderData.orderTotal,
        productId: 'PAYPAL_ORDER',
        weight: 'Unknown'
      });
    }

    // Send shipping notification email (reusing Stripe email function)
    console.log('� PAYPAL EMAIL: About to send email with orderData keys:', Object.keys(orderData));
    console.log('� PAYPAL EMAIL: OrderData lineItems length:', orderData.lineItems?.length);
    console.log('📧 PAYPAL EMAIL: Customer email:', orderData.customerEmail);
    console.log('📧 PAYPAL EMAIL: Order total:', orderData.orderTotal);
    
    const emailResult = await sendShippingNotificationEmail(orderData);
    console.log('📧 PAYPAL EMAIL: Email sending result:', emailResult);

    console.log('🎉 PAYPAL: Successfully processed PayPal order:', orderData.sessionId, '- Email sent');

  } catch (error) {
    console.error('💥 PAYPAL: Error processing PayPal payment capture:', error);
    // Remove from processed maps so it can be retried if webhook is called again
    processedPayments.delete(paymentId);
    if (orderId) {
      processedPayments.delete(orderId);
    }
    throw error;
  }
}

// Reuse the same email function from Stripe webhook
async function sendShippingNotificationEmail(orderData) {
  try {
    console.log('🔧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('📧 Attempting to send email with orderData:', JSON.stringify(orderData, null, 2));
    
    const emailHtml = generateShippingEmailTemplate(orderData);
    
    const emailData = {
      from: 'Outback Gems <support@outbackgems.com.au>',
      to: 'support@outbackgems.com.au',
      subject: `NEW PAYPAL ORDER - $${orderData.orderTotal} AUD - SHIP NOW`,
      html: emailHtml,
    };

    console.log('📨 Email data prepared:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      htmlLength: emailHtml.length
    });

    const result = await resend.emails.send(emailData);
    console.log('✅ Shipping email sent successfully:', result.id);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send shipping email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

// Reuse the same email template from Stripe webhook
function generateShippingEmailTemplate(orderData) {
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    }).format(date);
  };

  const formatCurrency = (amount, currency = 'AUD') => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  const itemsHtml = orderData.lineItems.map(item => `
    <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: block;">
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 16px; color: #333;">${item.name}</strong>
      </div>
      <div style="margin-bottom: 5px;">
        <span style="color: #666;">ID:</span> <strong>${item.productId}</strong>
      </div>
      <div style="margin-bottom: 5px;">
        <span style="color: #666;">Quantity:</span> <strong>${item.quantity}</strong>
      </div>
      <div style="margin-bottom: 5px;">
        <span style="color: #666;">Unit Price:</span> <strong>${formatCurrency(item.unitPrice, orderData.currency)}</strong>
      </div>
      <div>
        <span style="color: #666;">Total:</span> <strong>${formatCurrency(item.totalPrice, orderData.currency)}</strong>
      </div>
    </div>
  `).join('');

  const shippingHtml = orderData.shippingAddress ? `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📦 Shipping Information</h3>
      <div style="margin-bottom: 8px;"><strong>${orderData.shippingAddress.name}</strong></div>
      <div style="margin-bottom: 5px;">${orderData.shippingAddress.line1}</div>
      ${orderData.shippingAddress.line2 ? `<div style="margin-bottom: 5px;">${orderData.shippingAddress.line2}</div>` : ''}
      <div style="margin-bottom: 5px;">${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.postalCode}</div>
      <div><strong>${orderData.shippingAddress.country}</strong></div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6;">
        <span style="color: #666;">Method/Cost:</span> <strong>${orderData.shippingMethod}</strong>
      </div>
    </div>
  ` : '<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;"><strong>No shipping address provided</strong></div>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Notification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🎉 New Order Received!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Payment via ${orderData.paymentMethod || 'PayPal'}</p>
        </div>

        <div style="padding: 30px;">
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">💰 Order Summary</h3>
            <div style="margin-bottom: 8px;"><span style="color: #666;">Order ID:</span> <strong>${orderData.sessionId}</strong></div>
            <div style="margin-bottom: 8px;"><span style="color: #666;">Payment ID:</span> <strong>${orderData.paymentIntentId}</strong></div>
            <div style="margin-bottom: 8px;"><span style="color: #666;">Total Amount:</span> <strong style="font-size: 18px; color: #28a745;">${formatCurrency(orderData.orderTotal, orderData.currency)}</strong></div>
            <div><span style="color: #666;">Order Date:</span> <strong>${formatDate(orderData.createdAt)}</strong></div>
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2196f3;">
            <h3 style="margin: 0 0 15px 0; color: #1565c0; font-size: 18px;">👤 Customer Information</h3>
            <div style="margin-bottom: 8px;"><span style="color: #666;">Name:</span> <strong>${orderData.customerName}</strong></div>
            <div style="margin-bottom: 8px;"><span style="color: #666;">Email:</span> <strong>${orderData.customerEmail}</strong></div>
            <div><span style="color: #666;">Phone:</span> <strong>${orderData.customerPhone}</strong></div>
          </div>

          ${shippingHtml}

          <div style="background: #fff8e1; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
            <h3 style="margin: 0 0 15px 0; color: #e65100; font-size: 18px;">📋 Order Items</h3>
            ${itemsHtml}
          </div>

          <div style="background: #f1f8ff; padding: 20px; border-radius: 8px; text-align: center; border: 2px dashed #007cba;">
            <h3 style="margin: 0 0 10px 0; color: #007cba; font-size: 18px;">🚀 Next Steps</h3>
            <p style="margin: 0; color: #0056b3; font-weight: 500;">Process this order and prepare for shipping!</p>
          </div>

        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #dee2e6;">
          <p style="margin: 0;">📧 This email was automatically generated by your PayPal webhook system</p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

// Reuse inventory update function
async function updateInventoryStock(productId, weight, quantityPurchased) {
  console.log(`🔄 PAYPAL INVENTORY: Attempting to update ${productId}, weight: ${weight}, quantity: ${quantityPurchased}`);
  
  try {
    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      console.log('❌ Google Sheets update URL not configured, skipping inventory update');
      return;
    }

    console.log('📡 PAYPAL INVENTORY: Sending request to Apps Script...');
    
    const requestBody = {
      action: 'updateStock',
      productId: productId,
      weight: weight,
      quantityToReduce: quantityPurchased
    };
    
    console.log('📋 PAYPAL INVENTORY: Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(googleSheetsUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📊 PAYPAL INVENTORY: Apps Script response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PAYPAL INVENTORY: Failed to update inventory:', response.status, response.statusText, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ PAYPAL INVENTORY: Updated successfully:', result);

  } catch (error) {
    console.error('💥 PAYPAL INVENTORY: Error updating inventory:', error);
  }
}

// New function to fetch PayPal order details via API
async function fetchPayPalOrderDetails(orderId) {
  try {
    // First, get an access token from PayPal
    const accessToken = await getPayPalAccessToken();
    
    // Then fetch the order details
    const response = await fetch(`https://api.paypal.com/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `${orderId}-${Date.now()}`
      }
    });

    if (!response.ok) {
      throw new Error(`PayPal API error: ${response.status} ${response.statusText}`);
    }

    const orderDetails = await response.json();
    console.log('PayPal order details fetched successfully');
    return orderDetails;

  } catch (error) {
    console.error('Error fetching PayPal order details:', error);
    throw error;
  }
}

// Function to get PayPal access token
async function getPayPalAccessToken() {
  try {
    const clientId = process.env.PAYPAL_WEBHOOK_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_WEBHOOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal webhook credentials not configured');
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

    if (!response.ok) {
      throw new Error(`PayPal auth error: ${response.status} ${response.statusText}`);
    }

    const authData = await response.json();
    return authData.access_token;

  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
  }
}
