const fs = require('fs').promises;
const path = require('path');

// Simple in-memory storage for inventory updates
// In production, this would use a database, but for now we'll use a simple approach
let inventoryUpdates = new Map();

exports.handler = async (event) => {
  // Handle CORS preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
      body: "",
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle GET requests - return current inventory with updates applied
  if (event.httpMethod === 'GET') {
    try {
      const inventory = await getUpdatedInventory();
      return {
        statusCode: 200,
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inventory),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get inventory', details: error.message }),
      };
    }
  }

  // Handle POST requests - update inventory
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { productId, weight, quantityToReduce } = JSON.parse(event.body);

    // Validate input
    if (!productId || !weight || !quantityToReduce) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: productId, weight, quantityToReduce' 
        }),
      };
    }

    // Update the inventory
    const result = await updateInventoryStock(productId, weight, parseInt(quantityToReduce));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Error updating inventory:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
    };
  }
};

async function getUpdatedInventory() {
  try {
    // Load base inventory from file
    const inventoryPath = path.join(process.cwd(), 'inventory.json');
    const inventoryData = await fs.readFile(inventoryPath, 'utf8');
    const inventory = JSON.parse(inventoryData);

    // Apply any stock updates
    const updatedInventory = inventory.map(product => {
      const key = `${product["product id"]}-${product.weight}`;
      if (inventoryUpdates.has(key)) {
        const update = inventoryUpdates.get(key);
        return {
          ...product,
          stock: update.newStock
        };
      }
      return product;
    });

    return updatedInventory;
  } catch (error) {
    console.error('Error getting updated inventory:', error);
    throw error;
  }
}

async function updateInventoryStock(productId, weight, quantityToReduce) {
  try {
    // Load current inventory to find the product
    const inventory = await getUpdatedInventory();
    
    // Find the product to update
    const product = inventory.find(p => 
      p["product id"] === productId && Number(p.weight) === Number(weight)
    );

    if (!product) {
      return {
        success: false,
        error: `Product not found: ${productId} with weight ${weight}`,
        productId: productId,
        weight: weight
      };
    }

    const currentStock = Number(product.stock) || 0;
    const newStock = Math.max(0, currentStock - quantityToReduce); // Don't allow negative stock
    
    // Store the update in memory
    const key = `${productId}-${weight}`;
    inventoryUpdates.set(key, {
      productId,
      weight,
      newStock,
      updatedAt: new Date().toISOString()
    });

    console.log(`Stock updated for ${productId} (${weight}): ${currentStock} -> ${newStock}`);

    return {
      success: true,
      message: 'Inventory updated successfully',
      productId: productId,
      weight: weight,
      previousStock: currentStock,
      newStock: newStock,
      quantityReduced: Math.min(currentStock, quantityToReduce),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error updating inventory stock:', error);
    throw new Error(`Failed to update inventory: ${error.message}`);
  }
}
