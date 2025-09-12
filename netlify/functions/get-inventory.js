// Dynamic inventory endpoint that serves updated inventory data
// This replaces the static inventory.json file with live data

const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event) => {
  // Handle CORS for all requests
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Try to read the live inventory data from our storage
    let inventoryData;
    
    try {
      // Check if we have updated inventory in environment variable or storage
      const updatedInventory = process.env.UPDATED_INVENTORY;
      if (updatedInventory) {
        inventoryData = JSON.parse(updatedInventory);
      } else {
        // Fall back to reading the base inventory.json file
        const inventoryPath = path.join(process.cwd(), 'inventory.json');
        const inventoryString = await fs.readFile(inventoryPath, 'utf8');
        inventoryData = JSON.parse(inventoryString);
      }
    } catch (error) {
      // If all else fails, use Google Sheets API as ultimate fallback
      console.log('Falling back to Google Sheets API for inventory data');
      const response = await fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec');
      inventoryData = await response.json();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(inventoryData),
    };

  } catch (error) {
    console.error('Error serving inventory data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load inventory data',
        details: error.message
      }),
    };
  }
};
