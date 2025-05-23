// API URL
const apiUrl = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjckrSmV4Q396r2J5437VHynXSLyUYow6iqkCoXEY7HrOg2cr_voo08MQL6qcMM04pBDpWPA1kgKDaTRUEOJBZ48B-SMN75SrRx86Pow9494AvOa4RBDe-WLCDnlG85PhU5LDk8GvqfMbrbDHzmS9kAs0tPivdOdAxqxdhgCnvUxPy8IKXdl6i92dL9O3GKWDjsSqKlqqa9bKbFxAnZn8oVEil2fg5qGD_Izy_rtBqgkVDTQpttRxrY86FnFn8373jngn3hJLR3QkHgvIWAzf2wa9cjBsGiOi70hv-IAu87d_WCywlb4vX0d2RHsA&lib=MreWV8qvFAXZ2-rISPaQS69qZewlWwj59";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("productid");

// DOM Elements
const productNameElement = document.getElementById("view-product-name");
const productImageElement = document.getElementById("view-product-image");
const productDescriptionElement = document.getElementById("view-product-description");
const quantityInputElement = document.getElementById("view-product-quantity");
const addToCartButton = document.getElementById("view-product-add-to-cart");
const variationSelector = document.getElementById("view-product-variation-selector");
const productStockElement = document.getElementById("view-product-stock");
const productPriceElement = document.getElementById("view-product-price");

let variations = [];
let currentVariation = null;

fetch("side-menu.html")
  .then(response => response.text())
  .then(html => {
    document.getElementById("side-menu-container").innerHTML = html;
    if (typeof fetchAndLoadMenu === "function") {
      fetchAndLoadMenu();
    }
    // ...rest of your product logic...
  });

// Fetch product details from the API
async function fetchProductDetails() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch product details. Status: ${response.status}`);
    }

    const products = await response.json();

    // Filter variations based on product id from the URL
    const filteredByProductId = products.filter(item => item["product id"].trim() === productId.trim());

    if (filteredByProductId.length === 0) {
      productNameElement.textContent = "Product not found";
      productDescriptionElement.textContent = "The product you are looking for does not exist.";
      return;
    }

    // Further filter variations to include only unique weights
    const uniqueWeights = new Set();
    variations = filteredByProductId.filter(item => {
      if (uniqueWeights.has(item.weight)) {
        return false; // Skip duplicate weights
      }
      uniqueWeights.add(item.weight);
      return true;
    });

    if (variations.length === 0) {
      productNameElement.textContent = "No variations available";
      productDescriptionElement.textContent = "No variations found for this product.";
      return;
    }

    // Populate the dropdown with variations
    variationSelector.innerHTML = "";
    variations.forEach((variation, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${variation.weight} ${variation.unit} - $${variation["total price"].toFixed(2)}`;
      variationSelector.appendChild(option);
    });

    // Update product details for the first variation by default
    currentVariation = variations[0];
    updateProductDetails(currentVariation);

    // Add event listener for dropdown changes (only once)
    variationSelector.addEventListener("change", (event) => {
      const selectedIndex = parseInt(event.target.value, 10);
      currentVariation = variations[selectedIndex];
      updateProductDetails(currentVariation);
    });

    // Add to cart functionality (only once)
    addToCartButton.addEventListener("click", () => {
      const selectedIndex = parseInt(variationSelector.value, 10);
      const selectedVariation = variations[selectedIndex];
      const quantity = parseInt(quantityInputElement.value, 10) || 1;

      // Get the displayed stock from the productStockElement
      const displayedStock = parseInt(productStockElement.textContent.replace("Stock: ", ""), 10);

      // Validate the quantity against the displayed stock
      if (quantity > displayedStock || quantity <= 0) {
        alert(`Only ${displayedStock} units are available.`);
        return;
      }

      // Add the item to the cart
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existingItem = cart.find(
        item =>
          item.id === productId &&
          item.weight === selectedVariation.weight &&
          item.unit === selectedVariation.unit
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: productId,
          name: selectedVariation["product name"],
          price: selectedVariation["total price"],
          image: selectedVariation["image url"] || "images/placeholder.png",
          weight: selectedVariation.weight,
          unit: selectedVariation.unit,
          quantity: quantity
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      // Dispatch the custom "cartUpdated" event
      const totalItems = cart.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
      document.dispatchEvent(new CustomEvent("cartUpdated", { detail: { totalItems } }));

      // Force the stock display to recalculate and update
      updateProductDetails(selectedVariation);

      alert(`${quantity} item(s) added to the cart.`);
    });

    // Set up quantity input event listener (only once)
    quantityInputElement.addEventListener("input", () => {
      if (!currentVariation) return;
      let quantity = parseInt(quantityInputElement.value, 10) || 1;
      const displayedStock = parseInt(productStockElement.textContent.replace("Stock: ", ""), 10);

      if (quantity > displayedStock) {
        quantity = displayedStock;
        quantityInputElement.value = displayedStock; // Reset to max stock
      }

      const totalPrice = currentVariation["total price"] * quantity;
      productPriceElement.textContent = `Price: $${totalPrice.toFixed(2)}`;
    });

  } catch (error) {
    console.error("Error fetching product details:", error);
    productNameElement.textContent = "Error loading product";
    productDescriptionElement.textContent = "Please try again later.";
  }

  //Continue shopping button to escape to category level//

  const category = variations[0]?.category;
  const continueLink = document.getElementById("view-product-continue-shopping-link");
  const continueBtn = document.getElementById("view-product-continue-shopping-button");
  
  function formatCategoryHeader(keyword) {
    if (!keyword) return "All Products";
    return keyword
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  if (category && continueLink && continueBtn) {
    continueLink.href = `products.html?category=${encodeURIComponent(category)}`;
    continueBtn.textContent = `Back to ${formatCategoryHeader(category)}`;
  }

function updateProductDetails(selectedVariation) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Find the matching item in the cart for the selected variation
  const cartItem = cart.find(
    item =>
      item.id === productId &&
      item.weight === selectedVariation.weight &&
      item.unit === selectedVariation.unit
  );

  // Use the stock from the selected variation
  const baseStock = selectedVariation.stock;

  // Subtract the quantity of the specific variant in the cart
  const cartQuantity = cartItem ? cartItem.quantity : 0;
  const availableStock = baseStock - cartQuantity;

  // Update product details on the page
  productNameElement.textContent = selectedVariation["product name"];
  productImageElement.src = selectedVariation["image url"] || "images/placeholder.png";
  productDescriptionElement.textContent = selectedVariation.description;
  productStockElement.textContent = `Stock: ${availableStock}`;
  productPriceElement.textContent = `Price: $${selectedVariation["total price"].toFixed(2)}`;

  // Update the quantity input to respect the displayed stock
  quantityInputElement.setAttribute("max", availableStock);
  quantityInputElement.value = 1;
};
}


// Initialize the page
fetchProductDetails();

