// Inventory restore function for testing - restores inventory after test purchases
// Access via: /.netlify/functions/restore-inventory

exports.handler = async (event, context) => {
  console.log('🔄 INVENTORY RESTORE: Starting restore process...');
  
  try {
    // Parse the restore request
    const { restoreItems } = JSON.parse(event.body || '{}');
    
    if (!restoreItems || !Array.isArray(restoreItems)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid restore items provided' })
      };
    }

    const googleSheetsUpdateUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (!googleSheetsUpdateUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Google Sheets update URL not configured' })
      };
    }

    const results = [];

    // Restore each item (ADD back the quantity that was reduced)
    for (const item of restoreItems) {
      console.log(`🔄 RESTORING: ${item.productId}, weight: ${item.weight}, adding back: ${item.quantityToRestore}`);
      
      try {
        const requestBody = {
          action: 'updateStock',
          productId: item.productId,
          weight: item.weight,
          quantityToReduce: -item.quantityToRestore // NEGATIVE to ADD back inventory
        };

        const response = await fetch(googleSheetsUpdateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ RESTORE FAILED for ${item.productId}:`, response.status, errorText);
          results.push({
            productId: item.productId,
            weight: item.weight,
            status: 'FAILED',
            error: `${response.status}: ${errorText}`
          });
          continue;
        }

        const result = await response.json();
        console.log(`✅ RESTORED: ${item.productId}`, result);
        results.push({
          productId: item.productId,
          weight: item.weight,
          status: 'SUCCESS',
          result: result
        });

      } catch (error) {
        console.error(`💥 RESTORE ERROR for ${item.productId}:`, error);
        results.push({
          productId: item.productId,
          weight: item.weight,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Inventory restore completed',
        results: results,
        timestamp: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    console.error('💥 RESTORE FUNCTION ERROR:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error during restore',
        details: error.message 
      })
    };
  }
};