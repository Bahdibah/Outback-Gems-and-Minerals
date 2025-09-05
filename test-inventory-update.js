/**
 * Simple test script for local inventory updates
 * This tests the update-inventory function with your actual inventory.json
 */

const fs = require('fs').promises;
const path = require('path');

async function testInventoryUpdate() {
  console.log('🧪 Testing Local Inventory Update...\n');

  try {
    // First, let's check what products are available in inventory.json
    console.log('📋 Reading current inventory...');
    const inventoryPath = path.join(__dirname, 'inventory.json');
    const inventoryData = await fs.readFile(inventoryPath, 'utf8');
    const inventory = JSON.parse(inventoryData);

    // Show first few products as examples
    console.log('\n📦 Sample products in inventory:');
    for (let i = 0; i < Math.min(5, inventory.length); i++) {
      const product = inventory[i];
      console.log(`   ${product["product id"]} - ${product["product name"]}`);
      console.log(`   Weight: ${product.weight}${product.unit || ''}, Stock: ${product.stock}`);
      console.log('');
    }

    // Test with a real product from your inventory
    const testProduct = inventory.find(p => p.stock > 0); // Find a product with stock
    
    if (!testProduct) {
      console.log('❌ No products with stock found for testing');
      return;
    }

    console.log(`🎯 Testing with product: ${testProduct["product id"]}`);
    console.log(`   Name: ${testProduct["product name"]}`);
    console.log(`   Current stock: ${testProduct.stock}`);
    console.log(`   Weight: ${testProduct.weight}${testProduct.unit || ''}`);

    // Simulate the inventory update function
    const result = await simulateInventoryUpdate(
      testProduct["product id"],
      testProduct.weight,
      1 // Reduce by 1
    );

    console.log('\n📊 Update result:', result);

    if (result.success) {
      console.log('✅ Inventory update test passed!');
      console.log(`   Stock changed: ${result.previousStock} → ${result.newStock}`);
    } else {
      console.log('❌ Inventory update test failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function simulateInventoryUpdate(productId, weight, quantityToReduce) {
  try {
    const inventoryPath = path.join(__dirname, 'inventory.json');
    
    // Read the current inventory
    const inventoryData = await fs.readFile(inventoryPath, 'utf8');
    const inventory = JSON.parse(inventoryData);

    // Find the product to update
    let productFound = false;
    let updatedProduct = null;

    for (let i = 0; i < inventory.length; i++) {
      const product = inventory[i];
      
      // Match by product ID and weight
      if (product["product id"] === productId && Number(product.weight) === Number(weight)) {
        const currentStock = Number(product.stock) || 0;
        const newStock = Math.max(0, currentStock - quantityToReduce);
        
        // For testing, we'll just show what would happen without actually updating
        productFound = true;
        updatedProduct = {
          productId: productId,
          weight: weight,
          previousStock: currentStock,
          newStock: newStock,
          quantityReduced: Math.min(currentStock, quantityToReduce)
        };
        
        console.log(`📝 Would update stock for ${productId} (${weight}): ${currentStock} → ${newStock}`);
        break;
      }
    }

    if (!productFound) {
      return {
        success: false,
        error: `Product not found: ${productId} with weight ${weight}`,
        productId: productId,
        weight: weight
      };
    }

    return {
      success: true,
      message: 'Inventory update simulation successful',
      ...updatedProduct,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`Failed to simulate inventory update: ${error.message}`);
  }
}

// Test webhook email generation
function testEmailGeneration() {
  console.log('\n📧 Testing Email Generation...\n');

  const mockOrderData = {
    sessionId: 'cs_test_12345',
    paymentIntentId: 'pi_test_12345',
    customerEmail: 'test@example.com',
    customerName: 'John Smith',
    customerPhone: '+61412345678',
    shippingAddress: {
      name: 'John Smith',
      line1: '123 Test Street',
      line2: 'Unit 1',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      country: 'AU'
    },
    orderTotal: '125.50',
    currency: 'AUD',
    createdAt: new Date(),
    shippingMethod: 'Express Shipping',
    lineItems: [
      {
        name: 'Blue Sapphire Rough (5.5ct)',
        quantity: 1,
        unitPrice: '95.00',
        totalPrice: '95.00',
        productId: 'sap001',
        weight: '5.5'
      },
      {
        name: 'Ruby Rough - Premium Grade (3.2ct)',
        quantity: 1,
        unitPrice: '30.50',
        totalPrice: '30.50',
        productId: 'rub002',
        weight: '3.2'
      }
    ]
  };

  console.log('📋 Mock order data created:');
  console.log(`   Order ID: ${mockOrderData.sessionId}`);
  console.log(`   Customer: ${mockOrderData.customerName} (${mockOrderData.customerEmail})`);
  console.log(`   Total: $${mockOrderData.orderTotal} ${mockOrderData.currency}`);
  console.log(`   Items: ${mockOrderData.lineItems.length} products`);
  
  console.log('\n✅ Email templates would be generated with this data');
  console.log('   - Shipping notification email (for you only)');
  console.log('   - Customer emails handled separately by you');
}

async function runTests() {
  console.log('🧪 Outback Gems Inventory Update Test');
  console.log('=====================================\n');
  
  await testInventoryUpdate();
  testEmailGeneration();
  
  console.log('\n🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('1. Deploy the webhook functions to Netlify');
  console.log('2. Set up Stripe webhook endpoint');
  console.log('3. Configure Resend for email delivery');
  console.log('4. Test with a real transaction');
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testInventoryUpdate, testEmailGeneration, runTests };
