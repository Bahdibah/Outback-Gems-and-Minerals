document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('token'); // PayPal token
  const sessionId = urlParams.get('session_id'); // Stripe session_id
  const statusMessageDiv = document.getElementById('paypal-status-message');
  const thankyouBox = document.querySelector('.thankyou-container');
  
  // Handle Stripe success
  if (sessionId) {
    // Clear cart for successful Stripe payment
    localStorage.removeItem('cart');
    if (typeof updateCartCount === 'function') {
      updateCartCount();
    }
    if (thankyouBox) thankyouBox.style.display = 'block';
    if (statusMessageDiv) {
      statusMessageDiv.innerHTML = '<span style="color: #27ae60;"><i class="fa fa-check-circle"></i> Payment completed successfully!</span>';
    }
  }
  // Handle PayPal cases ONLY if no Stripe session
  else if (orderId) {
    if (!statusMessageDiv) {
      console.error('PayPal status message div not found');
      return;
    }
    statusMessageDiv.innerHTML = '<span class="fa fa-spinner fa-spin"></span> Processing your payment, please wait...';
    fetch('https://outbackgems.netlify.app/.netlify/functions/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'COMPLETED') {
        // Clear cart only on successful payment completion
        localStorage.removeItem('cart');
        if (typeof updateCartCount === 'function') {
          updateCartCount();
        }
        if (thankyouBox) thankyouBox.style.display = 'block';
        statusMessageDiv.innerHTML = '<span style="color: #27ae60;"><i class="fa fa-check-circle"></i> Payment completed successfully!</span>';
      } else if (data.status === 'PENDING') {
        if (thankyouBox) thankyouBox.style.display = 'none';
        statusMessageDiv.innerHTML = '<span style="color: #ff9800;"><i class="fa fa-clock-o"></i> Your payment is pending. We\'ll notify you when it\'s complete.</span>';
      } else if (data.error) {
        if (thankyouBox) thankyouBox.style.display = 'none';
        statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a problem capturing your payment: ' + data.error + '</span>';
      } else {
        if (thankyouBox) thankyouBox.style.display = 'none';
        statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a problem processing your payment. Please contact support.</span>';
      }
    })
    .catch(err => {
      if (thankyouBox) thankyouBox.style.display = 'none';
      statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a network error capturing your payment.</span>';
    });
  }
  // Handle cases with no payment parameters (direct access or errors)
  else {
    if (thankyouBox) thankyouBox.style.display = 'none';
    if (statusMessageDiv) {
      statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> No payment information found. If you believe this is an error, please contact support.</span>';
    }
  }
});