/**
 * Sync Inventory from Google Sheets to Website
 * 
 * This script fetches the latest inventory from your Google Sheets
 * and updates the local inventory.json file for your website.
 */

const fs = require('fs').promises;
const path = require('path');

// Your Google Sheets API endpoint (the public one that returns JSON)
// This should be set in your environment variables or config
const GOOGLE_SHEETS_URL = window.CONFIG?.GOOGLE_SHEETS_INVENTORY_URL || "YOUR_GOOGLE_SHEETS_URL_HERE";

async function syncInventoryFromGoogleSheets() {
  try {
    console.log('🔄 Fetching latest inventory from Google Sheets...');
    
    // Fetch data from Google Sheets
    const response = await fetch(GOOGLE_SHEETS_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const freshInventory = await response.json();
    console.log(`✅ Retrieved ${freshInventory.length} products from Google Sheets`);
    
    // Save to local inventory.json
    const inventoryPath = path.join(__dirname, 'inventory.json');
    await fs.writeFile(inventoryPath, JSON.stringify(freshInventory, null, 2));
    
    console.log('💾 Successfully updated inventory.json');
    console.log('📊 Current stock summary:');
    
    // Show stock summary
    let totalProducts = 0;
    let totalStock = 0;
    
    for (const product of freshInventory) {
      if (product.sizes) {
        for (const size of product.sizes) {
          totalProducts++;
          totalStock += size.stock || 0;
        }
      }
    }
    
    console.log(`   📦 Total product variations: ${totalProducts}`);
    console.log(`   📈 Total stock items: ${totalStock}`);
    console.log('');
    console.log('🚀 Ready to upload to your website!');
    console.log('   Next steps:');
    console.log('   1. Copy inventory.json to your website');
    console.log('   2. Upload/sync to your hosting');
    console.log('   3. Website will now show updated stock levels');
    
  } catch (error) {
    console.error('❌ Error syncing inventory:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify Google Sheets is accessible');
    console.log('   3. Make sure the Google Apps Script is deployed correctly');
  }
}

// Run the sync
console.log('📋 Outback Gems Inventory Sync Tool');
console.log('====================================');
syncInventoryFromGoogleSheets();
