document.addEventListener('DOMContentLoaded', () => {
  // Payment Method Security Information Configuration
  window.paymentSecurityInfo = {
    'default': [
      { icon: 'fa-shield', text: 'SSL Encrypted' },
      { icon: 'fa-lock', text: 'Secure Payment' },
      { icon: 'fa-check-circle', text: 'Trusted Checkout' }
    ],
    'card': [
      { icon: 'fa-credit-card', text: 'Powered by Stripe' },
      { icon: 'fa-shield', text: 'Bank-Level Security' },
      { icon: 'fa-lock', text: 'PCI DSS Compliant' }
    ],
    'paypal': [
      { icon: 'fa-paypal', text: 'PayPal Protection' },
      { icon: 'fa-shield', text: 'Buyer Protection' },
      { icon: 'fa-shield', text: 'Purchase Coverage' }
    ],
    'bank': [
      { icon: 'fa-university', text: 'Direct Bank Transfer' },
      { icon: 'fa-phone', text: 'Personal Service' },
      { icon: 'fa-clock-o', text: 'Manual Verification' }
    ]
  };

  // DOM references
  const cartTableBody = document.getElementById('cart-items');
  const subtotalElement = document.getElementById('subtotal');
  const shippingCostElement = document.getElementById('shipping-cost');
  const totalPriceElement = document.getElementById('total-price');
  const shippingOptionsContainer = document.querySelector('.shipping-options');
  const loadingMessage = document.getElementById('loading-message');
  const checkoutButton = document.getElementById('cart-page-checkout-button');
  const continueShoppingButton = document.getElementById('cart-continue-shopping');
  const stockApiUrl = 'https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec';

  // Debounce utility
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Update shipping and total
  function updateShippingAndTotal(subtotal = null) {
    if (subtotal === null) {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    let shippingCost = 0;
    const savedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';

    if (subtotal >= 100) {
      shippingOptionsContainer.innerHTML = `
        <div class="shipping-header" onclick="toggleShippingSection()">
          <div class="shipping-header-left">
            <i class="fa fa-truck" aria-hidden="true"></i>
            <h3>Delivery Options</h3>
          </div>
          <i class="fa fa-chevron-down shipping-toggle" id="shipping-toggle"></i>
        </div>
        <div class="shipping-summary" id="shipping-summary">
          <i class="fa fa-truck" aria-hidden="true"></i>
          <span id="selected-shipping-text">${savedShippingMethod === 'standard' ? 'Standard Delivery (Free)' : 'Express Delivery (+$5.00)'}</span>
        </div>
        <div class="shipping-content" id="shipping-content">
          <div class="shipping-info">
            <div class="shipping-benefit">
              <i class="fa fa-check-circle" aria-hidden="true"></i>
              <span>Free standard shipping applied</span>
            </div>
            <p class="shipping-coverage"><i class="fa fa-map-marker" aria-hidden="true"></i> <strong>Australia-wide delivery</strong> - Fast, secure service nationwide</p>
          </div>
          <div class="shipping-options-grid">
            <label class="shipping-option ${savedShippingMethod === 'standard' ? 'selected' : ''}" for="standard-radio">
              <input type="radio" id="standard-radio" name="shipping-method" value="standard" ${savedShippingMethod === 'standard' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-truck" aria-hidden="true"></i>
                  <span>Standard Delivery</span>
                  <span class="shipping-badge free-shipping">Free Shipping</span>
                </div>
                <div class="shipping-details">
                  <span class="delivery-time">5-7 business days</span>
                  <span class="australia-post">Australia Post Reliable Service</span>
                </div>
              </div>
            </label>
            <label class="shipping-option ${savedShippingMethod === 'express' ? 'selected' : ''}" for="express-radio">
              <input type="radio" id="express-radio" name="shipping-method" value="express" ${savedShippingMethod === 'express' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-plane" aria-hidden="true"></i>
                  <span>Express Delivery</span>
                  <span class="shipping-badge upgrade">+$5.00</span>
                </div>
                <div class="shipping-details">
                  <span class="delivery-time">1-3 business days</span>
                  <span class="australia-post">Australia Post Express Service</span>
                </div>
              </div>
            </label>
          </div>
        </div>
      `;
      shippingCost = savedShippingMethod === 'standard' ? 0 : 5.00;
    } else {
      const remaining = (100 - subtotal).toFixed(2);
      shippingOptionsContainer.innerHTML = `
        <div class="shipping-header" onclick="toggleShippingSection()">
          <div class="shipping-header-left">
            <i class="fa fa-truck" aria-hidden="true"></i>
            <h3>Delivery Options</h3>
          </div>
          <i class="fa fa-chevron-down shipping-toggle" id="shipping-toggle"></i>
        </div>
        <div class="shipping-summary" id="shipping-summary">
          <i class="fa fa-truck" aria-hidden="true"></i>
          <span id="selected-shipping-text">${savedShippingMethod === 'standard' ? 'Standard Delivery ($10.95)' : 'Express Delivery ($15.95)'}</span>
        </div>
        <div class="shipping-content" id="shipping-content">
          <div class="shipping-info">
            <div class="shipping-incentive-subtle">
              <i class="fa fa-star" aria-hidden="true"></i>
              <span>Free standard shipping on orders over $100</span>
              <span class="remaining-amount">($${remaining} to go)</span>
            </div>
            <p class="shipping-coverage"><i class="fa fa-map-marker" aria-hidden="true"></i> <strong>Australia-wide delivery</strong> - Fast, secure service nationwide</p>
          </div>
          <div class="shipping-options-grid">
            <label class="shipping-option ${savedShippingMethod === 'standard' ? 'selected' : ''}" for="standard-radio">
              <input type="radio" id="standard-radio" name="shipping-method" value="standard" ${savedShippingMethod === 'standard' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-truck" aria-hidden="true"></i>
                  <span>Standard Delivery</span>
                  <span class="shipping-badge standard">$10.95</span>
                </div>
                <div class="shipping-details">
                  <span class="delivery-time">5-7 business days</span>
                  <span class="australia-post">Australia Post Reliable Service</span>
                </div>
              </div>
            </label>
            <label class="shipping-option ${savedShippingMethod === 'express' ? 'selected' : ''}" for="express-radio">
              <input type="radio" id="express-radio" name="shipping-method" value="express" ${savedShippingMethod === 'express' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-plane" aria-hidden="true"></i>
                  <span>Express Delivery</span>
                <span class="shipping-badge express">$14.45</span>
              </div>
              <div class="shipping-details">
                <span class="delivery-time">1-3 business days</span>
                <span class="australia-post">Australia Post Express Service</span>
              </div>
            </div>
          </label>
        </div>
      `;
      shippingCost = savedShippingMethod === 'standard' ? 10.95 : 14.45;
    }

    // Set up radio button event listeners
    const radioButtons = shippingOptionsContainer.querySelectorAll('input[name="shipping-method"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          localStorage.setItem('selectedShippingMethod', radio.value);
          updateShippingAndTotal(subtotal);
          
          // Update visual selection
          shippingOptionsContainer.querySelectorAll('.shipping-option').forEach(option => {
            option.classList.remove('selected');
          });
          radio.closest('.shipping-option').classList.add('selected');
        }
      });
    });

    shippingCostElement.textContent = `Shipping: $${shippingCost.toFixed(2)}`;
    totalPriceElement.textContent = `Total Price: $${(subtotal + shippingCost).toFixed(2)}`;
  }

  // Load cart items and render
  async function loadCart(verifyStock = true) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartTableBody.innerHTML = '';
    
    if (cart.length === 0) {
      cartTableBody.innerHTML = '<tr><td colspan="6" class="empty-cart-message">Your cart is empty. Start shopping to add items here.</td></tr>';
      subtotalElement.textContent = 'Subtotal: $0.00';
      shippingCostElement.textContent = 'Shipping: $0.00';
      totalPriceElement.textContent = 'Total Price: $0.00';
      shippingOptionsContainer.innerHTML = '';
      if (checkoutButton) checkoutButton.disabled = true;
      return;
    }
    let subtotal = 0;
    cart.forEach((item, idx) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="product-cell">
          <div class="product-info">
            <img src="${item.image}" alt="${item.name}" class="product-image" />
            <div class="product-details">
              <div class="product-name">${item.name}</div>
              <div class="cart-product-id">${item.id || item["product id"] || ''}</div>
            </div>
          </div>
        </td>
        <td class="weight-cell">${item.weight || ''} ${item.unit || ''}</td>
        <td class="quantity-cell">   
          <div class="quantity-controls">
            <button class="quantity-btn decrease-quantity" data-index="${idx}">-</button>
            <input type="number" value="${item.quantity}" min="1" data-index="${idx}" class="quantity-input" />
            <button class="quantity-btn increase-quantity" data-index="${idx}">+</button>
          </div>              
        </td>
        <td class="price-cell">$${item.price.toFixed(2)}</td>
        <td class="total-cell">$${itemTotal.toFixed(2)}</td>
        <td class="action-cell">
          <button data-index="${idx}" class="remove-button">Remove</button>
        </td>
      `;
      cartTableBody.appendChild(row);
    });
    subtotalElement.textContent = `Subtotal: $${subtotal.toFixed(2)}`;
    updateShippingAndTotal(subtotal);
    if (checkoutButton) checkoutButton.disabled = false;
    if (verifyStock) await verifyCartStock();
  }

  // Verify cart items against stock availability
  async function verifyCartStock() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cachedStockData = await getProductData();
    if (cart.length === 0) return;

    let stockOk = true;
    let adjustedItems = [];

    cart.forEach((item, idx) => {
      // Match by BOTH product id and weight
      const product = cachedStockData.find(
        p => p["product id"] === item.id && Number(p.weight) === Number(item.weight)
      );
      const row = cartTableBody.querySelectorAll('tr')[idx];

      if (product) {
        if (item.quantity > product.stock) {
          stockOk = false;
          if (row) {
            row.classList.add("row-error");
            row.title = `Only ${product.stock} in stock`;
          }
          if (item.quantity !== product.stock) {
            adjustedItems.push(`"${item.name}" (max ${product.stock})`);
            item.quantity = product.stock;
          }
        } else if (row) {
          row.classList.remove("row-error");
          row.title = "";
        }
      } else {
        // No matching product found
        if (row) {
          row.classList.add("row-error");
          row.title = `Product not found in stock data`;
        }
        adjustedItems.push(`"${item.name}" (not found in stock data)`);
        item.quantity = 0;
      }
    });

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();

    if (!stockOk && checkoutButton) {
      checkoutButton.disabled = true;
      checkoutButton.title = "Reduce quantities to available stock before checkout.";
    } else if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.title = "";
    }

    if (adjustedItems.length > 0) {
      loadCart(false);
      alert(`The following items were adjusted to available stock:\n\n${adjustedItems.join('\n')}`);
    }
  }

  // Debounced stock check (500ms)
  const debouncedVerifyCartStock = debounce(verifyCartStock, 500);

  // Cart table event delegation
  cartTableBody.addEventListener('click', (event) => {
    const target = event.target;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cachedStockData = JSON.parse(localStorage.getItem('productDataCache')) || [];
    let changed = false;

    if (target.classList.contains('decrease-quantity')) {
      const idx = +target.getAttribute('data-index');
      if (cart[idx] && cart[idx].quantity > 1) {
        cart[idx].quantity -= 1;
        changed = true;
      }
    }

    if (target.classList.contains('increase-quantity')) {
      const idx = +target.getAttribute('data-index');
      if (cart[idx]) {
          const product = cachedStockData.find(
            p => p["product id"] === cart[idx].id && Number(p.weight) === Number(cart[idx].weight)
          );
        if (product && cart[idx].quantity + 1 > product.stock) {
          alert(`Cannot add more of "${cart[idx].name}". Only ${product.stock} in stock.`);
          return;
        }
        cart[idx].quantity += 1;
        changed = true;
      }
    }

    if (target.classList.contains('remove-button')) {
      const idx = +target.getAttribute('data-index');
      cart.splice(idx, 1);
      changed = true;
    }

    if (changed) {
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      loadCart(false); // Don't verify stock immediately
      debouncedVerifyCartStock();
    }
  });

  function handleQuantityInput(event) {
    if (event.target.classList.contains('quantity-input')) {
      const idx = +event.target.getAttribute('data-index');
      const newQuantity = parseInt(event.target.value, 10);
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      getProductData().then(cachedStockData => {
        const product = cachedStockData.find(
          p => p["product id"] === cart[idx].id && Number(p.weight) === Number(cart[idx].weight)
        );

        if (cart[idx] && newQuantity > 0) {
          if (product && newQuantity > product.stock) {
            alert(`Cannot set quantity of "${cart[idx].name}" to ${newQuantity}. Only ${product.stock} in stock.`);
            event.target.value = cart[idx].quantity; // Reset to previous value
            return;
          }
          cart[idx].quantity = newQuantity;
          localStorage.setItem('cart', JSON.stringify(cart));
          updateCartCount();
          loadCart(false);
          debouncedVerifyCartStock();
        } else if (cart[idx]) {
          alert('Quantity must be at least 1.');
          event.target.value = cart[idx].quantity; // Reset to previous value
          loadCart(false);
        }
      });
    }
  }

  // Listen for blur and change events
  cartTableBody.addEventListener('change', handleQuantityInput);
  cartTableBody.addEventListener('blur', handleQuantityInput, true);

  // Optionally handle Enter key
  cartTableBody.addEventListener('keydown', function(event) {
    if (
      event.target.classList.contains('quantity-input') &&
      (event.key === 'Enter' || event.keyCode === 13)
    ) {
      handleQuantityInput(event);
      event.target.blur();
    }
  });

  // Shipping method change
  shippingOptionsContainer.addEventListener('change', (event) => {
    if (event.target.name === 'shipping-method') {
      localStorage.setItem('selectedShippingMethod', event.target.value);
      
      // Update visual selection immediately
      shippingOptionsContainer.querySelectorAll('.shipping-option').forEach(option => {
        option.classList.remove('selected');
      });
      event.target.closest('.shipping-option').classList.add('selected');
      
      // Update shipping summary text
      updateShippingSummary(event.target.value);
      
      // Update shipping costs and totals
      updateShippingAndTotal();
    }
  });

  // Toggle shipping section function
  window.toggleShippingSection = function() {
    const content = document.getElementById('shipping-content');
    const toggle = document.getElementById('shipping-toggle');
    const summary = document.getElementById('shipping-summary');
    
    if (content && toggle && summary) {
      const isCollapsed = content.classList.contains('collapsed');
      
      if (isCollapsed) {
        // Expand
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        summary.classList.remove('show');
      } else {
        // Collapse
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        summary.classList.add('show');
      }
    }
  };

  // Update shipping summary text
  function updateShippingSummary(shippingMethod) {
    const summaryText = document.getElementById('selected-shipping-text');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (summaryText) {
      if (subtotal >= 100) {
        summaryText.textContent = shippingMethod === 'standard' ? 
          'Standard Delivery (Free)' : 'Express Delivery (+$5.00)';
      } else {
        summaryText.textContent = shippingMethod === 'standard' ? 
          'Standard Delivery ($10.95)' : 'Express Delivery ($15.95)';
      }
    }
  }

  // Continue shopping button
  if (continueShoppingButton) {
    continueShoppingButton.addEventListener('click', () => {
      window.location.href = 'products.html#view-all'; // Adjust anchor as needed
    });
  }

  // Checkout button (add your logic)
  const paymentOptionsBox = document.getElementById('payment-options-box');
  if (checkoutButton && paymentOptionsBox) {
    checkoutButton.addEventListener("click", () => {
      if (checkoutButton.disabled) {
        alert("Please adjust your cart to available stock before checking out.");
        return;
      }
      paymentOptionsBox.classList.add("show-block");
      paymentOptionsBox.scrollIntoView({ behavior: "smooth" });
    });
  }

  const finalCheckoutButton = document.getElementById('final-checkout-button');
  document.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
      if (finalCheckoutButton) finalCheckoutButton.disabled = false;
      // Optionally, store which payment method was selected for later use
      finalCheckoutButton.dataset.method = this.id;
    });
  });

  // Optional: Handle the final checkout button click
  if (finalCheckoutButton) {
    finalCheckoutButton.addEventListener('click', async function() {
      const overlay = document.getElementById('please-wait-overlay');
      if (overlay) overlay.classList.add('show-flex'); // Show overlay

      try {
        const method = finalCheckoutButton.dataset.method;
        if (method === 'pay-card') {
          let cart = JSON.parse(localStorage.getItem('cart')) || [];
          cart = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            weight: item.weight,
            unit: item.unit, // <-- This must be present and correct!
            quantity: item.quantity || 1
          }));

          // Calculate shipping
          const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
          let shippingCost = 0;
          const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
          if (subtotal >= 100) {
            shippingCost = shippingMethod === 'standard' ? 0 : 5.00;
          } else {
            shippingCost = shippingMethod === 'standard' ? 10.95 : 14.45;
          }

          const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart, shippingCost, shippingMethod }),
          });
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            alert('Checkout failed: Invalid server response');
            return;
          }
          if (!data.id) {
            alert('Checkout failed: ' + (data.error || 'No session ID returned.'));
            return;
          }
          const stripe = Stripe('pk_live_51RSrS62LkmYKgi6m273LNQSjpKI8SnxNtiQMGcHijiiL3eliZZzqKDR00BL8uNlwYFloGGO3kyNQJKctTvEK4eB000e8dIlEQd');
          stripe.redirectToCheckout({ sessionId: data.id });
        } else if (method === 'pay-paypal') {
          let cart = JSON.parse(localStorage.getItem('cart')) || [];
          cart = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            weight: item.weight,
            unit: item.unit, // <-- This must be present and correct!
            quantity: item.quantity || 1
          }));

          // Calculate shipping
          const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
          let shippingCost = 0;
          const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
          if (subtotal >= 100) {
            shippingCost = shippingMethod === 'standard' ? 0 : 5.00;
          } else {
            shippingCost = shippingMethod === 'standard' ? 10.95 : 14.45;
          }

          // Call your backend to create the PayPal order
          const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-paypal-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart, shippingCost, shippingMethod }),
          });
          const data = await response.json();
          if (!data.approvalUrl) {
            alert('PayPal checkout failed: ' + (data.error || 'No approval URL returned.'));
            return;
          }
          // Redirect to PayPal
          window.location.href = data.approvalUrl;
        } else if (method === 'pay-bank') {
          // Show the modal/section for bank transfer
          document.getElementById('bank-transfer-modal').classList.add('show-flex');
          // Fill in the order summary with shipping
          const cart = JSON.parse(localStorage.getItem('cart')) || [];
          const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
          let shippingCost = 0;
          const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
          if (subtotal >= 100) {
            shippingCost = shippingMethod === 'standard' ? 0 : 5.00;
          } else {
            shippingCost = shippingMethod === 'standard' ? 10.95 : 14.45;
          }
          const shippingLabel = shippingMethod === 'express' ? 'Express' : 'Standard';

          let summaryHtml = '<ul>';
          cart.forEach(item => {
            summaryHtml += `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`;
          });
          summaryHtml += `<li>Shipping (${shippingLabel}) – $${shippingCost.toFixed(2)}</li>`;
          summaryHtml += '</ul>';
          document.getElementById('bank-order-summary').innerHTML = summaryHtml;
        }
        // ...handle other payment methods...
      } finally {
        if (overlay) overlay.classList.remove('show-flex'); // Hide overlay when done
      }
    });
  }

  document.getElementById('place-bank-order').addEventListener('click', async () => {
    const email = document.getElementById('bank-email').value.trim();
    const street = document.getElementById('bank-shipping-street').value.trim();
    const suburb = document.getElementById('bank-shipping-suburb').value.trim();
    const state = document.getElementById('bank-shipping-state').value.trim();
    const postcode = document.getElementById('bank-shipping-postcode').value.trim();
    // Phone is optional
    const phone = document.getElementById('bank-shipping-phone').value.trim();

    // Validate required fields
    if (!email || !street || !suburb || !state || !postcode) {
      alert('Please fill out your email and all shipping address fields.');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';

    // Send to Netlify function
    const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-bank-transfer-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart,
        shippingMethod,
        customerEmail: email,
        shippingAddress: { street, suburb, state, postcode },
        phone // <-- add this line
      }),
    });
    const data = await response.json();
    if (data.error) {
      document.getElementById('bank-transfer-result').textContent = 'Error: ' + data.error;
    } else {

      document.getElementById('bank-transfer-form-section').classList.add('hide');

      // Show confirmation and bank details
      document.getElementById('bank-transfer-result').innerHTML = `
        <h3 class="order-success-title">Order Placed!</h3>
        <p>To complete your order, please transfer the total amount to:</p>
        <pre>${data.bankDetails}</pre>
        <div class="modal-section-title order-section-title">Order Summary:</div>
        <pre class="order-summary-text">${data.orderSummary}</pre>
        <div class="modal-total"><strong>Total:</strong> $${data.total}</div>
        <p class="modal-confirmation order-confirmation-text">
          We've also sent these details to your email.
        </p>
      `;
      localStorage.removeItem('cart');
      updateCartCount();
      loadCart(); // <-- Add this line
    }
  });

  document.getElementById('close-bank-modal').onclick = function() {
    document.getElementById('bank-transfer-modal').classList.remove('show-flex');
  };
  window.onclick = function(event) {
    const modal = document.getElementById('bank-transfer-modal');
    if (event.target === modal) {
      modal.classList.remove('show-flex');
    }
  };

  function showOrderConfirmationModal(order) {

    const summaryItems = order.items.map(item =>
      `<li>${item.name} x${item.quantity} – $${(item.price * item.quantity).toFixed(2)}</li>`
    );

    summaryItems.push(
      `<li>Shipping (${order.shippingMethod === 'express' ? 'Express' : 'Standard'}) – $${order.shippingCost.toFixed(2)}</li>`
    );

    document.querySelector('.modal-bank-details .modal-reference').textContent = order.reference;
    document.querySelector('.modal-order-summary').innerHTML = summaryItems.join('');
    document.querySelector('.modal-total strong').textContent = `Total: $${order.total.toFixed(2)}`;

    document.getElementById('order-confirmation-modal').classList.add('show-block');
  }

  // Enhanced Checkout: Payment Method Selection
  function initializeEnhancedCheckout() {
    const paymentCards = document.querySelectorAll('.payment-option-card');
    const checkoutNowButton = document.getElementById('checkout-now-button');
    const securityContainer = document.getElementById('checkout-security');
    
    // Function to update security information
    function updateSecurityInfo(paymentMethod) {
      if (!window.paymentSecurityInfo || !securityContainer) return;
      
      if (!paymentMethod || paymentMethod === 'default') {
        // Hide the security bar when no payment method is selected
        securityContainer.classList.add('hide');
        return;
      }
      
      const securityInfo = window.paymentSecurityInfo[paymentMethod];
      if (securityInfo) {
        // Show the security bar and update content
        securityContainer.classList.remove('hide');
        securityContainer.classList.add('show-flex');
        securityContainer.innerHTML = securityInfo.map(item => `
          <div class="security-item">
            <i class="fa ${item.icon}" aria-hidden="true"></i>
            <span>${item.text}</span>
          </div>
        `).join('');
      }
    }
    
    paymentCards.forEach(card => {
      card.addEventListener('click', function() {
        // Remove selected class from all cards
        paymentCards.forEach(c => c.classList.remove('selected'));
        // Add selected class to clicked card
        this.classList.add('selected');
        
        // Enable checkout button
        if (checkoutNowButton) {
          checkoutNowButton.disabled = false;
          checkoutNowButton.style.opacity = '1';
        }
        
        // Store selected payment method and update security info
        const selectedMethod = this.dataset.method;
        localStorage.setItem('selectedPaymentMethod', selectedMethod);
        updateSecurityInfo(selectedMethod);
      });
    });
    
    // Initialize with hidden security bar (no payment method selected)
    updateSecurityInfo(null);
    
    // Handle checkout now button
    if (checkoutNowButton) {
      checkoutNowButton.addEventListener('click', async function() {
        if (this.disabled) return;
        
        const selectedMethod = localStorage.getItem('selectedPaymentMethod');
        if (!selectedMethod) {
          alert('Please select a payment method before proceeding.');
          return;
        }
        
        // Show loading overlay
        const overlay = document.getElementById('please-wait-overlay');
        if (overlay) overlay.classList.add('show-flex');
        
        try {
          // Use existing payment processing logic based on selected method
          if (selectedMethod === 'card') {
            await processCardPayment();
          } else if (selectedMethod === 'paypal') {
            await processPayPalPayment();
          } else if (selectedMethod === 'bank') {
            processBankTransfer();
          }
        } catch (error) {
          console.error('Checkout error:', error);
          alert('An error occurred during checkout. Please try again.');
          if (overlay) overlay.classList.remove('show-flex');
        }
      });
    }
  }
  
  // Payment processing functions (using existing logic)
  async function processCardPayment() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      weight: item.weight,
      unit: item.unit,
      quantity: item.quantity
    }));

    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    const shippingCost = getShippingCostForMethod(shippingMethod);

    const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, shippingCost, shippingMethod }),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      alert('Checkout failed: Invalid server response');
      return;
    }
    if (!data.id) {
      alert('Checkout failed: ' + (data.error || 'No session ID returned.'));
      return;
    }
    const stripe = Stripe('pk_live_51RSrS62LkmYKgi6m273LNQSjpKI8SnxNtiQMGcHijiiL3eliZZzqKDR00BL8uNlwYFloGGO3kyNQJKctTvEK4eB000e8dIlEQd');
    // DON'T clear cart here - only clear on successful payment
    stripe.redirectToCheckout({ sessionId: data.id });
  }

  async function processPayPalPayment() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      weight: item.weight,
      unit: item.unit,
      quantity: item.quantity
    }));

    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    const shippingCost = getShippingCostForMethod(shippingMethod);

    const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, shippingCost, shippingMethod }),
    });
    const data = await response.json();
    if (!data.approvalUrl) {
      alert('PayPal checkout failed: ' + (data.error || 'No approval URL returned.'));
      return;
    }
    // DON'T clear cart here - only clear on successful payment
    window.location.href = data.approvalUrl;
  }

  function processBankTransfer() {
    const overlay = document.getElementById('please-wait-overlay');
    if (overlay) overlay.classList.remove('show-flex');
    
    // Fill in the order summary with shipping
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    const shippingCost = getShippingCostForMethod(shippingMethod);
    const shippingLabel = shippingMethod === 'express' ? 'Express' : 'Standard';

    let summaryHtml = '<ul>';
    cart.forEach(item => {
      summaryHtml += `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`;
    });
    summaryHtml += `<li>Shipping (${shippingLabel}) – $${shippingCost.toFixed(2)}</li>`;
    summaryHtml += '</ul>';
    document.getElementById('bank-order-summary').innerHTML = summaryHtml;
    
    document.getElementById('bank-transfer-modal').classList.add('show-block');
  }

  function getShippingCostForMethod(method) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (subtotal >= 100) {
      return method === 'express' ? 5 : 0;
    } else {
      return method === 'express' ? 14.45 : 10.95;
    }
  }

  // Initialize enhanced checkout when DOM is ready
  initializeEnhancedCheckout();

  loadCart();
  updateCartCount();
});
