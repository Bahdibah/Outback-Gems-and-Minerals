exports.handler = async (event) => {
  try {
    // Your logic here
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Bank transfer order function works!" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};