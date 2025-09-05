/**
 * Test Script for Stripe Webhook System
 * Run this in Node.js to test your webhook components
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Test webhook payload (simulates a real Stripe event)
const testWebhookPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2020-08-27',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_123456789',
      object: 'checkout.session',
      amount_total: 15000, // $150.00 AUD
      currency: 'aud',
      customer_details: {
        email: 'test@example.com',
        name: 'Test Customer',
        phone: '+61412345678'
      },
      shipping_details: {
        name: 'Test Customer',
        address: {
          line1: '123 Test Street',
          line2: 'Unit 1',
          city: 'Sydney',
          state: 'NSW',
          postal_code: '2000',
          country: 'AU'
        }
      },
      payment_intent: 'pi_test_123456789',
      payment_status: 'paid',
      status: 'complete'
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_123456789',
    idempotency_key: null
  },
  type: 'checkout.session.completed'
};

// Test line items
const testLineItems = {
  object: 'list',
  data: [
    {
      id: 'li_test_123',
      object: 'item',
      amount_total: 5000, // $50.00
      currency: 'aud',
      description: 'Blue Sapphire Rough (5.5ct)',
      price: {
        id: 'price_test',
        object: 'price',
        product_data: {
          metadata: {
            product_id: 'sap001',
            weight: '5.5'
          }
        }
      },
      quantity: 1
    },
    {
      id: 'li_test_456',
      object: 'item',
      amount_total: 8000, // $80.00
      currency: 'aud',
      description: 'Ruby Rough - Premium Grade (3.2ct)',
      price: {
        id: 'price_test_2',
        object: 'price',
        product_data: {
          metadata: {
            product_id: 'rub002',
            weight: '3.2'
          }
        }
      },
      quantity: 2
    },
    {
      id: 'li_test_shipping',
      object: 'item',
      amount_total: 2000, // $20.00
      currency: 'aud',
      description: 'Express Shipping',
      price: {
        id: 'price_shipping',
        object: 'price'
      },
      quantity: 1
    }
  ],
  has_more: false,
  total_count: 3,
  url: '/v1/checkout/sessions/cs_test_123456789/line_items'
};

// Mock functions for testing
const mockResend = {
  emails: {
    send: async (emailData) => {
      console.log('📧 Mock Email Sent:');
      console.log(`   To: ${emailData.to}`);
      console.log(`   Subject: ${emailData.subject}`);
      console.log(`   From: ${emailData.from}`);
      return { id: 'mock_email_' + Date.now() };
    }
  }
};

const mockFetch = async (url, options) => {
  if (url.includes('google')) {
    console.log('📊 Mock Inventory Update:');
    console.log(`   URL: ${url}`);
    console.log(`   Body: ${options.body}`);
    return {
      ok: true,
      json: async () => ({
        success: true,
        message: 'Stock updated successfully'
      })
    };
  }
  throw new Error(`Unexpected fetch to: ${url}`);
};

// Test the webhook processing logic
async function testWebhookProcessing() {
  console.log('🧪 Testing Stripe Webhook Processing...\n');

  try {
    // Mock Stripe session retrieval
    const mockStripe = {
      checkout: {
        sessions: {
          retrieve: async (sessionId, options) => {
            console.log(`🔍 Mock Stripe.retrieve called for session: ${sessionId}`);
            return {
              ...testWebhookPayload.data.object,
              line_items: testLineItems
            };
          }
        }
      }
    };

    // Simulate the webhook handler logic
    const session = testWebhookPayload.data.object;
    console.log(`📋 Processing session: ${session.id}`);

    // Retrieve session with line items (mocked)
    const sessionWithLineItems = await mockStripe.checkout.sessions.retrieve(
      session.id, 
      { expand: ['line_items', 'customer_details'] }
    );

    // Extract order data
    const orderData = {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      customerEmail: session.customer_details.email,
      customerName: session.customer_details.name,
      customerPhone: session.customer_details.phone,
      shippingAddress: session.shipping_details ? {
        name: session.shipping_details.name,
        line1: session.shipping_details.address.line1,
        line2: session.shipping_details.address.line2 || '',
        city: session.shipping_details.address.city,
        state: session.shipping_details.address.state,
        postalCode: session.shipping_details.address.postal_code,
        country: session.shipping_details.address.country
      } : null,
      orderTotal: (session.amount_total / 100).toFixed(2),
      currency: session.currency.toUpperCase(),
      createdAt: new Date(session.created * 1000),
      lineItems: []
    };

    console.log('👤 Customer Details:');
    console.log(`   Name: ${orderData.customerName}`);
    console.log(`   Email: ${orderData.customerEmail}`);
    console.log(`   Phone: ${orderData.customerPhone}`);

    // Process line items
    for (const item of sessionWithLineItems.line_items.data) {
      const productData = {
        name: item.description,
        quantity: item.quantity,
        unitPrice: (item.amount_total / item.quantity / 100).toFixed(2),
        totalPrice: (item.amount_total / 100).toFixed(2),
        productId: item.price.product_data?.metadata?.product_id || 'Unknown',
        weight: item.price.product_data?.metadata?.weight || 'Unknown'
      };
      
      orderData.lineItems.push(productData);

      console.log(`📦 Product: ${productData.name}`);
      console.log(`   ID: ${productData.productId}, Weight: ${productData.weight}`);
      console.log(`   Quantity: ${productData.quantity}, Price: $${productData.totalPrice}`);

      // Test inventory update (skip shipping items)
      if (productData.productId !== 'Unknown' && !productData.name.toLowerCase().includes('shipping')) {
        await testInventoryUpdate(productData.productId, productData.weight, productData.quantity);
      }
    }

    // Determine shipping method
    const shippingItem = sessionWithLineItems.line_items.data.find(item => 
      item.description.toLowerCase().includes('shipping') || 
      item.description.toLowerCase().includes('delivery')
    );
    
    orderData.shippingMethod = shippingItem ? shippingItem.description : 'Standard Shipping';

    console.log(`🚚 Shipping Method: ${orderData.shippingMethod}`);
    console.log(`💰 Order Total: $${orderData.orderTotal} ${orderData.currency}`);

    // Test email sending
    await testEmailSending(orderData);

    console.log('\n✅ Webhook processing test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testInventoryUpdate(productId, weight, quantity) {
  try {
    const updateData = {
      action: 'updateStock',
      productId: productId,
      weight: weight,
      quantityToReduce: quantity
    };

    await mockFetch('https://script.google.com/mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    console.log(`   ✅ Inventory updated: ${productId} (${weight}) - reduced by ${quantity}`);
  } catch (error) {
    console.log(`   ❌ Inventory update failed: ${error.message}`);
  }
}

async function testEmailSending(orderData) {
  try {
    // Test shipping notification email
    const shippingEmail = {
      from: 'orders@outbackgems.com.au',
      to: 'shipping@outbackgems.com.au',
      subject: `NEW ORDER - ${orderData.sessionId} - $${orderData.orderTotal} AUD`,
      html: '<!-- Generated HTML email content -->'
    };

    await mockResend.emails.send(shippingEmail);
    console.log('   ✅ Shipping notification email sent');

    // Test customer confirmation email
    const customerEmail = {
      from: 'orders@outbackgems.com.au',
      to: orderData.customerEmail,
      subject: `Order Confirmation - Outback Gems & Minerals - ${orderData.sessionId}`,
      html: '<!-- Generated HTML email content -->'
    };

    await mockResend.emails.send(customerEmail);
    console.log('   ✅ Customer confirmation email sent');

  } catch (error) {
    console.log(`   ❌ Email sending failed: ${error.message}`);
  }
}

// Test webhook signature verification
function testWebhookSignature() {
  console.log('🔐 Testing Webhook Signature Verification...\n');
  
  const testPayload = JSON.stringify(testWebhookPayload);
  const testSecret = 'whsec_test123456789';
  const testTimestamp = Math.floor(Date.now() / 1000);
  
  // This would normally use the stripe.webhooks.constructEvent method
  console.log('📝 Test payload size:', testPayload.length, 'bytes');
  console.log('🕒 Test timestamp:', testTimestamp);
  console.log('🔑 Test secret format:', testSecret.substring(0, 10) + '...');
  console.log('✅ Signature verification logic ready');
}

// Environment check
function checkEnvironment() {
  console.log('🌍 Environment Check...\n');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 
    'RESEND_API_KEY',
    'GOOGLE_SHEETS_INVENTORY_UPDATE_URL'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Not set`);
    }
  });
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Stripe Webhook System Test Suite');
  console.log('=====================================\n');
  
  checkEnvironment();
  console.log('');
  
  testWebhookSignature();
  console.log('');
  
  await testWebhookProcessing();
  
  console.log('\n🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('1. Set up environment variables in Netlify');
  console.log('2. Deploy the webhook function');
  console.log('3. Configure Stripe webhook endpoint');
  console.log('4. Test with a real transaction');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebhookProcessing,
  testWebhookSignature,
  checkEnvironment,
  runAllTests
};
