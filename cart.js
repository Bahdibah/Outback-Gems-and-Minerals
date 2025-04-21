document.addEventListener('DOMContentLoaded', () => {
  const cartTableBody = document.getElementById('cart-items');
  const subtotalElement = document.getElementById('subtotal'); // Subtotal element
  const shippingCostElement = document.getElementById('shipping-cost'); // Shipping cost element
  const totalPriceElement = document.getElementById('total-price');
  const shippingOptionsContainer = document.getElementById('shipping-options'); // Shipping options container
  const stockApiUrl = 'https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec'; // Replace with your Apps Script URL
  const loadingMessage = document.getElementById('loading-message'); // Reference to the loading message element

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

    // Determine shipping cost based on subtotal
    if (subtotal >= 100) {
      // Free shipping for orders over $100
      shippingCost = 0;
      shippingOptionsContainer.innerHTML = '<p>Free Shipping Applied</p>';
    } else {
      // Show shipping options for orders under $100
      shippingOptionsContainer.innerHTML = `
        <label for="shipping-method">Shipping Method:</label>
        <select id="shipping-method">
          <option value="standard">Standard Shipping ($10.95)</option>
          <option value="express">Express Shipping ($14.45)</option>
        </select>
      `;

      // Add event listener for shipping method selection
      const shippingMethodElement = document.getElementById('shipping-method');
      shippingMethodElement.addEventListener('change', () => {
        const selectedMethod = shippingMethodElement.value;
        shippingCost = selectedMethod === 'standard' ? 10.95 : 14.45;
        updateTotalPrice(subtotal, shippingCost);
      });

      // Default to standard shipping
      shippingCost = 10.95;
    }

    // Update the total price display
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
    const cartTableBody = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('subtotal');
    const shippingCostElement = document.getElementById('shipping-cost');
    const totalPriceElement = document.getElementById('total-price');
    const shippingOptionsContainer = document.getElementById('shipping-options');
    const loadingMessage = document.getElementById('loading-message');
    const stockApiUrl = 'https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec';

    cartTableBody.innerHTML = ''; // Clear existing rows

    if (cart.length === 0) {
      cartTableBody.innerHTML = '<tr><td colspan="7">Your cart is empty.</td></tr>';
      subtotalElement.textContent = 'Subtotal: $0.00';
      shippingCostElement.textContent = 'Shipping: $0.00';
      totalPriceElement.textContent = 'Total Price: $0.00';
      shippingOptionsContainer.innerHTML = ''; // Clear shipping options
      return;
    }

    let subtotal = 0;

    try {
      // Show the loading message
      loadingMessage.style.display = 'block';

      // Fetch all product data in a single request
      const response = await fetch(stockApiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }
      const productDataArray = await response.json();

      // Process each item in the cart
      for (const item of cart) {
        // Find the matching product data for the current cart item
        const productData = productDataArray.find(product => product['product id'] === item.id);
        if (!productData) {
          console.error(`Product with ID ${item.id} not found in API response.`);
          continue; // Skip this item if the product is not found
        }

        const baseTotalPrice = parseFloat(productData['total price']); // Use 'total price' from API
        const itemTotal = baseTotalPrice * item.quantity; // Multiply by quantity
        subtotal += itemTotal;

        const imageUrl = productData['image url'] || 'images/placeholder.png'; // Fallback for missing image URL
        const weight = productData.weight || 'N/A';
        const unit = productData.unit || '';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><img src="${imageUrl}" alt="${productData['product name']}" style="width: 50px; height: 50px; object-fit: cover;" /></td>
          <td>${item.name}</td>
          <td>${weight} ${unit}</td>
          <td>
            <button class="decrease-quantity" data-index="${cart.indexOf(item)}">-</button>
            <input type="number" value="${item.quantity}" min="1" data-index="${cart.indexOf(item)}" class="quantity-input" />
            <button class="increase-quantity" data-index="${cart.indexOf(item)}">+</button>
          </td>
          <td>$${baseTotalPrice.toFixed(2)}</td>
          <td>$${itemTotal.toFixed(2)}</td>
          <td>
            <button data-index="${cart.indexOf(item)}" class="remove-button">Remove</button>
          </td>
        `;
        cartTableBody.appendChild(row);
      }

      subtotalElement.textContent = `Subtotal: $${subtotal.toFixed(2)}`;
      updateShippingAndTotal(subtotal);
    } catch (error) {
      console.error('Error loading cart:', error);
      cartTableBody.innerHTML = '<tr><td colspan="7">Failed to load cart items. Please try again later.</td></tr>';
    } finally {
      // Hide the loading message
      loadingMessage.style.display = 'none';
    }
  }

  // Verify cart items against stock availability
  async function verifyCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    try {
      // Show the loading message
      loadingMessage.style.display = 'block';

      // Fetch all product data in a single request
      const response = await fetch(`${stockApiUrl}`);
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
      loadCart();
    } catch (error) {
      console.error('Error verifying cart:', error);
    } finally {
      // Hide the loading message
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

      item.quantity -= 1;
      localStorage.setItem('cart', JSON.stringify(cart));

      const inputElement = cartTableBody.querySelector(`input[data-index="${index}"]`);
      if (inputElement) {
        inputElement.value = item.quantity;
      }

      debouncedVerifyCart();
    }

    if (target.classList.contains('increase-quantity')) {
      const index = target.getAttribute('data-index');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const item = cart[index];
      if (!item) return;

      item.quantity += 1;
      localStorage.setItem('cart', JSON.stringify(cart));

      const inputElement = cartTableBody.querySelector(`input[data-index="${index}"]`);
      if (inputElement) {
        inputElement.value = item.quantity;
      }

      debouncedVerifyCart();
    }

    if (target.classList.contains('remove-button')) {
      const index = target.getAttribute('data-index');
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      cart.splice(index, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      debouncedVerifyCart();
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
        debouncedVerifyCart();
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