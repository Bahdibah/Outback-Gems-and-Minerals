document.addEventListener('DOMContentLoaded', () => {
  const cartTableBody = document.getElementById('cart-items');
  const totalPriceElement = document.getElementById('total-price');

  // Load cart items from localStorage
  function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cartTableBody.innerHTML = ''; // Clear existing rows

    if (cart.length === 0) {
      cartTableBody.innerHTML = '<tr><td colspan="5">Your cart is empty.</td></tr>';
      totalPriceElement.textContent = 'Total Price: $0.00';
      return;
    }

    let totalPrice = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.name}</td>
        <td>
          <input type="number" value="${item.quantity}" min="1" data-index="${index}" class="quantity-input" />
        </td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${itemTotal.toFixed(2)}</td>
        <td>
          <button data-index="${index}" class="remove-button">Remove</button>
        </td>
      `;
      cartTableBody.appendChild(row);
    });

    totalPriceElement.textContent = `Total Price: $${totalPrice.toFixed(2)}`;
  }

  // Update item quantity
  function updateQuantity(index, newQuantity) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
      cart[index].quantity = newQuantity;
      localStorage.setItem('cart', JSON.stringify(cart));
      loadCart(); // Reload the cart to reflect changes
    }
  }

  // Remove item from cart
  function removeItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1); // Remove item at the specified index
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart(); // Reload the cart to reflect changes
  }

  // Event delegation for quantity change and remove button
  cartTableBody.addEventListener('input', (event) => {
    if (event.target.classList.contains('quantity-input')) {
      const index = event.target.getAttribute('data-index');
      const newQuantity = parseInt(event.target.value, 10);
      if (newQuantity > 0) {
        updateQuantity(index, newQuantity);
      } else {
        alert('Quantity must be at least 1.');
        loadCart(); // Reload to reset invalid input
      }
    }
  });

  cartTableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-button')) {
      const index = event.target.getAttribute('data-index');
      removeItem(index);
    }
  });

  // Initial load
  loadCart();
});