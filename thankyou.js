document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('token');
  const statusMessageDiv = document.getElementById('paypal-status-message');
  if (orderId) {
    statusMessageDiv.innerHTML = '<span class="fa fa-spinner fa-spin"></span> Processing your payment, please wait...';
    fetch('/.netlify/functions/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'COMPLETED') {
        statusMessageDiv.innerHTML = '<span style="color: #27ae60;"><i class="fa fa-check-circle"></i> Payment completed successfully!</span>';
      } else if (data.status === 'PENDING') {
        statusMessageDiv.innerHTML = '<span style="color: #ff9800;"><i class="fa fa-clock-o"></i> Your payment is pending. We\'ll notify you when it\'s complete.</span>';
      } else if (data.error) {
        statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a problem capturing your payment: ' + data.error + '</span>';
      } else {
        statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a problem processing your payment. Please contact support.</span>';
      }
    })
    .catch(err => {
      statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> There was a network error capturing your payment.</span>';
    });
  } else if (statusMessageDiv) {
    statusMessageDiv.innerHTML = '<span style="color: #e74c3c;"><i class="fa fa-exclamation-circle"></i> No PayPal order was found. If you believe this is an error, please contact support.</span>';
  }
});