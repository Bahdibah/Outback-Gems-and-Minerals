document.addEventListener('DOMContentLoaded', () => {
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
        <label for="shipping-method">Shipping Method:</label>
        <select id="shipping-method">
          <option value="standard">Free Standard Shipping</option>
          <option value="express">Express Shipping ($5.00)</option>
        </select>
      `;
      shippingCost = savedShippingMethod === 'standard' ? 0 : 5.00;
    } else {
      shippingOptionsContainer.innerHTML = `
        <label for="shipping-method">Shipping Method:</label>
        <select id="shipping-method">
          <option value="standard">Standard Shipping ($10.95)</option>
          <option value="express">Express Shipping ($14.45)</option>
        </select>
      `;
      shippingCost = savedShippingMethod === 'standard' ? 10.95 : 14.45;
    }

    // Set the saved shipping method
    const shippingMethodElement = document.getElementById('shipping-method');
    if (shippingMethodElement) {
      shippingMethodElement.value = savedShippingMethod;
      shippingMethodElement.addEventListener('change', () => {
        localStorage.setItem('selectedShippingMethod', shippingMethodElement.value);
        updateShippingAndTotal(subtotal);
      });
    }

    shippingCostElement.textContent = `Shipping: $${shippingCost.toFixed(2)}`;
    totalPriceElement.textContent = `Total Price: $${(subtotal + shippingCost).toFixed(2)}`;
  }

  // Load cart items and render
  async function loadCart(verifyStock = true) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartTableBody.innerHTML = '';
    if (cart.length === 0) {
      cartTableBody.innerHTML = '<tr><td colspan="7">Your cart is empty.</td></tr>';
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
        <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;" /></td>
        <td>
          ${item.name}
          <div class="cart-product-id">${item.id || item["product id"] || ''}</div>
        </td>
        <td>${item.weight || ''} ${item.unit || ''}</td>
        <td class="quantity-cell">   
          <div class="quantity-buttons">
           <button class="increase-quantity" data-index="${idx}">+</button> 
           <button class="decrease-quantity" data-index="${idx}">-</button>     
          </div>              
          <input type="number" value="${item.quantity}" min="1" data-index="${idx}" class="quantity-input" />  
        </td>
        <td class="price-cell">$${item.price.toFixed(2)}</td>
        <td>$${itemTotal.toFixed(2)}</td>
        <td>
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
            row.style.backgroundColor = "#ffe5e5";
            row.title = `Only ${product.stock} in stock`;
          }
          if (item.quantity !== product.stock) {
            adjustedItems.push(`"${item.name}" (max ${product.stock})`);
            item.quantity = product.stock;
          }
        } else if (row) {
          row.style.backgroundColor = "";
          row.title = "";
        }
      } else {
        // No matching product found
        if (row) {
          row.style.backgroundColor = "#ffe5e5";
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
    if (event.target.id === 'shipping-method') {
      updateShippingAndTotal();
    }
  });

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
      paymentOptionsBox.style.display = "block";
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
      if (overlay) overlay.style.display = 'flex'; // Show overlay

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

          const response = await fetch('/.netlify/functions/create-checkout-session', {
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
          const response = await fetch('/.netlify/functions/create-paypal-order', {
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
          document.getElementById('bank-transfer-modal').style.display = 'block';
          // Optionally, fill in the order summary
          const cart = JSON.parse(localStorage.getItem('cart')) || [];
          let summaryHtml = '<ul>';
          cart.forEach(item => {
            summaryHtml += `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`;
          });
          summaryHtml += '</ul>';
          document.getElementById('bank-order-summary').innerHTML = summaryHtml;
        }
        // ...handle other payment methods...
      } finally {
        if (overlay) overlay.style.display = 'none'; // Hide overlay when done
      }
    });
  }

  document.getElementById('place-bank-order').addEventListener('click', async () => {
    const email = document.getElementById('bank-email').value.trim();
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';

    // Send to Netlify function
    const response = await fetch('/.netlify/functions/create-bank-transfer-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, shippingMethod, customerEmail: email }),
    });
    const data = await response.json();
    if (data.error) {
      document.getElementById('bank-transfer-result').textContent = 'Error: ' + data.error;
    } else {

      document.getElementById('bank-transfer-form-section').style.display = 'none';

      // Show confirmation and bank details
      document.getElementById('bank-transfer-result').innerHTML = `
        <h3 style="color:#cc5500;">Order Placed!</h3>
        <p>To complete your order, please transfer the total amount to:</p>
        <pre>${data.bankDetails}</pre>
        <div class="modal-section-title" style="color:#cc5500; font-weight:bold;">Order Summary:</div>
        <pre style="color:#fff; font-size:1.1em; font-family:'Inter',Arial,sans-serif;">${data.orderSummary}</pre>
        <div class="modal-total"><strong>Total:</strong> $${data.total}</div>
        <p class="modal-confirmation" style="color:#cc5500; font-weight:bold;">
          We've also sent these details to your email.
        </p>
      `;
      localStorage.removeItem('cart');
      updateCartCount();
      loadCart(); // <-- Add this line
    }
  });

  document.getElementById('close-bank-modal').onclick = function() {
    document.getElementById('bank-transfer-modal').style.display = 'none';
  };
  window.onclick = function(event) {
    const modal = document.getElementById('bank-transfer-modal');
    if (event.target === modal) {
      modal.style.display = 'none';
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

    document.getElementById('order-confirmation-modal').style.display = 'block';
  }

  loadCart();
  updateCartCount();
});
