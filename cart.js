

// Australian postcode validation
function validateAustralianPostcode(postcode) {
  // Australian postcodes are 4 digits, ranging from 0200-9999
  const postcodeRegex = /^[0-9]{4}$/;
  if (!postcodeRegex.test(postcode)) {
    return false;
  }
  
  const code = parseInt(postcode);
  // Exclude invalid ranges (0000-0199 are not used)
  if (code < 200) {
    return false;
  }
  
  return true;
}

// Background validation for faster checkout
let validationResult = null;
let validationPromise = null;
let validationInProgress = false;
let lastValidationCart = null;
let validationTimeout = null;

async function startBackgroundValidation() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  if (cart.length === 0) {
    console.log('Cart is empty, skipping background validation');
    return;
  }
  
  // Prevent multiple concurrent validations
  if (validationInProgress) {
    // console.log('⏳ Validation already in progress, skipping...');
    return;
  }
  
  // Check if cart hasn't changed since last validation
  const cartString = JSON.stringify(cart);
  if (lastValidationCart === cartString && validationResult && validationResult.valid) {
    // console.log('📋 Cart unchanged and previously validated, skipping...');
    return;
  }
  
  const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
  
  // console.log('🔄 Starting background cart validation...');
  validationInProgress = true;
  
  try {
    validationPromise = fetch('https://outbackgems.netlify.app/.netlify/functions/validate-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cart: cart,
        shippingMethod: shippingMethod
      })
    });
    
    const response = await validationPromise;
    
    // Check if the endpoint exists (not deployed yet)
    if (response.status === 404) {
      console.log('🔧 Validation endpoint not deployed yet - validation will happen during checkout');
      validationResult = { valid: false, error: 'Validation will occur during checkout', notDeployed: true };
      return;
    }
    
    validationResult = await response.json();
    
    if (validationResult.valid) {
      // console.log('✅ Background validation completed successfully');
      lastValidationCart = JSON.stringify(cart);
      showValidationSuccess();
    } else {
      console.log('❌ Background validation failed:', validationResult.error);
      showValidationWarning(validationResult.error);
    }
    
  } catch (error) {
    console.log('⚠️ Background validation failed with network error:', error);
    // Check if this might be due to endpoint not being deployed
    if (error.message && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.log('🔧 This might be because the validation endpoint is not deployed yet');
      validationResult = { valid: false, error: 'Validation will occur during checkout', notDeployed: true };
    } else {
      validationResult = { valid: false, error: 'Network error during validation' };
    }
  } finally {
    // Always reset the flag
    validationInProgress = false;
  }
}

function showValidationSuccess() {
  // Minimal visual feedback - just console for now, can be expanded later
  // console.log('✅ Cart validated - ready for instant checkout');
}

function showValidationWarning(error) {
  // Minimal visual feedback - just console for now, can be expanded later
  if (error === 'Validation will occur during checkout') {
    console.log('🔧 Background validation not available - will validate during checkout');
  } else if (error === 'Product validation service is temporarily unavailable. Validation will occur during checkout.') {
    console.log('⚠️ Google Apps Script temporarily unavailable - will validate during checkout instead');
  } else {
    console.log('⚠️ Cart validation warning:', error);
  }
}

function invalidateValidation() {
  // console.log('🔄 Cart changed, invalidating validation...');
  validationResult = null;
  validationPromise = null;
  lastValidationCart = null;
  
  // Clear any existing timeout to prevent multiple scheduled validations
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
  
  // If validation is currently in progress, don't reset the flag immediately
  // Just schedule a new validation after the current one completes
  validationTimeout = setTimeout(() => {
    validationTimeout = null;
    // Only start new validation if no validation is currently running
    if (!validationInProgress) {
      startBackgroundValidation();
    } else {
      // If still in progress, schedule another check
      validationTimeout = setTimeout(() => {
        validationTimeout = null;
        startBackgroundValidation();
      }, 500);
    }
  }, 2000); // Increased delay to 2 seconds
}

