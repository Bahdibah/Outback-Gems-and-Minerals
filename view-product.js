// API URL
const apiUrl = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjckrSmV4Q396r2J5437VHynXSLyUYow6iqkCoXEY7HrOg2cr_voo08MQL6qcMM04pBDpWPA1kgKDaTRUEOJBZ48B-SMN75SrRx86Pow9494AvOa4RBDe-WLCDnlG85PhU5LDk8GvqfMbrbDHzmS9kAs0tPivdOdAxqxdhgCnvUxPy8IKXdl6i92dL9O3GKWDjsSqKlqqa9bKbFxAnZn8oVEil2fg5qGD_Izy_rtBqgkVDTQpttRxrY86FnFn8373jngn3hJLR3QkHgvIWAzf2wa9cjBsGiOi70hv-IAu87d_WCywlb4vX0d2RHsA&lib=MreWV8qvFAXZ2-rISPaQS69qZewlWwj59";

// Extract product ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("productid");

// DOM Elements
const productNameElement = document.getElementById("product-name");
const productImageElement = document.getElementById("product-image");
const productDescriptionElement = document.getElementById("product-description");
const quantityInputElement = document.getElementById("quantity");
const addToCartButton = document.getElementById("add-to-cart");

// Create new elements for weight, stock, price, and variation selector
const productWeightElement = document.createElement("p");
const productStockElement = document.createElement("p");
const productPriceElement = document.createElement("p"); // Element for price
const variationSelector = document.createElement("select"); // Dropdown for variations
variationSelector.id = "variation-selector";

// Fetch product details from the API
async function fetchProductDetails() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch product details. Status: ${response.status}`);
    }

    const products = await response.json();
    const variations = products.filter(item => item["product id"] === productId);

    if (variations.length === 0) {
      productNameElement.textContent = "Product not found";
      productDescriptionElement.textContent = "The product you are looking for does not exist.";
      return;
    }

    // Populate the variation selector
    variations.forEach((variation, index) => {
      const option = document.createElement("option");
      option.value = index; // Use the index to identify the variation
      option.textContent = `${variation.weight} ${variation.unit}`;
      variationSelector.appendChild(option);
    });

    // Append the variation selector to the product details container
    const productDetailsContainer = document.getElementById("view-product-details");
    productDetailsContainer.insertBefore(variationSelector, quantityInputElement);

    // Function to update product details based on the selected variation
    function updateProductDetails(selectedVariation) {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const cartItem = cart.find(item => item["product id"] === productId && item.weight === selectedVariation.weight);
      const cartQuantity = cartItem ? cartItem.quantity : 0;

      // Adjust stock based on cart
      const availableStock = selectedVariation.stock - cartQuantity;

      // Update product details
      productNameElement.textContent = selectedVariation["product name"];
      productImageElement.src = selectedVariation["image url"] || "images/placeholder.png";
      productImageElement.alt = selectedVariation["product name"];
      productDescriptionElement.textContent = selectedVariation.description;
      productWeightElement.textContent = `Weight: ${selectedVariation.weight} ${selectedVariation.unit}`;
      productStockElement.textContent = `Stock: ${availableStock}`;
      productPriceElement.textContent = `Price: $${selectedVariation["total price"].toFixed(2)}`;

      // Update the max attribute for the quantity input field
      quantityInputElement.setAttribute("max", availableStock);
      quantityInputElement.value = 1; // Reset quantity input

      // Update price dynamically based on quantity
      quantityInputElement.addEventListener("input", () => {
        const quantity = parseInt(quantityInputElement.value, 10) || 1; // Default to 1 if input is invalid
        const totalPrice = selectedVariation["total price"] * quantity;
        productPriceElement.textContent = `Price: $${totalPrice.toFixed(2)}`;
      });
    }

    // Initialize with the first variation
    updateProductDetails(variations[0]);

    // Add event listener to update details when a variation is selected
    variationSelector.addEventListener("change", (event) => {
      const selectedIndex = parseInt(event.target.value, 10);
      updateProductDetails(variations[selectedIndex]);
    });

    // Add to Cart functionality
    addToCartButton.addEventListener("click", () => {
      const selectedIndex = parseInt(variationSelector.value, 10);
      const selectedVariation = variations[selectedIndex];
      const quantity = parseInt(quantityInputElement.value, 10) || 1;

      // Validate stock
      if (quantity > selectedVariation.stock || quantity <= 0) {
        alert(`Only ${selectedVariation.stock} units are available.`);
        return;
      }

      // Load cart from localStorage
      const cart = JSON.parse(localStorage.getItem("cart")) || [];

      // Find existing item in the cart
      const existingItem = cart.find(
        item =>
          item.id === productId &&
          item.weight === selectedVariation.weight &&
          item.unit === selectedVariation.unit
      );

      if (existingItem) {
        // Update quantity if the item already exists
        existingItem.quantity += quantity;
      } else {
        // Add new item to the cart
        cart.push({
          id: productId,
          name: selectedVariation["product name"],
          price: selectedVariation["total price"],
          image: selectedVariation["image url"] || "images/placeholder.png", // Fallback image
          weight: selectedVariation.weight,
          unit: selectedVariation.unit,
          quantity: quantity
        });
      }

      // Save the updated cart to localStorage
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartCount();

      // Update the stock display
      const newStock = selectedVariation.stock - quantity;
      selectedVariation.stock = newStock; // Update the stock in the variations array
      productStockElement.textContent = `Stock: ${newStock}`;
      quantityInputElement.setAttribute("max", newStock);
      quantityInputElement.value = 1; // Reset quantity input

      alert(`${quantity} item(s) added to the cart.`);
    });

    // Append additional product details below the variation selector
    productDetailsContainer.insertBefore(productWeightElement, quantityInputElement);
    productDetailsContainer.insertBefore(productStockElement, quantityInputElement);
    productDetailsContainer.insertBefore(productPriceElement, quantityInputElement);
  } catch (error) {
    console.error("Error fetching product details:", error);
    productNameElement.textContent = "Error loading product";
    productDescriptionElement.textContent = "Please try again later.";
  }
}

// Function to update the cart count in the navbar
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  localStorage.setItem("cartCount", totalItems); // Store the cart count in localStorage
}

// Function to update the cart and dispatch a custom event
function updateCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  localStorage.setItem("cartCount", totalItems);

  // Dispatch a custom event to notify other parts of the app
  const cartUpdatedEvent = new CustomEvent("cartUpdated", { detail: { totalItems } });
  document.dispatchEvent(cartUpdatedEvent);
}

// Initialize the page
fetchProductDetails();