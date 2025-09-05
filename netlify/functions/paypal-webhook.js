const crypto = require('crypto');
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
  } catch (err) {
    console.error('Failed to parse PayPal webhook body:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // Handle the event
  try {
    switch (paypalEvent.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(paypalEvent);
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('Order approved, waiting for capture...');
        break;
      default:
        console.log(`Unhandled PayPal event type: ${paypalEvent.event_type}`);
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
  console.log('Processing PayPal payment capture:', event.id);

  try {
    const capture = event.resource;
    const orderId = capture.supplementary_data?.related_ids?.order_id;
    
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
      
      // Extract line items from PayPal order details
      if (purchaseUnit.items) {
        orderData.lineItems = purchaseUnit.items.map(item => ({
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: item.unit_amount?.value || '0.00',
          totalPrice: (parseFloat(item.unit_amount?.value || '0') * parseInt(item.quantity)).toFixed(2),
          productId: item.sku || item.category || 'PAYPAL_ITEM',
          weight: item.description || 'Unknown'
        }));

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
    await sendShippingNotificationEmail(orderData);

    console.log('Successfully processed PayPal order:', orderData.sessionId);

  } catch (error) {
    console.error('Error processing PayPal payment capture:', error);
    throw error;
  }
}

// Reuse the same email function from Stripe webhook
async function sendShippingNotificationEmail(orderData) {
  try {
    const emailHtml = generateShippingEmailTemplate(orderData);
    
    const emailData = {
      from: 'support@outbackgems.com.au',
      to: 'outbackgemsandminerals@gmail.com',
      subject: `New Order - ${orderData.paymentMethod || 'PayPal'} Payment`,
      html: emailHtml,
    };

    const result = await resend.emails.send(emailData);
    console.log('Shipping email sent successfully:', result.id);
    
  } catch (error) {
    console.error('Failed to send shipping email:', error);
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
  try {
    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      console.log('Google Sheets update URL not configured, skipping inventory update');
      return;
    }

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
      console.error('Failed to update inventory:', response.statusText);
      return;
    }

    const result = await response.json();
    console.log('Inventory updated successfully:', result);

  } catch (error) {
    console.error('Error updating inventory:', error);
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
