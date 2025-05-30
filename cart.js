document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const cartTableBody = document.getElementById('cart-items');
  const subtotalElement = document.getElementById('subtotal');
  const shippingCostElement = document.getElementById('shipping-cost');
  const totalPriceElement = document.getElementById('total-price');
  const shippingOptionsContainer = document.querySelector('.shipping-options');
  const loadingMessage = document.getElementById('loading-message');
  const checkoutButton = document.getElementById('cart-page-checkout-button');
  const continueShoppingButton = document.getElementById('continue-shopping-button');
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
        <td>
          <button class="decrease-quantity" data-index="${idx}">-</button>
          <input type="number" value="${item.quantity}" min="1" data-index="${idx}" class="quantity-input" />
          <button class="increase-quantity" data-index="${idx}">+</button>
        </td>
        <td>$${item.price.toFixed(2)}</td>
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
    if (cart.length === 0) return;

    let loadingTimer;
    try {
      // Delay showing loading spinner by 750ms
      loadingTimer = setTimeout(() => {
        if (loadingMessage) loadingMessage.style.display = 'block';
      }, 750);

      const response = await fetch(stockApiUrl);
      const products = await response.json();
      let stockOk = true;
      let adjustedItems = [];

      cart.forEach((item, idx) => {
        const product = products.find(p => p["product id"] === item.id);
        const row = cartTableBody.querySelectorAll('tr')[idx];
        if (product && item.quantity > product.stock) {
          stockOk = false;
          // Warn user visually
          if (row) {
            row.style.backgroundColor = "#ffe5e5";
            row.title = `Only ${product.stock} in stock`;
          }
          if (item.quantity !== product.stock) {
            adjustedItems.push(`"${item.name}" (max ${product.stock})`);
          }
          // Adjust quantity in cart and localStorage
          item.quantity = product.stock;
        } else if (row) {
          row.style.backgroundColor = "";
          row.title = "";
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

      // If any quantity was adjusted, reload the cart and show a single alert
      if (adjustedItems.length > 0) {
        loadCart(false); // This will NOT call verifyCartStock again
        alert(`The following items were adjusted to available stock:\n\n${adjustedItems.join('\n')}`);
      }
    } catch (error) {
      console.error("Error verifying stock:", error);
    } finally {
      clearTimeout(loadingTimer);
      if (loadingMessage) loadingMessage.style.display = 'none';
    }
  }

  // Debounced stock check (500ms)
  const debouncedVerifyCartStock = debounce(verifyCartStock, 500);

  // Cart table event delegation
  cartTableBody.addEventListener('click', (event) => {
    const target = event.target;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
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

  cartTableBody.addEventListener('input', (event) => {
    if (event.target.classList.contains('quantity-input')) {
      const idx = +event.target.getAttribute('data-index');
      const newQuantity = parseInt(event.target.value, 10);
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      if (cart[idx] && newQuantity > 0) {
        cart[idx].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        loadCart(false); // Don't verify stock immediately
        debouncedVerifyCartStock();
      } else {
        alert('Quantity must be at least 1.');
        loadCart(false);
      }
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
      window.location.href = 'products.html';
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
      const method = finalCheckoutButton.dataset.method;
      if (method === 'pay-card') {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          weight: item.weight,
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

        console.log('Cart being sent:', cart, shippingMethod, shippingCost);
        const response = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart, shippingCost, shippingMethod }),
        });
        const text = await response.text();
        console.log('Function response:', text);
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
        const stripe = Stripe('pk_test_51RSrS62LkmYKgi6mvADvrSFydOLBRaVVyniXGlSLPIxQoHEXnTXd7sVcnUzxBGaplW6Tyd1WSBuDk4lYrTUXNphM00pn9Kv2mg');
        stripe.redirectToCheckout({ sessionId: data.id });
      }
      // ...handle other payment methods...
    });
  }

  // Initial load
  loadCart();
  updateCartCount();
});