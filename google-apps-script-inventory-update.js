/**
 * Google Apps Script for Outback Gems Inventory Management
 * This script handles inventory stock updates via webhook calls
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets with your inventory
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Deploy as web app with execution permissions for "Anyone"
 * 5. Copy the web app URL to your Netlify environment variable: GOOGLE_SHEETS_INVENTORY_UPDATE_URL
 */

// Configuration - Update these values to match your sheet
const SHEET_NAME = 'Sheet1'; // Change to your actual sheet name
const PRODUCT_ID_COLUMN = 2;  // Column B (product id)
const WEIGHT_COLUMN = 7;      // Column G (weight)
const STOCK_COLUMN = 11;      // Column K (stock)

function doPost(e) {
  try {
    // Parse the request
    const requestData = JSON.parse(e.postData.contents);
    
    // Log the request for debugging
    console.log('Received inventory update request:', requestData);
    
    // Validate request data
    if (!requestData.action || requestData.action !== 'updateStock') {
      return createResponse(400, { error: 'Invalid action. Expected "updateStock"' });
    }
    
    if (!requestData.productId || !requestData.weight || !requestData.quantityToReduce) {
      return createResponse(400, { 
        error: 'Missing required fields: productId, weight, quantityToReduce' 
      });
    }
    
    // Update the inventory
    const result = updateProductStock(
      requestData.productId,
      requestData.weight,
      parseInt(requestData.quantityToReduce)
    );
    
    return createResponse(200, result);
    
  } catch (error) {
    console.error('Error processing inventory update:', error);
    return createResponse(500, { 
      error: 'Internal server error',
      details: error.toString()
    });
  }
}

function updateProductStock(productId, weight, quantityToReduce) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found`);
    }
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find the product row
    let productRowIndex = -1;
    
    for (let i = 1; i < values.length; i++) { // Start from 1 to skip header
      const rowProductId = values[i][PRODUCT_ID_COLUMN - 1]; // Convert to 0-based index
      const rowWeight = Number(values[i][WEIGHT_COLUMN - 1]);
      
      if (rowProductId === productId && rowWeight === Number(weight)) {
        productRowIndex = i;
        break;
      }
    }
    
    if (productRowIndex === -1) {
      return {
        success: false,
        error: `Product not found: ${productId} with weight ${weight}`,
        productId: productId,
        weight: weight
      };
    }
    
    // Get current stock
    const currentStock = Number(values[productRowIndex][STOCK_COLUMN - 1]);
    const newStock = Math.max(0, currentStock - quantityToReduce); // Don't allow negative stock
    
    // Update the stock in the sheet
    sheet.getRange(productRowIndex + 1, STOCK_COLUMN).setValue(newStock);
    
    // Log the update
    console.log(`Stock updated for ${productId} (${weight}): ${currentStock} -> ${newStock}`);
    
    return {
      success: true,
      productId: productId,
      weight: weight,
      previousStock: currentStock,
      newStock: newStock,
      quantityReduced: Math.min(currentStock, quantityToReduce),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error updating product stock:', error);
    return {
      success: false,
      error: error.toString(),
      productId: productId,
      weight: weight
    };
  }
}

function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function - you can run this to test the functionality
function testUpdateStock() {
  // Example test - update these values to match your actual data
  const testResult = updateProductStock('TEST001', 100, 1);
  console.log('Test result:', testResult);
  return testResult;
}

// Helper function to list all products (for debugging)
function listAllProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  console.log('Products in sheet:');
  for (let i = 1; i < Math.min(6, values.length); i++) { // Show first 5 products
    const productId = values[i][PRODUCT_ID_COLUMN - 1];
    const weight = values[i][WEIGHT_COLUMN - 1];
    const stock = values[i][STOCK_COLUMN - 1];
    console.log(`${productId} (${weight}): ${stock} in stock`);
  }
}

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. Save this script in Google Apps Script
 * 2. Click "Deploy" > "New Deployment"
 * 3. Choose type: "Web app"
 * 4. Description: "Inventory Update API"
 * 5. Execute as: "Me"
 * 6. Who has access: "Anyone" (important for webhook access)
 * 7. Click "Deploy"
 * 8. Copy the Web app URL
 * 9. Add this URL to your Netlify environment variables as:
 *    GOOGLE_SHEETS_INVENTORY_UPDATE_URL=your_webapp_url_here
 * 
 * TESTING:
 * Run the testUpdateStock() function to verify it works with your data
 * Run listAllProducts() to see the structure of your data
 */
