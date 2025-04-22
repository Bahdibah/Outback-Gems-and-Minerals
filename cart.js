document.addEventListener('DOMContentLoaded', () => {
  const cartTableBody = document.getElementById('cart-items');
  const subtotalElement = document.getElementById('subtotal');
  const shippingCostElement = document.getElementById('shipping-cost');
  const totalPriceElement = document.getElementById('total-price');
  const shippingOptionsContainer = document.getElementById('shipping-options');
  const loadingMessage = document.getElementById('loading-message');
  const checkoutButton = document.getElementById('checkout-button');
  const stockApiUrl = 'https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec';

  // Debounce utility function
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Calculate and update shipping costs
  function updateShippingAndTotal(subtotal) {
    let shippingCost = 0;

    if (subtotal >= 100) {
      shippingCost = 0;
      shippingOptionsContainer.innerHTML = '<p>Free Shipping Applied</p>';
    } else {
      shippingOptionsContainer.innerHTML = `
        <label for="shipping-method">Shipping Method:</label>
        <select id="shipping-method">
          <option value="standard">Standard Shipping ($10.95)</option>
          <option value="express">Express Shipping ($14.45)</option>
        </select>
      `;

      const shippingMethodElement = document.getElementById('shipping-method');
      shippingMethodElement.addEventListener('change', () => {
        const selectedMethod = shippingMethodElement.value;
        shippingCost = selectedMethod === 'standard' ? 10.95 : 14.45;
        updateTotalPrice(subtotal, shippingCost);
      });

      shippingCost = 10.95; // Default to standard shipping
    }

    updateTotalPrice(subtotal, shippingCost);
  }

  // Update the total price display
  function updateTotalPrice(subtotal, shippingCost) {
    shippingCostElement.textContent = `Shipping: $${shippingCost.toFixed(2)}`;
    const total = subtotal + shippingCost;
    totalPriceElement.textContent = `Total Price: $${total.toFixed(2)}`;
  }

  // Load cart items from localStorage and render them
  async function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartTableBody.innerHTML = ''; // Clear existing rows

    if (cart.length === 0) {
      cartTableBody.innerHTML = '<tr><td colspan="7">Your cart is empty.</td></tr>';
      subtotalElement.textContent = 'Subtotal: $0.00';
      shippingCostElement.textContent = 'Shipping: $0.00';
      totalPriceElement.textContent = 'Total Price: $0.00';
      shippingOptionsContainer.innerHTML = '';
      checkoutButton.disabled = true;
      return;
    }

    let subtotal = 0;

    for (const item of cart) {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;" /></td>
        <td>${item.name}</td>
        <td>${item.weight} ${item.unit}</td>
        <td>
          <button class="decrease-quantity" data-index="${cart.indexOf(item)}">-</button>
          <input type="number" value="${item.quantity}" min="1" data-index="${cart.indexOf(item)}" class="quantity-input" />
          <button class="increase-quantity" data-index="${cart.indexOf(item)}">+</button>
        </td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${itemTotal.toFixed(2)}</td>
        <td>
          <button data-index="${cart.indexOf(item)}" class="remove-button">Remove</button>
        </td>
      `;
      cartTableBody.appendChild(row);
    }

    subtotalElement.textContent = `Subtotal: $${subtotal.toFixed(2)}`;
    updateShippingAndTotal(subtotal);
    checkoutButton.disabled = false;
  }

  // Verify cart items against stock availability
  async function verifyCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    try {
      loadingMessage.style.display = 'block';

      const response = await fetch(stockApiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }
      const productDataArray = await response.json();

      for (const item of cart) {
        const productData = productDataArray.find(product => product['product id'] === item.id);
        if (!productData) {
          console.error(`Product with ID ${item.id} not found in API response.`);
          continue;
        }

        if (item.quantity > productData.stock) {
          alert(`Only ${productData.stock} units of "${item.name}" are available in stock.`);
          item.quantity = productData.stock;
        }
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      loadCart();

      // Dispatch the cartUpdated event
      const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
      document.dispatchEvent(cartUpdatedEvent);
    } catch (error) {
      console.error('Error verifying cart:', error);
    } finally {
      loadingMessage.style.display = 'none';
    }
  }

  const debouncedVerifyCart = debounce(verifyCart, 1000);

  cartTableBody.addEventListener('click', (event) => {
    const target = event.target;

    if (target.classList.contains('decrease-quantity')) {
      const index = target.getAttribute('data-index');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const item = cart[index];
      if (!item || item.quantity <= 1) return;

      // Update quantity immediately in the UI
      item.quantity -= 1;
      const quantityInput = target.closest('tr').querySelector('.quantity-input');
      if (quantityInput) {
        quantityInput.value = item.quantity;
      }

      // Save to localStorage and dispatch the cartUpdated event
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      debouncedVerifyCart();

      // Dispatch the cartUpdated event
      const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
      document.dispatchEvent(cartUpdatedEvent);
    }

    if (target.classList.contains('increase-quantity')) {
      const index = target.getAttribute('data-index');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const item = cart[index];
      if (!item) return;

      // Update quantity immediately in the UI
      item.quantity += 1;
      const quantityInput = target.closest('tr').querySelector('.quantity-input');
      if (quantityInput) {
        quantityInput.value = item.quantity;
      }

      // Save to localStorage and dispatch the cartUpdated event
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      debouncedVerifyCart();

      // Dispatch the cartUpdated event
      const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
      document.dispatchEvent(cartUpdatedEvent);
    }

    if (target.classList.contains('remove-button')) {
      const index = target.getAttribute('data-index');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      cart.splice(index, 1); // Remove the item from the cart
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      debouncedVerifyCart();

      // Dispatch the cartUpdated event
      const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
      document.dispatchEvent(cartUpdatedEvent);
    }
  });

  cartTableBody.addEventListener('input', (event) => {
    if (event.target.classList.contains('quantity-input')) {
      const index = event.target.getAttribute('data-index');
      const newQuantity = parseInt(event.target.value, 10);
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const item = cart[index];

      if (newQuantity > 0) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        debouncedVerifyCart();

        // Dispatch the cartUpdated event
        const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
        document.dispatchEvent(cartUpdatedEvent);
      } else {
        alert('Quantity must be at least 1.');
        loadCart();
      }
    }
  });

  loadCart();
});

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('productid'); // Get the product ID from the URL

  const productDetailsContainer = document.getElementById('view-product-details');
  let currentProduct = null;

  if (productId) {
    // Show loading indicator
    productDetailsContainer.innerHTML = '<p>Loading product details...</p>';

    // Fetch product details from the API
    fetch('https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch product details.');
        }
        return response.json();
      })
      .then(data => {
        // Find the product by ID
        currentProduct = data.find(item => item['product id'] === productId);

        if (currentProduct) {
          // Render product details
          const imageUrl = currentProduct['image url'] || 'images/placeholder.png'; // Fallback for missing image URL
          const weight = currentProduct.weight || 'N/A';
          const unit = currentProduct.unit || '';
          const pricePerUnit = currentProduct['price per unit'] || 'N/A';
          const stock = currentProduct.stock || 0;

          productDetailsContainer.innerHTML = `
            <h1 id="product-name">${currentProduct['product name']}</h1>
            <img id="product-image" src="${imageUrl}" alt="${currentProduct['product name']}" style="width: 200px; height: 200px; object-fit: cover;" />
            <p id="product-description">${currentProduct.description}</p>
            <p id="product-price">Price: $${pricePerUnit} per ${unit}</p>
            <p id="product-weight">Weight: ${weight} ${unit}</p>
            <p id="product-stock">Stock: ${stock} available</p>
            <label for="quantity">Quantity:</label>
            <input type="number" id="quantity" name="quantity" min="1" value="1" />
            <button id="add-to-cart">Add to Cart</button>
          `;

          // Add event listener for "Add to Cart" button
          document.getElementById('add-to-cart').addEventListener('click', () => {
            const quantity = parseInt(document.getElementById('quantity').value, 10);
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItem = cart.find(item => item.id === currentProduct['product id']);
            const quantityInCart = existingItem ? existingItem.quantity : 0;
            const remainingStock = stock - quantityInCart;

            if (quantity > remainingStock) {
              alert(`Only ${remainingStock} units are available in stock.`);
              return;
            }

            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              cart.push({
                id: currentProduct['product id'],
                name: currentProduct['product name'],
                price: parseFloat(currentProduct['price per unit']),
                image: currentProduct['image url'] || 'images/placeholder.png',
                quantity: quantity
              });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();

            // Dispatch the cartUpdated event
            const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
            document.dispatchEvent(cartUpdatedEvent);

            alert(`${quantity} x ${currentProduct['product name']} has been added to your cart!`);
          });
        } else {
          // Product not found
          productDetailsContainer.innerHTML = `
            <p style="color: red;">Product not found. Please check the URL or try again later.</p>
            <img src="images/placeholder.png" alt="Placeholder Image" style="width: 100%; max-width: 300px; margin-top: 20px;" />
          `;
        }
      })
      .catch(error => {
        console.error('Error fetching product details:', error);
        productDetailsContainer.innerHTML = `
          <p style="color: red;">Failed to load product details. Please try again later.</p>
          <img src="images/placeholder.png" alt="Placeholder Image" style="width: 100%; max-width: 300px; margin-top: 20px;" />
        `;
      });
  } else {
    // No product ID in URL
    productDetailsContainer.innerHTML = `
      <p style="color: red;">No product selected. Please go back and choose a product.</p>
      <img src="images/placeholder.png" alt="Placeholder Image" style="width: 100%; max-width: 300px; margin-top: 20px;" />
    `;
  }
});

document.getElementById('continue-shopping-button').addEventListener('click', () => {
  window.location.href = 'products.html'; // Replace with your product listing page URL
});

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  localStorage.setItem("cartCount", totalItems); // Store the cart count in localStorage

  // Update the cart count in the navbar
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = totalItems;
  }

  // Dispatch a custom event to notify other parts of the app
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems } });
  document.dispatchEvent(cartUpdatedEvent);
  console.log("cartUpdated event dispatched:", cartUpdatedEvent.detail); // Debugging log
}

function updateCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + (item.cancount || 1), 0);
  localStorage.setItem("cart", JSON.stringify(cart)); // Save the updated cart to localStorage

  // Dispatch the custom "cartUpdated" event
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems } });
  document.dispatchEvent(cartUpdatedEvent);
  console.log("cartUpdated event dispatched:", cartUpdatedEvent.detail); // Debugging log
}

function updateCartDropdown() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  console.log("Cart data:", cart); // Debugging log
  console.log("Total items:", totalItems); // Debugging log
  console.log("Subtotal:", subtotal); // Debugging log

  // Update cart count in the navbar
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = totalItems;
    console.log("Cart count updated in the DOM."); // Debugging log
  }

  // Update cart dropdown details
  const cartMessage = document.getElementById("cart-message");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartTotal = document.getElementById("cart-total");

  if (cartMessage) {
    cartMessage.textContent = `You currently have ${totalItems} items in your cart`;
    console.log("Cart message updated in the DOM."); // Debugging log
  }
  if (cartSubtotal) {
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    console.log("Cart subtotal updated in the DOM."); // Debugging log
  }
  if (cartTotal) {
    cartTotal.textContent = `$${subtotal.toFixed(2)}`;
    console.log("Cart total updated in the DOM."); // Debugging log
  }

  // Update cart items list
  const cartItemsList = document.getElementById("cart-items-list");
  if (cartItemsList) {
    cartItemsList.innerHTML = ""; // Clear existing items

    cart.forEach(item => {
      console.log("Adding item to dropdown:", item); // Debugging log
      const cartItem = document.createElement("div");
      cartItem.classList.add("cart-item");

      cartItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
        <div class="cart-item-details">
          <span class="product-name">${item.name}</span>
          <span class="product-code">Code: ${item.id}</span>
          <span class="product-quantity">Qty: ${item.quantity}</span>
        </div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
      `;

      cartItemsList.appendChild(cartItem);
    });
  }
}