// Toggle payment buttons based on shipping selection
function togglePaymentButtons(disablePayments) {
  const paymentButtons = document.querySelectorAll('.payment-button, #checkout-btn, #paypal-btn, #bank-transfer-btn, #checkout-now-button, #final-checkout-button, #place-bank-order');
  const paymentOptions = document.querySelectorAll('#pay-card, #pay-paypal, #pay-bank, .payment-option');
  const checkoutSection = document.querySelector('.checkout-section');
  
  // Store the disabled state globally
  window.internationalShippingSelected = disablePayments;
  
  // Handle payment buttons
  paymentButtons.forEach(button => {
    if (disablePayments) {
      button.disabled = true;
      button.classList.add('disabled-payment');
      button.style.pointerEvents = 'none';
    } else {
      button.disabled = false;
      button.classList.remove('disabled-payment');
      button.style.pointerEvents = 'auto';
    }
  });
  
  // Handle payment option divs (pay-card, pay-paypal, pay-bank)
  paymentOptions.forEach(option => {
    if (disablePayments) {
      option.classList.add('disabled-payment');
      option.style.pointerEvents = 'none';
      option.style.opacity = '0.5';
      option.style.cursor = 'not-allowed';
    } else {
      option.classList.remove('disabled-payment');
      option.style.pointerEvents = 'auto';
      option.style.opacity = '1';
      option.style.cursor = 'pointer';
    }
  });
  
  // Add or remove disabled styling to checkout section
  if (checkoutSection) {
    if (disablePayments) {
      checkoutSection.classList.add('checkout-disabled');
      
      // Show message about international shipping suspension
      let disabledMessage = document.querySelector('.international-checkout-message');
      if (!disabledMessage) {
        disabledMessage = document.createElement('div');
        disabledMessage.className = 'international-checkout-message';
        disabledMessage.innerHTML = `
          <p><i class="fa fa-info-circle"></i> <strong>International shipping is temporarily suspended.</strong></p>
          <p>Payment options are disabled. Please <a href="contact.html">contact us</a> for assistance or select Australia-only shipping.</p>
        `;
        checkoutSection.insertBefore(disabledMessage, checkoutSection.firstChild);
      }
    } else {
      checkoutSection.classList.remove('checkout-disabled');
      
      // Remove disabled message
      const disabledMessage = document.querySelector('.international-checkout-message');
      if (disabledMessage) {
        disabledMessage.remove();
      }
    }
  }
}

// Global event interceptor to catch all payment-related clicks
document.addEventListener('click', function(event) {
  if (window.internationalShippingSelected) {
    const target = event.target;
    const isPaymentRelated = 
      target.matches('#pay-card, #pay-paypal, #pay-bank, .payment-option') ||
      target.closest('#pay-card, #pay-paypal, #pay-bank, .payment-option') ||
      target.matches('#checkout-now-button, #final-checkout-button, #place-bank-order') ||
      target.matches('.payment-button, #checkout-btn, #paypal-btn, #bank-transfer-btn') ||
      target.classList.contains('payment-button') ||
      target.closest('.payment-option');
    
    if (isPaymentRelated) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
      return false;
    }
  }
}, true); // Use capture phase to intercept before other handlers

