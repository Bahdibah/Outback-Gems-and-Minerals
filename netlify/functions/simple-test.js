// Simple test function to check if Netlify functions are working
// Access via: /.netlify/functions/simple-test

exports.handler = async (event, context) => {
  console.log('🧪 SIMPLE TEST: Function is working!');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Test function is working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      url: event.path
    }, null, 2)
  };
};