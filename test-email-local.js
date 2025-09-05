/**
 * Local Email Test for Stripe Webhook
 * Tests the email functionality without signature verification
 */

require('dotenv').config();

// Simulate the webhook function locally
async function testEmailFunction() {
  console.log('📧 Testing email function locally...');
  
  // Check environment variables
  const requiredEnvVars = [
    'RESEND_API_KEY',
    'GOOGLE_SHEETS_INVENTORY_UPDATE_URL'
  ];
  
  console.log('🔍 Checking environment variables:');
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ❌ ${envVar}: Missing`);
    }
  }
  console.log('');
  
  // Import required modules
  const { Resend } = require('resend');
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // Simulated checkout session data
  const session = {
    id: "cs_test_email_session_123",
    payment_intent: "pi_test_email_123",
    amount_total: 4200, // $42.00 AUD in cents
    currency: "aud",
    created: Math.floor(Date.now() / 1000),
    customer_details: {
      email: "customer@example.com",
      name: "John Smith",
      phone: "+61412345678"
    },
    shipping_details: {
      name: "John Smith",
      address: {
        line1: "123 Collins Street",
        line2: "Unit 5",
        city: "Melbourne",
        state: "VIC",
        postal_code: "3000",
        country: "AU"
      }
    },
    line_items: {
      data: [
        {
          id: "li_test_1",
          description: "Quartz Tumbles (Small)",
          quantity: 2,
          amount_total: 1600, // $16.00
          price: {
            product_data: {
              metadata: {
                product_id: "tmb001",
                weight: "100"
              }
            }
          }
        },
        {
          id: "li_test_2", 
          description: "Amethyst Crystal Points",
          quantity: 1,
          amount_total: 1200, // $12.00
          price: {
            product_data: {
              metadata: {
                product_id: "cryst047",
                weight: "200"
              }
            }
          }
        },
        {
          id: "li_test_3", 
          description: "Rose Quartz Tumbles (Large)",
          quantity: 3,
          amount_total: 2400, // $24.00
          price: {
            product_data: {
              metadata: {
                product_id: "tmb025",
                weight: "150"
              }
            }
          }
        },
        {
          id: "li_test_4", 
          description: "Express Shipping",
          quantity: 1,
          amount_total: 800, // $8.00
          price: {
            product_data: {
              metadata: {
                product_id: "shipping",
                weight: "N/A"
              }
            }
          }
        }
      ]
    }
  };

  try {
    // Test the email sending function
    console.log('📤 Sending test email...');
    
    const emailData = await sendShippingNotification(session);
    
    if (emailData.id) {
      console.log('✅ Email sent successfully!');
      console.log(`   Email ID: ${emailData.id}`);
      console.log(`   📧 Check support@outbackgems.com.au for the notification`);
    } else {
      console.log('❌ Email sending failed');
      console.log('   Response:', emailData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Email sending function (copied from webhook)
  async function sendShippingNotification(session) {
    const orderDate = new Date(session.created * 1000).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const orderTime = new Date(session.created * 1000).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Build products list
    let productsHtml = '';
    let productsList = '';

    if (session.line_items && session.line_items.data) {
      for (const item of session.line_items.data) {
        const productId = item.price?.product_data?.metadata?.product_id || 'Unknown';
        const weight = item.price?.product_data?.metadata?.weight || 'N/A';
        const amount = (item.amount_total / 100).toFixed(2);
        
        if (productId !== 'shipping') {
          
          productsHtml += `
            <div style="background: linear-gradient(135deg, #f9f9f9, #f5f5f5); border: 2px solid #cc5500; border-radius: 10px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                <h3 style="color: #cc5500; margin: 0; font-size: 1.2em;">${item.description}</h3>
                <span style="background-color: #cc5500; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 1.1em;">ID: ${productId}</span>
              </div>
              <div style="display: block;">
                <div style="margin-bottom: 10px;"><strong>Quantity:</strong> <span style="font-size: 1.3em; color: #cc5500; font-weight: bold;">${item.quantity}</span></div>
                <div style="margin-bottom: 10px;"><strong>Weight/Size:</strong> ${weight}</div>
                <div style="margin-bottom: 10px;"><strong>Unit Price:</strong> $${(item.amount_total / item.quantity / 100).toFixed(2)} AUD</div>
                <div><strong>Total:</strong> <span style="font-size: 1.2em; color: #cc5500; font-weight: bold;">$${amount} AUD</span></div>
              </div>
            </div>
          `;
          
          productsList += `• ${item.quantity}x ${item.description} (ID: ${productId}, ${weight}) - $${amount}\n`;
        }
      }
    }

    // Find shipping method
    let shippingMethod = 'Standard Shipping';
    let shippingCost = '0.00';
    
    if (session.line_items && session.line_items.data) {
      const shippingItem = session.line_items.data.find(item => 
        item.price?.product_data?.metadata?.product_id === 'shipping'
      );
      
      if (shippingItem) {
        shippingMethod = shippingItem.description;
        shippingCost = (shippingItem.amount_total / 100).toFixed(2);
      }
    }

    const totalAmount = (session.amount_total / 100).toFixed(2);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order - Outback Gems</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📦 New Order Received!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Outback Gems & Minerals</p>
            </div>
            
            <!-- Order Information -->
            <div style="padding: 30px;">
                
                <!-- Order Details -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h2 style="color: #8B4513; margin: 0 0 15px 0; font-size: 20px;">📋 Order Details</h2>
                    <div>
                        <div style="margin-bottom: 10px;"><strong>Order ID:</strong> ${session.id}</div>
                        <div style="margin-bottom: 10px;"><strong>Payment ID:</strong> ${session.payment_intent}</div>
                        <div style="margin-bottom: 10px;"><strong>Date:</strong> ${orderDate}</div>
                        <div><strong>Time:</strong> ${orderTime}</div>
                    </div>
                </div>
                
                <!-- Customer Information -->
                <div style="background-color: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h2 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px;">👤 Customer Information</h2>
                    <div style="margin-bottom: 10px;"><strong>Name:</strong> ${session.customer_details.name}</div>
                    <div style="margin-bottom: 10px;"><strong>Email:</strong> ${session.customer_details.email}</div>
                    ${session.customer_details.phone ? `<div><strong>Phone:</strong> ${session.customer_details.phone}</div>` : ''}
                </div>
                
                <!-- Shipping Address -->
                <div style="background-color: #e8f5e8; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h2 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 20px;">🚚 Shipping Address</h2>
                    <div style="line-height: 1.8;">
                        <strong>${session.shipping_details.name}</strong><br>
                        ${session.shipping_details.address.line1}<br>
                        ${session.shipping_details.address.line2 ? session.shipping_details.address.line2 + '<br>' : ''}
                        ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}<br>
                        ${session.shipping_details.address.country}
                    </div>
                </div>
                
                <!-- Products Ordered -->
                <div style="background-color: #fff3e0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h2 style="color: #f57c00; margin: 0 0 15px 0; font-size: 20px;">💎 Products Ordered</h2>
                    <div style="margin-bottom: 20px;">
                        ${productsHtml}
                    </div>
                </div>
                
                <!-- Shipping & Payment -->
                <div style="background-color: #f3e5f5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                    <h2 style="color: #7b1fa2; margin: 0 0 15px 0; font-size: 20px;">💳 Shipping & Payment</h2>
                    <div>
                        <div style="margin-bottom: 10px;"><strong>Method:</strong> ${shippingMethod}</div>
                        <div style="margin-bottom: 10px;"><strong>Cost:</strong> $${shippingCost}</div>
                        <div style="margin-bottom: 10px;"><strong>Payment Status:</strong> <span style="color: #2e7d32; font-weight: bold;">✅ PAID</span></div>
                        <div><strong>Total Amount:</strong> <span style="font-size: 18px; font-weight: bold; color: #d84315;">$${totalAmount} AUD</span></div>
                    </div>
                </div>
                
                <!-- Action Required -->
                <div style="background-color: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 20px; text-align: center;">
                    <h2 style="color: #d32f2f; margin: 0 0 15px 0; font-size: 20px;">⚡ Action Required</h2>
                    <p style="margin: 0; font-size: 16px; color: #666;">
                        <strong>📦 Package and ship this order</strong><br>
                        <strong>📧 Send tracking information to customer</strong><br>
                        <strong>📊 Inventory has been automatically updated</strong>
                    </p>
                </div>
                
            </div>
            
            <!-- Footer -->
            <div style="background-color: #8B4513; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">
                    🌐 <strong>Outback Gems & Minerals</strong><br>
                    Automatic order notification system
                </p>
            </div>
            
        </div>
    </body>
    </html>
    `;

    const textContent = `
🎉 NEW ORDER RECEIVED - OUTBACK GEMS & MINERALS

📋 ORDER DETAILS
Order ID: ${session.id}
Payment ID: ${session.payment_intent}
Date: ${orderDate}
Time: ${orderTime}

👤 CUSTOMER INFORMATION
Name: ${session.customer_details.name}
Email: ${session.customer_details.email}
${session.customer_details.phone ? `Phone: ${session.customer_details.phone}` : ''}

🚚 SHIPPING ADDRESS
${session.shipping_details.name}
${session.shipping_details.address.line1}
${session.shipping_details.address.line2 ? session.shipping_details.address.line2 : ''}
${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}
${session.shipping_details.address.country}

💎 PRODUCTS ORDERED
${productsList}

💳 SHIPPING & PAYMENT
Method: ${shippingMethod}
Cost: $${shippingCost}
Payment Status: ✅ PAID
Total Amount: $${totalAmount} AUD

⚡ ACTION REQUIRED:
📦 Package and ship this order
📧 Send tracking information to customer
📊 Inventory has been automatically updated

---
🌐 Outback Gems & Minerals
Automatic order notification system
    `;

    const emailData = await resend.emails.send({
      from: 'orders@outbackgems.com.au',
      to: 'support@outbackgems.com.au',
      subject: `NEW STRIPE ORDER #${session.id.slice(-8)} - $${totalAmount} AUD - ${session.customer_details.name}`,
      html: htmlContent,
      text: textContent,
    });

    return emailData;
  }
}

testEmailFunction();