// Function to prevent checkout when international shipping is selected (keeping for backwards compatibility)
function preventCheckout(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  
  // Show alert to user
  alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
  
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize payment button state based on current shipping selection
  const savedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
  togglePaymentButtons(savedShippingMethod === 'international');
  
  // Start background cart validation for faster checkout
  startBackgroundValidation();
  
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
        <div class="shipping-header" id="shipping-header">
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
                  <span class="australia-post">Australia Post Reliable Service - Australia Only</span>
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
                  <span class="australia-post">Australia Post Express Service - Australia Only</span>
                </div>
              </div>
            </label>
            <label class="shipping-option international-shipping-option ${savedShippingMethod === 'international' ? 'selected' : ''}" for="international-radio">
              <input type="radio" id="international-radio" name="shipping-method" value="international" ${savedShippingMethod === 'international' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-globe" aria-hidden="true"></i>
                  <span>International Shipping</span>
                </div>
                <div class="shipping-details">
                  <span class="delivery-time">Temporarily Suspended</span>
                  <span class="australia-post">Due to Australia Post service disruptions - <a href="contact.html">Contact us</a></span>
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
        <div class="shipping-header" id="shipping-header">
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
                  <span class="australia-post">Australia Post Reliable Service - Australia Only</span>
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
                  <span class="australia-post">Australia Post Express Service - Australia Only</span>
                </div>
              </div>
            </label>
            <label class="shipping-option international-shipping-option ${savedShippingMethod === 'international' ? 'selected' : ''}" for="international-radio-paid">
              <input type="radio" id="international-radio-paid" name="shipping-method" value="international" ${savedShippingMethod === 'international' ? 'checked' : ''}>
              <div class="shipping-option-content">
                <div class="shipping-title">
                  <i class="fa fa-globe" aria-hidden="true"></i>
                  <span>International Shipping</span>
                </div>
                <div class="shipping-details">
                  <span class="delivery-time">Temporarily Suspended</span>
                  <span class="australia-post">Due to Australia Post service disruptions - <a href="contact.html">Contact us</a></span>
                </div>
              </div>
            </label>
          </div>
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
          invalidateValidation(); // Re-validate cart when shipping method changes
          
          // Update visual selection
          shippingOptionsContainer.querySelectorAll('.shipping-option').forEach(option => {
            option.classList.remove('selected');
          });
          radio.closest('.shipping-option').classList.add('selected');
          
          // Disable/enable payment buttons based on shipping selection
          togglePaymentButtons(radio.value === 'international');
        }
      });
    });

    // Set up shipping header click event listener
    const shippingHeader = shippingOptionsContainer.querySelector('#shipping-header');
    if (shippingHeader) {
      shippingHeader.addEventListener('click', toggleShippingSection);
    }

    shippingCostElement.textContent = `Shipping: $${shippingCost.toFixed(2)}`;
    totalPriceElement.textContent = `Total Price: $${(subtotal + shippingCost).toFixed(2)}`;
    
    // Check current shipping method and toggle payment buttons accordingly
    togglePaymentButtons(savedShippingMethod === 'international');
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
            <a href="view-product.html?productid=${item.id || item["product id"]}" class="product-link">
              <img src="${item.image}" alt="${item.name}" class="product-image" />
            </a>
            <div class="product-details">
              <a href="view-product.html?productid=${item.id || item["product id"]}" class="product-name-link">
                <div class="product-name">${item.name}</div>
              </a>
              <div class="cart-product-id">${item.id || item["product id"] || ''}</div>
            </div>
          </div>
        </td>
        <td class="unit-cell">${item.weight || ''} ${item.unit || ''}</td>
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
    invalidateValidation(); // Re-validate cart after stock adjustments

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
      invalidateValidation(); // Re-validate cart after item removal
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
          invalidateValidation(); // Re-validate cart after quantity change
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
      invalidateValidation(); // Re-validate cart when shipping method changes
      
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
      // Check if international shipping is selected
      const selectedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
      if (selectedShippingMethod === 'international') {
        alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
        return;
      }
      
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
      // Check if international shipping is selected
      const selectedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
      if (selectedShippingMethod === 'international') {
        alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
        return;
      }
      
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
          // Check if international shipping is selected
          const selectedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
          if (selectedShippingMethod === 'international') {
            alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
            return;
          }
          
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

    // Validate Australian postcode
    if (!validateAustralianPostcode(postcode)) {
      alert('Please enter a valid Australian postcode (4 digits, 0200-9999). We only ship within Australia.');
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

  // Helper function to close bank transfer modal
  function closeBankTransferModal() {
    const modal = document.getElementById('bank-transfer-modal');
    modal.classList.remove('show-flex');
    modal.classList.remove('show-block');
  }

  document.getElementById('close-bank-modal').addEventListener('click', function() {
    closeBankTransferModal();
  });
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('bank-transfer-modal');
    if (event.target === modal) {
      closeBankTransferModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      const modal = document.getElementById('bank-transfer-modal');
      if (modal.classList.contains('show-flex') || modal.classList.contains('show-block')) {
        closeBankTransferModal();
      }
    }
  });

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
          checkoutNowButton.classList.add('checkout-button-enabled');
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
    const shippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    const shippingCost = getShippingCostForMethod(shippingMethod);

    // Check if we have pre-validated data for instant checkout
    if (validationResult && validationResult.valid && !validationResult.notDeployed) {
      console.log('🚀 Using pre-validated data for instant checkout!');
      
      // Check if validation is still fresh (under 5 minutes)
      const validationAge = Date.now() - validationResult.validatedAt;
      if (validationAge < 5 * 60 * 1000) {
        
        try {
          console.log('⚡ Creating checkout session with pre-validated data...');
          
          const response = await fetch('https://outbackgems.netlify.app/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              validatedCart: validationResult.cart,
              validationToken: validationResult.validationToken,
              shippingCost: shippingCost,
              shippingMethod: shippingMethod
            }),
          });
          
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.log('Failed to parse pre-validated response, falling back to normal flow');
            throw new Error('Invalid server response');
          }
          
          if (data.id) {
            console.log('🎉 Instant checkout successful!');
            const stripe = Stripe('pk_live_51RSrS62LkmYKgi6m273LNQSjpKI8SnxNtiQMGcHijiiL3eliZZzqKDR00BL8uNlwYFloGGO3kyNQJKctTvEK4eB000e8dIlEQd');
            stripe.redirectToCheckout({ sessionId: data.id });
            return;
          } else {
            console.log('Pre-validated checkout failed:', data.error, '- falling back to normal flow');
          }
          
        } catch (error) {
          console.log('Pre-validated checkout error:', error, '- falling back to normal flow');
        }
      } else {
        console.log('Pre-validation expired, falling back to normal flow');
      }
    } else {
      console.log('No valid pre-validation available, using normal flow');
    }

    // Fallback to traditional validation method
    console.log('📋 Processing checkout with traditional validation...');
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      weight: item.weight,
      unit: item.unit,
      quantity: item.quantity
    }));

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
    // Check if international shipping is selected
    const selectedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    if (selectedShippingMethod === 'international') {
      alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
      return;
    }
    
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
    // Check if international shipping is selected
    const selectedShippingMethod = localStorage.getItem('selectedShippingMethod') || 'standard';
    if (selectedShippingMethod === 'international') {
      alert('International shipping is temporarily suspended. Please select Standard or Express delivery to continue with checkout.');
      return;
    }
    
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
    
    document.getElementById('bank-transfer-modal').classList.add('show-flex');
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
