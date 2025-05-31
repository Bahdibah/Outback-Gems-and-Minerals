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

// Fetch product details from the cache
async function fetchProductDetails() {
  try {
    const products = await getProductData();

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
      const quantity = parseInt(quantityInputElement.value, 10) || 0;

      // Get the displayed stock from the productStockElement
      const stockText = productStockElement.textContent;
      const displayedStock = stockText.startsWith("Stock: ")
        ? parseInt(stockText.replace("Stock: ", ""), 10)
        : 0;

      // Check for out of stock
      if (displayedStock <= 0) {
        alert("This item is currently out of stock.");
        return;
      }

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

    // After you set variations and before using category:
    const category = variations[0]?.category;

    // Dispatch event for navbar highlighting
    if (category) {
      document.dispatchEvent(new CustomEvent("productCategoryLoaded", { detail: { category } }));
    }

    // Load technical information based on the product category
    if (category) {
      const categories = category.split(",").map(c => c.trim());
      fetch("products.json")
        .then(res => res.json())
        .then(products => {
          const techInfos = categories.map(cat => {
            // Find the first product with this category (single, not comma-separated)
            const product = products.find(p => {
              // Handle both single and multi-category products in products.json
              const prodCats = (p.category || "").split(",").map(x => x.trim());
              return prodCats.includes(cat);
            });
            const title = product?.["product name"]
  ? `<h3 style="color:#cc5500; margin-top:1.5em;">${product["product name"]}</h3>`
  : "";
const info = product?.["product-description"] || "<p>No technical info available.</p>";
return title + info;
          });
          const techDiv = document.getElementById("view-product-technical-info");
          if (techDiv) techDiv.innerHTML = techInfos.join("<hr>");
        })
        .catch(err => {
          const techDiv = document.getElementById("view-product-technical-info");
          if (techDiv) techDiv.innerHTML = "<p>Error loading technical info.</p>";
          console.error("Error loading technical info:", err);
        });
    }

    //Continue shopping button to escape to category level//
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
      continueBtn.textContent = `View all ${formatCategoryHeader(category)}`;
    }

  } catch (error) {
    console.error("Error fetching product details:", error);
    productNameElement.textContent = "Error loading product";
    productDescriptionElement.textContent = "Please try again later.";
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

    productNameElement.textContent = selectedVariation["product name"];
    productImageElement.src = selectedVariation["image url"] || "images/placeholder.png";
    productDescriptionElement.textContent = selectedVariation.description;
        if (availableStock > 0) {
          productStockElement.textContent = `Stock: ${availableStock}`;
          quantityInputElement.disabled = false;
          quantityInputElement.value = 1;
        } else {
          productStockElement.textContent = 'Out of Stock';
          quantityInputElement.disabled = true;
          quantityInputElement.value = 0;
        }
    addToCartButton.disabled = false; // Always enabled
    productPriceElement.textContent = `Price: $${selectedVariation["total price"].toFixed(2)}`;

    quantityInputElement.setAttribute("max", availableStock);
    quantityInputElement.value = 1;

    // Main image from API
    const apiImage = selectedVariation["image url"] || "images/placeholder.png";
    const mainImage = document.getElementById("view-product-image");
    const thumbnailsContainer = document.getElementById("view-product-thumbnails");
    const modalOverlay = document.getElementById("image-modal-overlay");
    const modalImg = document.getElementById("image-modal-img");

   if (mainImage && modalOverlay && modalImg) {
  mainImage.addEventListener("click", function() {
    modalImg.src = mainImage.src;
    modalOverlay.classList.add("active");
  });

  modalOverlay.addEventListener("click", function(e) {
    modalOverlay.classList.remove("active");
    modalImg.src = "";
  });

  // Add ESC key functionality to close the modal
  document.addEventListener("keydown", function(e) {
    if (modalOverlay.classList.contains("active") && (e.key === "Escape" || e.key === "Esc")) {
      modalOverlay.classList.remove("active");
      modalImg.src = "";
    }
  });
} 

    // Fetch extra images from productid.json
    fetch("productid.json")
      .then(res => res.json())
      .then(productImagesList => {
        // Find the entry for this product id
        const productImages = productImagesList.find(p => p.productid === productId);
        // Use the 3 images from JSON, or fallback to placeholders
        const extraImages = productImages?.images || [
          `images/products/${productId}/image1.jpg`,
          `images/products/${productId}/image2.jpg`,
          `images/products/${productId}/image3.jpg`
        ];

        // Build the thumbnails: API image first, then the 3 from JSON
        const allThumbs = [apiImage, ...extraImages];

        // Set the main image to the API image by default
        if (mainImage) mainImage.src = apiImage;

        // Render thumbnails
        thumbnailsContainer.innerHTML = "";
        allThumbs.forEach((imgUrl, idx) => {
          const thumb = document.createElement("img");
          thumb.src = imgUrl;
          thumb.alt = `Thumbnail ${idx + 1}`;
          thumb.className = "view-product-image-placeholder";
          thumb.style.cursor = "pointer";
          // Highlight the selected thumbnail
          if (idx === 0) thumb.style.border = "2px solid #cc5500";
          thumb.addEventListener("click", function() {
            if (mainImage) mainImage.src = imgUrl;
            // Optional: highlight the selected thumbnail
            thumbnailsContainer.querySelectorAll("img").forEach(img => img.style.border = "1px solid #444");
            this.style.border = "2px solid #cc5500";
          });
          thumbnailsContainer.appendChild(thumb);
        });
      });

    quantityInputElement.setAttribute("max", availableStock);
    quantityInputElement.value = 1;
};}

fetchProductDetails();

