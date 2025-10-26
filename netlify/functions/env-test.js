// Environment and Google Sheets connectivity test
// Access via: /.netlify/functions/env-test

exports.handler = async (event, context) => {
  console.log('🔧 ENV TEST: Checking environment configuration...');
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      environmentCheck: {},
      googleSheetsTest: {}
    };
    
    // Check required environment variables
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET', 
      'GOOGLE_SHEETS_INVENTORY_UPDATE_URL',
      'RESEND_API_KEY'
    ];
    
    console.log('🔍 Checking environment variables...');
    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar];
      const masked = exists ? '***CONFIGURED***' : '❌ MISSING';
      results.environmentCheck[envVar] = {
        configured: exists,
        value: masked
      };
      console.log(`  ${envVar}: ${masked}`);
    }
    
    // Test Google Sheets connectivity (without updating inventory)
    const googleSheetsUrl = process.env.GOOGLE_SHEETS_INVENTORY_UPDATE_URL;
    
    if (googleSheetsUrl) {
      console.log('🧪 Testing Google Sheets connectivity...');
      
      try {
        // Send a test request that won't modify inventory
        const testRequest = {
          action: 'testConnection', // Safe test action
          timestamp: new Date().toISOString()
        };
        
        const response = await fetch(googleSheetsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testRequest)
        });
        
        console.log(`📊 Google Sheets response status: ${response.status}`);
        
        results.googleSheetsTest = {
          status: response.status,
          statusText: response.statusText,
          accessible: response.status < 500,
          responseTime: 'measured'
        };
        
        if (response.ok) {
          try {
            const responseData = await response.text();
            console.log('✅ Google Sheets is accessible');
            results.googleSheetsTest.responsePreview = responseData.substring(0, 200);
          } catch (parseError) {
            console.log('✅ Google Sheets responded (parsing optional)');
          }
        } else {
          console.log('⚠️ Google Sheets responded with error status');
        }
        
      } catch (fetchError) {
        console.error('❌ Google Sheets connectivity error:', fetchError.message);
        results.googleSheetsTest = {
          error: fetchError.message,
          accessible: false
        };
      }
    } else {
      results.googleSheetsTest = {
        error: 'GOOGLE_SHEETS_INVENTORY_UPDATE_URL not configured',
        accessible: false
      };
    }
    
    // Overall health check
    const envConfigured = Object.values(results.environmentCheck).every(env => env.configured);
    const sheetsAccessible = results.googleSheetsTest.accessible;
    
    results.overallHealth = {
      environmentVariables: envConfigured ? 'HEALTHY' : 'ISSUES_FOUND',
      googleSheetsConnectivity: sheetsAccessible ? 'HEALTHY' : 'ISSUES_FOUND',
      readyForProduction: envConfigured && sheetsAccessible
    };
    
    console.log('🏥 HEALTH CHECK COMPLETE:');
    console.log(`  Environment: ${results.overallHealth.environmentVariables}`);
    console.log(`  Google Sheets: ${results.overallHealth.googleSheetsConnectivity}`);
    console.log(`  Production Ready: ${results.overallHealth.readyForProduction}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(results, null, 2)
    };
    
  } catch (error) {
    console.error('💥 Environment test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Environment test failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};