function addToCart(item) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Check if the item already exists in the cart
  const existingItem = cart.find(cartItem => cartItem.id === item.id);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1; // Increment quantity
  } else {
    item.quantity = 1; // Set initial quantity
    cart.push(item);
  }

  // Save the updated cart to localStorage
  localStorage.setItem("cart", JSON.stringify(cart));

  // Dispatch the cartUpdated event
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
  document.dispatchEvent(cartUpdatedEvent);

  console.log("Item added to cart:", item);
  console.log("Updated cart:", cart);
}

function updateItemQuantity(itemId, newQuantity) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Find the item and update its quantity
  const item = cart.find(cartItem => cartItem.id === itemId);
  if (item) {
    item.quantity = newQuantity;
  }

  // Save the updated cart to localStorage
  localStorage.setItem("cart", JSON.stringify(cart));

  // Dispatch the cartUpdated event
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
  document.dispatchEvent(cartUpdatedEvent);

  console.log("Item quantity updated:", item);
  console.log("Updated cart:", cart);
}

function removeFromCart(itemId) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Remove the item from the cart
  cart = cart.filter(item => item.id !== itemId);

  // Save the updated cart to localStorage
  localStorage.setItem("cart", JSON.stringify(cart));

  // Dispatch the cartUpdated event
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems: cart.reduce((sum, item) => sum + item.quantity, 0) } });
  document.dispatchEvent(cartUpdatedEvent);

  console.log("Item removed from cart:", itemId);
  console.log("Updated cart:", cart);
}

document.addEventListener("cartUpdated", (event) => {
  console.log("cartUpdated event received:", event.detail);

  // Update the cart dropdown
  updateCartDropdown();
});