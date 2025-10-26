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
const productUnitInfoElement = document.getElementById("view-product-unit-info");
const productUnitPriceElement = document.getElementById("view-product-unit-price");

let variations = [];
let currentVariation = null;

// Function to update quantity button states (global scope)
function updateQuantityButtons() {
  const currentQty = parseInt(quantityInputElement.value, 10) || 1;
  
  // Extract stock number from HTML content
  const stockElement = productStockElement;
  let displayedStock = 0;
  
  if (stockElement) {
    const stockText = stockElement.textContent || stockElement.innerText;
    if (stockText.includes('Out of Stock')) {
      displayedStock = 0;
    } else {
      // Extract number from the stock display
      const stockMatch = stockText.match(/\d+/);
      displayedStock = stockMatch ? parseInt(stockMatch[0], 10) : 0;
    }
  }
  
  const quantityDecrease = document.getElementById("quantity-decrease");
  const quantityIncrease = document.getElementById("quantity-increase");
  
  if (quantityDecrease) {
    quantityDecrease.disabled = currentQty <= 1;
  }
  if (quantityIncrease) {
    quantityIncrease.disabled = currentQty >= displayedStock || displayedStock <= 0;
  }
}

// Function to show banner notifications
function showBannerNotification(message, type = 'success') {
    // Remove any existing banners first
    const existingBanners = document.querySelectorAll('.notification-banner');
    existingBanners.forEach(banner => banner.remove());
    
    // Create notification banner
    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    const isSuccess = type === 'success';
    
    // Use fixed positioning but calculate navbar height and align with content area
    const navbar = document.querySelector('nav') || document.querySelector('.navbar') || document.querySelector('header');
    const navbarHeight = navbar ? navbar.offsetHeight + 10 : 70; // Add 10px padding, fallback to 70px
    
    // Find the main content container to align with
    const mainContent = document.querySelector('.view-product-container') || 
                       document.querySelector('main') || 
                       document.querySelector('.container') ||
                       document.body;
    
    // Get the content area's position and width for alignment
    const contentRect = mainContent.getBoundingClientRect();
    const contentLeft = contentRect.left + (contentRect.width / 2); // Center of content area
    
    banner.style.cssText = `
      position: fixed !important;
      top: ${navbarHeight}px !important;
      left: ${contentLeft}px !important;
      transform: translateX(-50%) !important;
      background-color: ${isSuccess ? '#4CAF50' : '#f44336'} !important;
      color: white !important;
      padding: 20px 40px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      z-index: 999999 !important;
      font-size: 16px !important;
      font-weight: bold !important;
      text-align: center !important;
      min-width: 300px !important;
      max-width: 600px !important;
      opacity: 1 !important;
      display: block !important;
    `;
    
    banner.textContent = message;
    
    // Add to body for fixed positioning
    document.body.appendChild(banner);
    
    // Auto fade out after 4 seconds
    setTimeout(() => {
      if (document.body.contains(banner)) {
        banner.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(banner)) {
            document.body.removeChild(banner);
          }
        }, 300);
      }
    }, 4000);
  }

// Function to generate SEO-optimized dynamic alt tags
function generateDynamicAltTag(product, isMainImage = true) {
  if (!product) return "Gemstone specimen";
  
  const name = product["product name"] || "Gemstone";
  const weight = product.weight || product["weight (ct)"] || "";
  const category = product.category || "";
  
  // Create descriptive alt text
  let altText = name;
  
  // Add weight if available
  if (weight) {
    if (weight.toString().includes('ct')) {
      altText += ` - ${weight}`;
    } else {
      altText += ` - ${weight}g`;
    }
  }
  
  // Add category context for better SEO
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('natural')) {
      altText += " natural gemstone specimen";
    } else if (categoryLower.includes('synthetic')) {
      altText += " synthetic gemstone specimen";  
    } else {
      altText += ` ${categoryLower} gemstone specimen`;
    }
  } else {
    altText += " gemstone specimen";
  }
  
  // Add context for main vs thumbnail
  if (!isMainImage) {
    altText += " thumbnail";
  }
  
  return altText;
}

  // Add this function just before your fetchProductDetails function
function highlightNavigation(category) {
  if (!category) return;
  
  // Use the main category directly (no more splitting)
  const mainCategory = category.toLowerCase();
  const categoryToPage = {
    synthetic: "synthetic.html",
    natural: "natural.html",
    other: "other.html"
  };
  
  // Wait until navbar links are available
  const checkNavLinks = setInterval(() => {
    const navLinks = document.querySelectorAll("nav ul li a");
    if (navLinks.length > 0) {
      clearInterval(checkNavLinks);
      
      // Clear any existing active classes
      navLinks.forEach(link => link.classList.remove("active"));
      
      // Set the appropriate link as active
      if (mainCategory && categoryToPage[mainCategory]) {
        navLinks.forEach(link => {
          const href = link.getAttribute("href").replace(/^\//, '').toLowerCase();
          if (href === categoryToPage[mainCategory]) {
            link.classList.add("active");
          }
        });
      }
    }
  }, 100); // Check every 100ms
}

// Function to load and display disclaimer based on product category/subcategory
async function loadDisclaimer(product) {
  try {
    const response = await fetch('disclaimers.json');
    const disclaimers = await response.json();
    
    const disclaimerContainer = document.getElementById('disclaimer-text');
    if (!disclaimerContainer) return;
    
    // Find matching disclaimer based on category or subcategory
    let matchedDisclaimer = null;
    
    // Special handling for single tumbles
    if (product.category === 'Tumbles' && product['product name'] && 
        product['product name'].toLowerCase().includes('single')) {
      matchedDisclaimer = disclaimers.find(d => d['applies-to'].includes('Single Tumbles'));
    }
    
    // If not a single tumble, use normal matching logic
    if (!matchedDisclaimer) {
      for (const disclaimer of disclaimers) {
        const appliesToArray = disclaimer['applies-to'];
        
        // Check if product category or subcategory matches
        if (appliesToArray.includes(product.category) || 
            appliesToArray.includes(product['sub category'])) {
          matchedDisclaimer = disclaimer;
          break;
        }
      }
    }
    
    // If no specific match found, use general disclaimer
    if (!matchedDisclaimer) {
      matchedDisclaimer = disclaimers.find(d => d.category === 'general products');
    }
    
    // Display the disclaimer
    if (matchedDisclaimer) {
      disclaimerContainer.innerHTML = `
        <h3>Disclaimer</h3>
        <p>${matchedDisclaimer['disclaimer-text']}</p>
      `;
    }
    
  } catch (error) {
    console.error('Error loading disclaimer:', error);
    // Fallback disclaimer
    const disclaimerContainer = document.getElementById('disclaimer-text');
    if (disclaimerContainer) {
      disclaimerContainer.innerHTML = `
        <h3>Disclaimer</h3>
        <p>Due to the natural origin and handcrafted nature of our products, expect some variations in colour, shape, size, and characteristics. Photos are taken under optimal lighting conditions to showcase features. Actual colours may vary depending on lighting and screen settings.</p>
      `;
    }
  }
}

// Function to match disclaimer height with right column content
function matchDisclaimerHeight() {
  const disclaimerSection = document.querySelector('.view-product-disclaimer-desktop');
  const disclaimerContent = document.querySelector('.disclaimer-content');
  
  if (disclaimerSection && disclaimerContent) {
    // Reset any forced height to get natural content height
    disclaimerContent.style.height = 'auto';
    disclaimerContent.style.minHeight = 'auto';
    
    // Let the content determine its natural height
    const naturalHeight = disclaimerContent.scrollHeight;
    
    // Apply the natural height to ensure consistent sizing
    disclaimerContent.style.height = naturalHeight + 'px';
    disclaimerContent.style.minHeight = naturalHeight + 'px';
    
    // Optimize spacing for better visual balance
    disclaimerSection.style.marginBottom = '20px';
    disclaimerSection.style.paddingBottom = '0px';
    disclaimerSection.style.marginTop = '8px'; // Only 8px margin, no padding
    disclaimerSection.style.paddingTop = '0px';
    
    // Add subtle visual enhancement
    disclaimerContent.style.borderRadius = '4px';
    disclaimerContent.style.transition = 'all 0.3s ease';
  }
}

// Function to fix quantity input styling and behavior
function fixQuantityInputStyling() {
  const quantityInput = document.getElementById("view-product-quantity");
  if (quantityInput) {
    // Enhanced dark theme styling with better UX
    quantityInput.style.outline = 'none';
    quantityInput.style.boxShadow = 'none';
    quantityInput.style.border = '2px solid #555';
    quantityInput.style.borderRadius = '6px';
    quantityInput.style.padding = '10px 14px';
    quantityInput.style.margin = '0';
    quantityInput.style.backgroundColor = '#2a2a2a';
    quantityInput.style.color = '#ffffff';
    quantityInput.style.fontSize = '16px';
    quantityInput.style.fontWeight = '500';
    quantityInput.style.textAlign = 'center';
    quantityInput.style.verticalAlign = 'middle';
    quantityInput.style.display = 'inline-block';
    quantityInput.style.transition = 'all 0.3s ease';
    quantityInput.style.minWidth = '80px';
    quantityInput.readOnly = false;
    quantityInput.disabled = false;
    
    // Enhanced focus styles with smooth transitions
    quantityInput.addEventListener('focus', function() {
      this.style.borderColor = '#ffb366';
      this.style.backgroundColor = '#333333';
      this.style.boxShadow = '0 0 0 3px rgba(255, 179, 102, 0.2)';
      this.style.transform = 'scale(1.02)';
    });
    
    quantityInput.addEventListener('blur', function() {
      this.style.borderColor = '#555';
      this.style.backgroundColor = '#2a2a2a';
      this.style.boxShadow = 'none';
      this.style.transform = 'scale(1)';
    });
    
    // Add hover effect for better interactivity
    quantityInput.addEventListener('mouseenter', function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#777';
      }
    });
    
    quantityInput.addEventListener('mouseleave', function() {
      if (document.activeElement !== this) {
        this.style.borderColor = '#555';
      }
    });
  }
}

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

    // Sort variations by weight (size) in ascending order
    variations.sort((a, b) => {
      const weightA = parseFloat(a.weight);
      const weightB = parseFloat(b.weight);
      return weightA - weightB;
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
      option.textContent = `${variation.weight} ${variation.unit} - $${parseFloat(variation["total price"]).toFixed(2)}`;
      variationSelector.appendChild(option);
    });

    // Hide/show size selector based on number of variations
    const variationRow = variationSelector.closest('.view-product-row');
    const variationLabel = document.getElementById('view-product-variation-label');
    const stockElement = document.getElementById('view-product-stock');
    
    if (variations.length === 1) {
      // Hide the entire variation row when there's only one option
      if (variationRow) {
        variationRow.style.display = 'none';
      }
    } else {
      // Show the variation row when there are multiple options
      if (variationRow) {
        variationRow.style.display = 'flex';
      }
    }

    // Update product details for the first variation by default
    currentVariation = variations[0];
    updateProductDetails(currentVariation);
    updateMetaTags(currentVariation); // Add this line
    injectProductSchema(currentVariation);
    
    // Load disclaimer based on product category/subcategory
    await loadDisclaimer(currentVariation);

    // Add this line to highlight navigation based on the category
    if (variations[0] && variations[0].category) {
      highlightNavigation(variations[0].category);
    }
    
    // Set up disclaimer height matching after content loads
    setTimeout(() => {
      matchDisclaimerHeight();
      fixQuantityInputStyling(); // Fix quantity input issues
      optimizeImageLoading(); // Add image optimization
      enhanceAccessibility(); // Improve accessibility
      setupRelatedYowahNuts(); // Setup related Yowah Nuts section
      setupRelatedProducts(); // Setup generic related products section
    }, 100);
    
    

    // Add event listener for dropdown changes (only once)
    variationSelector.addEventListener("change", (event) => {
      const selectedIndex = parseInt(event.target.value, 10);
      currentVariation = variations[selectedIndex];
      updateProductDetails(currentVariation);
      // Recalculate disclaimer height after variation change
      setTimeout(() => {
        matchDisclaimerHeight();
        fixQuantityInputStyling(); // Ensure input remains functional
        updateQuantityButtons(); // Update button states
      }, 50);
    });

    // Add to cart functionality (only once)
    addToCartButton.addEventListener("click", () => {
      // Check if this is an out-of-stock item based on button text
      if (addToCartButton.textContent === "Email Me When Available") {
        // Open email notification modal
        openEmailNotificationModal();
        return;
      }
      
      // Prevent multiple clicks during processing
      if (addToCartButton.disabled) return;
      
      // Enhanced click animation with better feedback
      addToCartButton.style.transform = 'scale(0.95)';
      addToCartButton.style.transition = 'transform 0.15s ease';
      addToCartButton.style.opacity = '0.8';
      addToCartButton.disabled = true;
      
      // Reset button appearance after animation
      setTimeout(() => {
        addToCartButton.style.transform = 'scale(1)';
        addToCartButton.style.opacity = '1';
      }, 150);
      
      const selectedIndex = parseInt(variationSelector.value, 10);
      const selectedVariation = variations[selectedIndex];
      const quantity = parseInt(quantityInputElement.value, 10) || 0;

      // Get the displayed stock from the productStockElement
      const stockElement = productStockElement;
      let displayedStock = 0;
      
      if (stockElement) {
        const stockText = stockElement.textContent || stockElement.innerText;
        if (stockText.includes('Out of Stock')) {
          displayedStock = 0;
        } else {
          // Extract number from the stock display
          const stockMatch = stockText.match(/\d+/);
          displayedStock = stockMatch ? parseInt(stockMatch[0], 10) : 0;
        }
      }

      // Function to reset button state
      const resetButton = () => {
        addToCartButton.disabled = false;
      };

      // Check for out of stock
      if (displayedStock <= 0) {
        setTimeout(() => {
          showBannerNotification("This item is currently out of stock.", 'error');
          resetButton();
        }, 600);
        return;
      }

      // Validate the quantity against the displayed stock
      if (quantity > displayedStock || quantity <= 0) {
        setTimeout(() => {
          showBannerNotification(`Only ${displayedStock} units are available.`, 'error');
          resetButton();
        }, 600);
        return;
      }

      // Add the item to the cart after a brief delay
      setTimeout(() => {
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

        // Show success banner notification
        const totalPrice = parseFloat(selectedVariation["total price"]) * quantity;
        showBannerNotification(`${quantity} × ${selectedVariation["product name"]} added to cart for $${totalPrice.toFixed(2)}`, 'success');
        
        // Reset button state
        resetButton();
      }, 600);
    });

    // Set up quantity input event listener (only once)
    quantityInputElement.addEventListener("input", () => {
      if (!currentVariation) return;
      let quantity = parseInt(quantityInputElement.value, 10) || 1;
      
      // Extract stock number from HTML content
      const stockElement = productStockElement;
      let displayedStock = 0;
      
      if (stockElement) {
        const stockText = stockElement.textContent || stockElement.innerText;
        if (stockText.includes('Out of Stock')) {
          displayedStock = 0;
        } else {
          // Extract number from the stock display
          const stockMatch = stockText.match(/\d+/);
          displayedStock = stockMatch ? parseInt(stockMatch[0], 10) : 0;
        }
      }

      if (quantity > displayedStock) {
        quantity = displayedStock;
        quantityInputElement.value = displayedStock; // Reset to max stock
      }

      const totalPrice = parseFloat(currentVariation["total price"]) * quantity;
      productPriceElement.textContent = `Subtotal: $${totalPrice.toFixed(2)}`;
    });

    // Enable native mobile picker on small screens
    if (window.innerWidth <= 576) {
      if (quantityInputElement) {
        quantityInputElement.removeAttribute('readonly');
        // Add direct input event listener for mobile
        quantityInputElement.addEventListener('input', () => {
          if (currentVariation) {
            let currentQty = parseInt(quantityInputElement.value, 10) || 1;
            const totalPrice = parseFloat(currentVariation["total price"]) * currentQty;
            productPriceElement.textContent = `Subtotal: $${totalPrice.toFixed(2)}`;
            updateQuantityButtons();
          }
        });
      }
    }

    // Set up quantity selector buttons
    const quantityDecrease = document.getElementById("quantity-decrease");
    const quantityIncrease = document.getElementById("quantity-increase");

    if (quantityDecrease && quantityIncrease) {
      quantityDecrease.addEventListener("click", () => {
        if (!currentVariation) return;
        let currentQty = parseInt(quantityInputElement.value, 10) || 1;
        if (currentQty > 1) {
          currentQty--;
          quantityInputElement.value = currentQty;
          const totalPrice = parseFloat(currentVariation["total price"]) * currentQty;
          productPriceElement.textContent = `Subtotal: $${totalPrice.toFixed(2)}`;
        }
        // Update button states
        updateQuantityButtons();
      });

      quantityIncrease.addEventListener("click", () => {
        if (!currentVariation) return;
        let currentQty = parseInt(quantityInputElement.value, 10) || 1;
        
        // Extract stock number from HTML content
        const stockElement = productStockElement;
        let displayedStock = 0;
        
        if (stockElement) {
          const stockText = stockElement.textContent || stockElement.innerText;
          if (stockText.includes('Out of Stock')) {
            displayedStock = 0;
          } else {
            // Extract number from the stock display
            const stockMatch = stockText.match(/\d+/);
            displayedStock = stockMatch ? parseInt(stockMatch[0], 10) : 0;
          }
        }
        
        if (currentQty < displayedStock) {
          currentQty++;
          quantityInputElement.value = currentQty;
          const totalPrice = parseFloat(currentVariation["total price"]) * currentQty;
          productPriceElement.textContent = `Subtotal: $${totalPrice.toFixed(2)}`;
        }
        // Update button states
        updateQuantityButtons();
      });
    }

    // After you set variations and before using category:
    const category = variations[0]?.category;
    const subcategory = variations[0]?.["sub category"];

    // Dispatch event for navbar highlighting
    if (category) {
      document.dispatchEvent(new CustomEvent("productCategoryLoaded", { 
        detail: { 
          category: category,
          subcategory: subcategory 
        } 
      }));
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
    
    //Escape to synthetic level if mix CZ & Spinel bag
    if (continueLink && continueBtn) {
      if (category && category == 'synthetic-spinel,synthetic-cubic-zirconia') {
        continueLink.href = `products.html?category=synthetic`;
      }
      else if (category) {
        // If there's a subcategory, include it in the URL using the format: mainCategory|subcategory
        if (subcategory) {
          continueLink.href = `products.html?category=${encodeURIComponent(category)}|${encodeURIComponent(subcategory.toLowerCase())}`;
        } else {
          continueLink.href = `products.html?category=${encodeURIComponent(category)}`;
        }
      } else {
        // No category - go to all products page
        continueLink.href = `products.html`;
      }
      continueBtn.textContent = `Continue Shopping`;
    }

  } catch (error) {
    console.error("Error fetching product details:", error);
    handleProductLoadError(error); // Use enhanced error handling
    productNameElement.textContent = "Error loading product";
    productDescriptionElement.textContent = "Please try again later.";
  }
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
    productImageElement.alt = generateDynamicAltTag(selectedVariation, true);
    productDescriptionElement.textContent = selectedVariation.description;
    
    if (availableStock > 0) {
          // Format stock with centered number under "Stock" label
          productStockElement.innerHTML = `
            <div style="text-align: center; line-height: 1.2;">
              <div>Stock</div>
              <div style="font-weight: bold; color: #ffb366; font-size: 1.1em;">${availableStock}</div>
            </div>
          `;
          quantityInputElement.disabled = false;
          quantityInputElement.value = 1;
          
          // Update button for in-stock items
          addToCartButton.textContent = "Add to Cart";
          addToCartButton.style.backgroundColor = "#cc5500";
        } else {
          productStockElement.innerHTML = `
            <div style="text-align: center; line-height: 1.2;">
              <div style="color: #f44336;">Out of Stock</div>
            </div>
          `;
          quantityInputElement.disabled = true;
          quantityInputElement.value = 0;
          
          // Update button for out-of-stock items
          addToCartButton.textContent = "Email Me When Available";
          addToCartButton.style.backgroundColor = "#666666";
        }
    addToCartButton.disabled = false; // Always enabled
    productPriceElement.textContent = `Subtotal: $${parseFloat(selectedVariation["total price"]).toFixed(2)}`;

    // Update unit information
    if (productUnitInfoElement) {
      // Format the unit info more clearly
      let unitText = selectedVariation.unit.toLowerCase() === 'each' || selectedVariation.unit.toLowerCase() === 'bag' || selectedVariation.unit.toLowerCase() === 'piece' 
        ? `${selectedVariation.weight} ${selectedVariation.unit}`
        : `${selectedVariation.weight} ${selectedVariation.unit}`;
      
      // Add dimensions for slabs directly in the unit text
      if (selectedVariation["Dimensions"] && selectedVariation.category === "Slabs") {
        unitText += ` - ${selectedVariation["Dimensions"]}`;
      }
      
      productUnitInfoElement.textContent = unitText;
      productUnitInfoElement.style.fontWeight = 'bold';
      productUnitInfoElement.style.color = '#ffb366';
    }
    if (productUnitPriceElement) {
      productUnitPriceElement.textContent = `$${parseFloat(selectedVariation["total price"]).toFixed(2)}`;
      productUnitPriceElement.style.fontWeight = 'bold';
      productUnitPriceElement.style.color = '#ffb366';
    }

    quantityInputElement.setAttribute("max", availableStock);
    quantityInputElement.value = 1;

    // Main image from API
    const apiImage = selectedVariation["image url"] || "images/placeholder.png";
    const apiImage2 = selectedVariation["image 2 url"] || "";
    const apiImage3 = selectedVariation["image 3 url"] || "";
    const mainImage = document.getElementById("view-product-image");
    const thumbnailsContainer = document.getElementById("view-product-thumbnails");
    const modalOverlay = document.getElementById("image-modal-overlay");
    const modalImg = document.getElementById("image-modal-img");
    
    // Start building the image array with API images
    let allImages = [apiImage];
    if (apiImage2 && apiImage2.trim() !== "") {
      allImages.push(apiImage2);
    }
    if (apiImage3 && apiImage3.trim() !== "") {
      allImages.push(apiImage3);
    }
    
    // Set the main image to the first image
    if (mainImage) {
      mainImage.src = allImages[0];
      mainImage.alt = generateDynamicAltTag(selectedVariation, true);
      mainImage.setAttribute("loading", "lazy");
      
      // Gracefully handle missing main image
      mainImage.onerror = function() {
        // Hide the image container if main image fails to load
        const imageContainer = this.parentElement;
        if (imageContainer) {
          imageContainer.style.display = "none";
        }
      };
      
      // Show image container in case it was hidden before
      const imageContainer = mainImage.parentElement;
      if (imageContainer) {
        imageContainer.style.display = "";
      }
    }

    // Render thumbnails for all images
    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = "";
      allImages.forEach((imgUrl, idx) => {
        const thumb = document.createElement("img");
        thumb.src = imgUrl;
        thumb.alt = generateDynamicAltTag(selectedVariation, false);
        thumb.className = "view-product-image-placeholder";
        thumb.style.cursor = "pointer";
        thumb.loading = "lazy";
        // Highlight the selected thumbnail
        if (idx === 0) thumb.style.border = "2px solid #cc5500";
        
        // Gracefully handle missing images - remove thumbnail if image fails to load
        thumb.onerror = function() {
          this.remove();
        };
        
        thumb.addEventListener("click", function() {
          if (mainImage) {
            mainImage.src = imgUrl;
            mainImage.alt = generateDynamicAltTag(selectedVariation, true);
          }
          // Optional: highlight the selected thumbnail
          thumbnailsContainer.querySelectorAll("img").forEach(img => img.style.border = "1px solid #444");
          this.style.border = "2px solid #cc5500";
        });
        thumbnailsContainer.appendChild(thumb);
      });
    }

    quantityInputElement.setAttribute("max", availableStock);
    quantityInputElement.value = 1;
    
    // Update quantity button states after setting values
    setTimeout(updateQuantityButtons, 100);
    
    // Load disclaimer for the selected variation
    loadDisclaimer(selectedVariation);
}

fetchProductDetails();

// Function to optimize image loading performance
function optimizeImageLoading() {
  const mainImage = document.getElementById("view-product-image");
  const thumbnails = document.querySelectorAll(".view-product-image-placeholder");
  
  if (mainImage) {
    // Add smooth transition for main image
    mainImage.style.transition = 'opacity 0.3s ease';
    mainImage.style.borderRadius = '8px';
    
    // Optimize loading with intersection observer
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.style.opacity = '1';
        }
      });
    });
    
    imageObserver.observe(mainImage);
  }
  
  // Enhance thumbnail interactions
  thumbnails.forEach(thumb => {
    thumb.style.transition = 'all 0.2s ease';
    thumb.style.borderRadius = '4px';
    
    thumb.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.05)';
      this.style.opacity = '0.8';
    });
    
    thumb.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      this.style.opacity = '1';
    });
  });
}

// Function to enhance accessibility
function enhanceAccessibility() {
  // Add ARIA labels for screen readers
  const quantityInput = document.getElementById("view-product-quantity");
  const addToCartButton = document.getElementById("view-product-add-to-cart");
  const variationSelector = document.getElementById("view-product-variation-selector");
  
  if (quantityInput) {
    quantityInput.setAttribute('aria-label', 'Product quantity');
    quantityInput.setAttribute('role', 'spinbutton');
  }
  
  if (addToCartButton) {
    addToCartButton.setAttribute('aria-label', 'Add product to shopping cart');
  }
  
  if (variationSelector) {
    variationSelector.setAttribute('aria-label', 'Select product variation');
  }
  
  // Improve keyboard navigation
  const focusableElements = document.querySelectorAll('button, input, select, [tabindex]');
  focusableElements.forEach(element => {
    element.addEventListener('focus', function() {
      this.style.outline = '2px solid #ffb366';
      this.style.outlineOffset = '2px';
    });
    
    element.addEventListener('blur', function() {
      this.style.outline = 'none';
    });
  });
}

// Enhanced error handling for product loading
function handleProductLoadError(error) {
  console.error("Enhanced error handling:", error);
  
  // Show user-friendly error message
  const errorContainer = document.createElement('div');
  errorContainer.className = 'product-error-message';
  errorContainer.style.cssText = `
    background-color: #f44336;
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
    font-weight: bold;
  `;
  errorContainer.textContent = 'Unable to load product details. Please refresh the page or try again later.';
  
  const container = document.querySelector('.view-product-container') || document.body;
  container.prepend(errorContainer);
  
  // Auto-hide error after 10 seconds
  setTimeout(() => {
    if (errorContainer.parentNode) {
      errorContainer.remove();
    }
  }, 10000);
}

// Product SEO meta mapping for enhanced optimization
const productSEOMeta = {
  // Synthetic Spinel Products
  "s104": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Brilliant clarity, vibrant color. {weight}{unit} available at ${price}. Perfect for collectors and lapidary enthusiasts.",
    keywords: "synthetic spinel, silver blue spinel, faceting rough, lapidary, gemstone cutting, Australian gems",
    image: "https://outbackgems.com.au/images/main/s104.jpeg",
    altText: "Silver Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s105": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Soft pale blue clarity. {weight}{unit} available at ${price}. Ideal for faceting and lapidary projects.",
    keywords: "synthetic spinel, powder blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s105.jpeg",
    altText: "Powder Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s106": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Crisp icy blue clarity. {weight}{unit} available at ${price}. Outstanding for faceting projects.",
    keywords: "synthetic spinel, ice blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s106.jpeg",
    altText: "Ice Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s107": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Clear summer sky blue. {weight}{unit} available at ${price}. Perfect for faceting and lapidary.",
    keywords: "synthetic spinel, sky blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s107.jpeg",
    altText: "Sky Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s112": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Rich deep blue hue with excellent clarity. {weight}{unit} at ${price}. Ideal for collectors.",
    keywords: "synthetic spinel, royal blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s112.jpeg",
    altText: "Royal Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s113": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Classic sapphire-blue with vibrant clarity. {weight}{unit} at ${price}. Perfect for faceting.",
    keywords: "synthetic spinel, sapphire blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s113.jpeg",
    altText: "Sapphire Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s114": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Dark midnight blue with excellent clarity. {weight}{unit} at ${price}. Ideal for lapidary.",
    keywords: "synthetic spinel, midnight blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s114.jpeg",
    altText: "Midnight Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s119": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Vibrant ocean blue with great clarity. {weight}{unit} at ${price}. Perfect for faceting.",
    keywords: "synthetic spinel, ocean blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s119.jpeg",
    altText: "Ocean Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s120": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Subtle blue-grey tone with high clarity. {weight}{unit} at ${price}. Ideal for lapidary.",
    keywords: "synthetic spinel, slate blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s120.jpeg",
    altText: "Slate Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Synthetic Sapphire Boule Products
  "ssp002": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Pink | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in bright pink colour. {weight}{unit} synthetic corundum boule perfect for faceting and lapidary projects at ${price}. High quality crystal structure ideal for gemstone cutting.",
    keywords: "premium sapphire material, synthetic sapphire boule, pink sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting, crystal boule",
    image: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    altText: "Bright Pink Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp004": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Vibrant Pink | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in vibrant pink colour. {weight}{unit} synthetic corundum boule ideal for faceting and lapidary projects at ${price}. Exceptional clarity and colour saturation.",
    keywords: "premium sapphire material, synthetic sapphire boule, vibrant pink sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/ssp004.jpeg",
    altText: "Vibrant Pink Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp007": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Deep Pink | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in deep pink colour. {weight}{unit} synthetic corundum boule perfect for advanced faceting and lapidary projects at ${price}. Rich colour depth and clarity.",
    keywords: "premium sapphire material, synthetic sapphire boule, deep pink sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/ssp007.jpeg",
    altText: "Deep Pink Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp012": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Clear White | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in clear white colour. {weight}{unit} synthetic corundum boule ideal for faceting and lapidary projects at ${price}. Crystal clear transparency perfect for precision cutting.",
    keywords: "premium sapphire material, synthetic sapphire boule, clear white sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting, clear crystal",
    image: "https://outbackgems.com.au/images/main/ssp012.jpeg",
    altText: "Clear White Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp033": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Beautiful Blue | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in beautiful sapphire blue colour. {weight}{unit} synthetic corundum boule perfect for faceting and lapidary projects at ${price}. Classic sapphire blue with exceptional clarity.",
    keywords: "premium sapphire material, synthetic sapphire boule, sapphire blue, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting, blue sapphire",
    image: "https://outbackgems.com.au/images/main/ssp033.jpeg",
    altText: "Beautiful Blue Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp045": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Blue Purple | Outback Gems & Minerals",
    description: "Premium sapphire material half boule displaying hints of blue and purple. {weight}{unit} synthetic corundum boule ideal for faceting and lapidary projects at ${price}. Unique colour combination with excellent clarity.",
    keywords: "premium sapphire material, synthetic sapphire boule, blue purple sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting, bi-colour",
    image: "https://outbackgems.com.au/images/main/ssp045.jpeg",
    altText: "Blue Purple Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "ssp055": {
    titleTemplate: "Buy {name} {weight}{unit} Half Boule - ${price} | Premium Sapphire Material Caramel Orange | Outback Gems & Minerals",
    description: "Premium sapphire material half boule in exotic caramel orange colour. {weight}{unit} synthetic corundum boule perfect for faceting and lapidary projects at ${price}. Rare orange hue with outstanding clarity.",
    keywords: "premium sapphire material, synthetic sapphire boule, caramel orange sapphire, half boule, faceting rough, synthetic corundum, lapidary, gemstone cutting, orange sapphire",
    image: "https://outbackgems.com.au/images/main/ssp055.jpeg",
    altText: "Caramel Orange Premium Sapphire Material Half Boule - Premium faceting rough for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },

  // Synthetic Spinel Boule Products
  "sb104": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb104.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb105": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb105.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb106": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb106.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb107": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb107.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb108": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb108.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb113": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb113.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb114": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb114.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb119": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb119.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb149": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb149.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  "sb152": {
    titleTemplate: "Buy {name} {weight}{unit} Synthetic Spinel Boule - ${price} | Bulk Purchase Savings | Outback Gems & Minerals",
    description: "Silver-blue synthetic spinel boule with bulk purchase savings. {weight}{unit} cost-effective faceting material at ${price}. Save more with larger quantities - perfect for commercial gem cutting and lapidary projects.",
    keywords: "synthetic spinel boule, bulk purchase savings, silver blue spinel, cost effective faceting, wholesale spinel rough, cheaper per carat, bulk discount gemstones, commercial gem cutting, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/sb152.jpeg",
    altText: "Silver Blue Synthetic Spinel Boule - Bulk purchase savings on cost-effective faceting material at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  },
  
  // Cubic Zirconia Products
  "cz001": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium champagne cubic zirconia faceting rough. Warm, light golden color with excellent clarity. {weight}{unit} at ${price}. Perfect for faceting projects.",
    keywords: "cubic zirconia, champagne CZ, faceting rough, lapidary, gemstone cutting, light golden CZ",
    image: "https://outbackgems.com.au/images/main/cz001.jpeg",
    altText: "Champagne Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz014": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium golden cubic zirconia faceting rough. Vibrant golden color with excellent clarity. {weight}{unit} at ${price}. Ideal for faceting.",
    keywords: "cubic zirconia, golden CZ, faceting rough, lapidary, gemstone cutting, golden yellow CZ",
    image: "https://outbackgems.com.au/images/main/cz014.jpeg",
    altText: "Golden Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz019": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium lavender cubic zirconia faceting rough. Delicate lavender hue with brilliant clarity. {weight}{unit} at ${price}. Perfect for lapidary.",
    keywords: "cubic zirconia, lavender CZ, faceting rough, lapidary, gemstone cutting, light lavender CZ",
    image: "https://outbackgems.com.au/images/main/cz019.jpeg",
    altText: "Lavender Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz025": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium orange cubic zirconia faceting rough. Bright orange color with excellent clarity. {weight}{unit} at ${price}. Ideal for faceting.",
    keywords: "cubic zirconia, orange CZ, faceting rough, lapidary, gemstone cutting, bright orange CZ",
    image: "https://outbackgems.com.au/images/main/cz025.jpeg",
    altText: "Orange Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Natural Zircon Products
  "hzr002": {
    titleTemplate: "Buy {name} 300ct Bag - ${price} | Natural Zircon from Harts Range NT | Outback Gems & Minerals",
    description: "300ct bag of mixed natural zircons from Harts Range, NT. Colorful assortment in various shapes and sizes. Perfect for lapidary practice at ${price}.",
    keywords: "natural zircon, Harts Range zircon, Australian gemstones, lapidary supplies, NT minerals",
    image: "https://outbackgems.com.au/images/main/hzr002.jpeg",
    altText: "Natural Zircon crystals from Harts Range NT - Premium Australian gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/hd001.jpeg",
    categoryAltText: "Natural zircon rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "hzr003": {
    titleTemplate: "Buy {name} 145ct Bag - ${price} | Natural Zircon from Harts Range NT | Outback Gems & Minerals",
    description: "145ct bag of mixed natural zircons from Harts Range, NT. Various colors suitable for faceting. Premium quality at ${price}.",
    keywords: "natural zircon, Harts Range zircon, Australian gemstones, faceting material, NT minerals",
    image: "https://outbackgems.com.au/images/main/hzr003.jpeg",
    altText: "Natural Zircon crystals from Harts Range NT - Premium Australian gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/hd001.jpeg",
    categoryAltText: "Natural zircon rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  
  // Amethyst Products
  "waam001": {
    titleTemplate: "Buy {name} 1200ct Bag - ${price} | Natural Amethyst from WA | Outback Gems & Minerals",
    description: "1200ct bag of natural amethyst crystals from Western Australia. Beautiful purple shades for display at ${price}. Premium Australian minerals.",
    keywords: "natural amethyst, WA amethyst, Australian minerals, purple crystals, display specimens",
    image: "https://outbackgems.com.au/images/main/waam001.jpeg",
    altText: "Natural Western Australian Amethyst crystals - Premium purple gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb004.jpeg",
    categoryAltText: "Natural amethyst specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  "waam002": {
    titleTemplate: "Buy {name} 1000ct Bag - ${price} | Natural Amethyst from WA | Outback Gems & Minerals",
    description: "1000ct bag of natural amethyst from WA. Various shapes and shades from clear to deep purple. Perfect for collections at ${price}.",
    keywords: "natural amethyst, WA amethyst, Australian minerals, purple quartz, crystal specimens",
    image: "https://outbackgems.com.au/images/main/waam002.jpeg",
    altText: "Natural Western Australian Amethyst crystals - Premium purple gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb004.jpeg",
    categoryAltText: "Natural amethyst specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Smoky Quartz
  "sq002": {
    titleTemplate: "Buy {name} 108ct Crystal - ${price} | Natural Smoky Quartz from Mooralla VIC | Outback Gems & Minerals",
    description: "Beautiful 108ct smoky quartz crystal from Mooralla, Victoria. Well-defined crystal structure. Outstanding display piece at ${price}.",
    keywords: "smoky quartz, Mooralla quartz, Victorian minerals, crystal specimens, display crystals",
    image: "https://outbackgems.com.au/images/main/sq002.jpeg",
    altText: "Natural Smoky Quartz crystal from Mooralla VIC - Premium crystal specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb006.jpeg",
    categoryAltText: "Natural smoky quartz specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Mixed Faceting Bags
  "fb001": {
    titleTemplate: "Buy {name} 1000ct Bulk Bag - ${price} | Mixed Cubic Zirconia Faceting Rough | Outback Gems & Minerals",
    description: "1000ct bulk bag of mixed cubic zirconia. Various colors and sizes for faceting practice. Great value at ${price}.",
    keywords: "bulk cubic zirconia, faceting practice, mixed CZ rough, lapidary supplies, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/fb001.jpeg",
    altText: "Mixed Cubic Zirconia bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "fb002": {
    titleTemplate: "Buy {name} 300ct Bulk Bag - ${price} | Mixed Synthetic Spinel Faceting Rough | Outback Gems & Minerals",
    description: "300ct bulk bag of mixed synthetic spinel. Various colors and sizes for faceting practice. Excellent value at ${price}.",
    keywords: "bulk synthetic spinel, faceting practice, mixed spinel rough, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/fb002.jpeg",
    altText: "Mixed Synthetic Spinel bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "fb003": {
    titleTemplate: "Buy {name} 500ct Bulk Bag - ${price} | Mixed CZ & Spinel Faceting Rough | Outback Gems & Minerals",
    description: "500ct bulk bag of mixed cubic zirconia and synthetic spinel. Various colors for faceting practice. Perfect value at ${price}.",
    keywords: "bulk faceting rough, mixed CZ spinel, faceting practice, lapidary supplies, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/fb003.jpeg",
    altText: "Mixed CZ & Spinel bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Agate Products
  "as001": {
    titleTemplate: "Buy {name} - ${price} | Thunder Egg Agate Slice from Agate Creek QLD | Outback Gems & Minerals",
    description: "Thunder egg agate slice from Agate Creek, QLD. Vivid red swirls with crystalline sections. Unpolished specimen at ${price}.",
    keywords: "agate slice, thunder egg, Agate Creek QLD, Australian agate, mineral specimens",
    image: "https://outbackgems.com.au/images/main/Other-Agate-Slice.jpeg",
    altText: "Thunder Egg Agate Slice from Agate Creek QLD - Premium Australian mineral specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/cla001.jpeg",
    categoryAltText: "Natural agate slice specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Sapphire Washbags
  "sw001": {
    titleTemplate: "Buy {name} 700g Bag - ${price} | Sapphire Fossicking from Queensland Gemfields | Outback Gems & Minerals",
    description: "700g sapphire washbag from Queensland Gemfields. Includes bonus cut sapphire. Home fossicking experience at ${price}.",
    keywords: "sapphire washbag, Queensland sapphires, fossicking, gemfield dirt, sapphire hunting",
    image: "https://outbackgems.com.au/images/main/sw001.jpeg",
    altText: "Queensland Sapphire Washbag - Premium fossicking experience from Queensland Gemfields at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sw001.jpeg",
    categoryAltText: "Sapphire washbag specimens - Premium fossicking supplies at Outback Gems & Minerals"
  },
  
  // Yowah Nuts
  "yn001": {
    titleTemplate: "Buy {name} 501-1000ct - ${price} | Large Unopened Yowah Nut from QLD | Outback Gems & Minerals",
    description: "Large unopened Yowah Nut (501-1000ct) from Queensland opal fields. Chance at precious opal discovery. Exciting find at ${price}.",
    keywords: "Yowah nut, Queensland opal, unopened ironstone, opal hunting, opal nuts",
    image: "https://outbackgems.com.au/images/main/yn001.jpeg",
    altText: "Large Unopened Yowah Nut from Queensland - Premium opal hunting specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/yn001.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn002": {
    titleTemplate: "Buy {name} 150-500ct - ${price} | Medium Unopened Yowah Nut from QLD | Outback Gems & Minerals",
    description: "Medium unopened Yowah Nut (150-500ct) from Queensland opal fields. Perfect for opal hunting enthusiasts at ${price}.",
    keywords: "Yowah nut, Queensland opal, unopened ironstone, opal hunting, medium opal nuts",
    image: "https://outbackgems.com.au/images/main/yn002.jpeg",
    altText: "Medium Unopened Yowah Nut from Queensland - Premium opal hunting specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/yn001.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn003": {
    titleTemplate: "Buy {name} 3-Pack - ${price} | Medium Unopened Yowah Nuts from QLD | Outback Gems & Minerals",
    description: "3-pack of medium Yowah Nuts (150-500ct each) from Queensland. Increase your opal discovery chances at ${price}.",
    keywords: "Yowah nut pack, Queensland opal, unopened ironstone, opal hunting, value pack",
    image: "https://outbackgems.com.au/images/main/yn003.jpeg",
    altText: "3-Pack Medium Yowah Nuts from Queensland - Premium opal hunting value pack at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/yn001.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn004": {
    titleTemplate: "Buy {name} 3-Pack - ${price} | Small Unopened Yowah Nuts from QLD | Outback Gems & Minerals",
    description: "3-pack of small Yowah Nuts (≤150ct each) from Queensland opal fields. Great value pack for opal hunting enthusiasts at ${price}.",
    keywords: "Yowah nut pack, Queensland opal, unopened ironstone, opal hunting, small opal nuts, value pack",
    image: "https://outbackgems.com.au/images/main/yn004.jpeg",
    altText: "3-Pack Small Yowah Nuts from Queensland - Premium opal hunting value pack at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/yn001.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn005": {
    titleTemplate: "Buy {name} 1001-1750ct - ${price} | Extra Large Unopened Yowah Nut from QLD | Outback Gems & Minerals",
    description: "Extra large unopened Yowah Nut (1001-1750ct) from Queensland opal fields. Maximum potential for precious opal discovery at ${price}.",
    keywords: "Yowah nut, Queensland opal, unopened ironstone, opal hunting, extra large opal nuts",
    image: "https://outbackgems.com.au/images/main/yn005.jpeg",
    altText: "Extra Large Unopened Yowah Nut from Queensland - Premium opal hunting specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/yn001.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  
  // Tumbles
  "tb001": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Quartz Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of quartz tumbles. Milky white to clear varieties. Perfect for collectors and crafts at ${price}.",
    keywords: "quartz tumbles, tumbled stones, crystal specimens, craft supplies, clear quartz",
    image: "https://outbackgems.com.au/images/main/tb001.jpeg",
    altText: "Quartz Tumbled Stones 100g bag - Premium crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb004.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  "tb002": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Amethyst Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of amethyst tumbles. Beautiful purple hues from pale lilac to deep violet. Ideal for jewelry making at ${price}.",
    keywords: "amethyst tumbles, purple tumbles, tumbled stones, jewelry supplies, crystal specimens",
    image: "https://outbackgems.com.au/images/main/other-amethyst-tumbles.jpeg",
    altText: "Amethyst Tumbled Stones 100g bag - Premium purple crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb004.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  "tb003": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Agate Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of colorful agate tumbles. Natural banded patterns in vibrant colors. Great for jewelry making at ${price}.",
    keywords: "agate tumbles, banded agate, tumbled stones, jewelry supplies, decorative stones",
    image: "https://outbackgems.com.au/images/main/other-agate-tumbles.jpeg",
    altText: "Agate Tumbled Stones 100g bag - Premium banded crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/tmb004.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  
  // Herkimer Diamonds
  "hd001": {
    titleTemplate: "Buy {name} 100g - ${price} | Natural Herkimer Diamond Quartz Crystals | Outback Gems & Minerals",
    description: "100g of natural Herkimer Diamonds from New York. Exceptional double-terminated quartz crystals. Unique formation at ${price}.",
    keywords: "Herkimer diamonds, double terminated quartz, New York crystals, facetable crystals, specimen crystals",
    image: "https://outbackgems.com.au/images/main/other-herkimer-diamonds.jpeg",
    altText: "Natural Herkimer Diamond Quartz Crystals - Premium double-terminated specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/hd001.jpeg",
    categoryAltText: "Herkimer diamond specimens - Premium quartz crystals at Outback Gems & Minerals"
  }
};

// Subcategory SEO metadata mapping
const subCategorySEOMeta = {
  "Synthetic Sapphire Boule": {
    titleTemplate: "Buy Synthetic Sapphire Boules - Half Boules in Varying Colours | Premium Sapphire Material | Outback Gems & Minerals",
    description: "Premium synthetic sapphire boules and half boules in varying colours. High-quality synthetic corundum perfect for faceting and lapidary projects. Pink, blue, white, and orange sapphire material available. Professional gemstone cutting supplies.",
    keywords: "synthetic sapphire boules, premium sapphire material, half boules, varying colours, synthetic corundum, faceting rough, lapidary supplies, gemstone cutting, crystal boules, pink sapphire, blue sapphire, white sapphire, orange sapphire",
    image: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    altText: "Premium Synthetic Sapphire Boules in Varying Colours - Half boules for faceting and lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/ssp002.jpeg",
    categoryAltText: "Premium Sapphire Material Boules - Half boules in varying colours for faceting and lapidary projects at Outback Gems & Minerals"
  },
  "Synthetic Spinel Boule": {
    titleTemplate: "Buy Synthetic Spinel Boules - Bulk Purchase Savings | Cost-Effective Faceting Material | Outback Gems & Minerals",
    description: "Premium synthetic spinel boules with bulk purchase savings. Cost-effective faceting material for lapidary projects. High-quality silver-blue synthetic spinel rough at wholesale prices. Save more with larger quantities - perfect for commercial gem cutting.",
    keywords: "synthetic spinel boules, bulk purchase savings, cost effective faceting, wholesale spinel rough, silver blue spinel, synthetic faceting material, lapidary supplies, commercial gem cutting, bulk discount gemstones, cheaper per carat spinel, faceting rough wholesale",
    image: "https://outbackgems.com.au/images/main/sb104.jpeg",
    altText: "Bulk Purchase Synthetic Spinel Boules - Cost-effective faceting material with wholesale savings at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/main/sb104.jpeg",
    categoryAltText: "Synthetic Spinel Boule Collection - Bulk savings on premium faceting material at Outback Gems & Minerals"
  }
};

// Enhanced function to extract color from product name
function extractColor(productName) {
  const colorMap = {
    'Silver Blue': 'silver blue',
    'Powder Blue': 'powder blue', 
    'Ice Blue': 'ice blue',
    'Sky Blue': 'sky blue',
    'Royal Blue': 'royal blue',
    'Sapphire Blue': 'sapphire blue',
    'Midnight Blue': 'midnight blue',
    'Ocean Blue': 'ocean blue',
    'Slate Blue': 'slate blue',
    'Champagne': 'champagne',
    'Lavender': 'lavender',
    'Golden Yellow': 'golden yellow',
    'Orange': 'orange'
  };
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (productName.includes(key)) {
      return value;
    }
  }
  return '';
}

// Enhanced meta tags function with multi-image support and improved SEO
function updateMetaTags(product) {
  if (!product) return;
  
  const productMeta = productSEOMeta[productId];
  const color = extractColor(product["product name"]);
  const stockStatus = product.stock > 0 ? 'In Stock' : 'Out of Stock';
  const stockText = product.stock > 0 ? ` ${stockStatus} -` : ` ${stockStatus}.`;
  
  let title, description, images = [], altText;
  
  if (productMeta) {
    // Use optimized templates with dynamic data
    title = productMeta.titleTemplate
      .replace('{name}', product["product name"])
      .replace('{weight}', product.weight)
      .replace('{unit}', product.unit)
      .replace('{color}', color)
      .replace('${price}', parseFloat(product["total price"]).toFixed(2));
      
    description = productMeta.description
      .replace('{name}', product["product name"])
      .replace('{weight}', product.weight)
      .replace('{unit}', product.unit)
      .replace('{color}', color)
      .replace('${price}', parseFloat(product["total price"]).toFixed(2)) + stockText + " Shop online at Outback Gems & Minerals.";
    
    // Single image support - use only the product's own image
    images = [];
    
    // Priority: specific product image from productSEOMeta, then inventory JSON image
    if (productMeta.image) {
      images.push(productMeta.image);
    } else if (product["image url"]) {
      images.push(product["image url"]);
    }
    
    // Fallback to default if no images
    if (images.length === 0) {
      images.push('https://outbackgems.com.au/images/general/Facebook%20Logo.jpg');
    }
    
    altText = productMeta.altText || `${product["product name"]} ${product.weight}${product.unit} - Premium ${color || 'gemstone'} specimen at Outback Gems & Minerals`;
  } else {
    // Fallback for products not in mapping
    title = `Buy ${product["product name"]} ${product.weight}${product.unit} - $${parseFloat(product["total price"]).toFixed(2)} | Outback Gems & Minerals`;
    description = `${product.description || 'Premium gemstone product'}${stockText} Available for $${parseFloat(product["total price"]).toFixed(2)}. Shop online at Outback Gems & Minerals.`;
    images = product["image url"] ? [product["image url"]] : ['https://outbackgems.com.au/images/general/Facebook%20Logo.jpg'];
    altText = `${product["product name"]} ${product.weight}${product.unit} - Premium ${color || 'gemstone'} specimen at Outback Gems & Minerals`;
  }

  // Update document title
  document.title = title;

  // Update breadcrumb
  updateBreadcrumb(product);

  // Meta Description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', description);

  // Meta Keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement('meta');
    metaKeywords.setAttribute('name', 'keywords');
    document.head.appendChild(metaKeywords);
  }
  const keywords = productMeta?.keywords || `${product["product name"]}, ${color} gemstone, ${product.category}, ${product.subcategory}, Australian gems, premium quality, specimen details, gem pricing, faceting rough`;
  metaKeywords.setAttribute('content', keywords);

  // Open Graph - Primary
  updateOpenGraphTags(title, description, images, altText);
  
  // Twitter Cards
  updateTwitterCardTags(title, description, images[0], altText);
  
  // Product-specific meta tags
  updateProductMetaTags(product);
  
  // Add canonical URL
  updateCanonicalURL();
}

// Function to update Open Graph tags with single image support
function updateOpenGraphTags(title, description, images, altText) {
  // Remove existing og:image tags
  const existingOgImages = document.querySelectorAll('meta[property="og:image"]');
  existingOgImages.forEach(meta => meta.remove());
  
  // Add single primary image
  if (images.length > 0) {
    const ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    ogImage.setAttribute('content', images[0]);
    document.head.appendChild(ogImage);
  }

  // Other Open Graph tags
  updateOrCreateMeta('property', 'og:title', title);
  updateOrCreateMeta('property', 'og:description', description);
  updateOrCreateMeta('property', 'og:url', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
  updateOrCreateMeta('property', 'og:image:alt', altText);
}

// Function to update Twitter Card tags
function updateTwitterCardTags(title, description, primaryImage, altText) {
  updateOrCreateMeta('name', 'twitter:card', 'summary_large_image');
  updateOrCreateMeta('name', 'twitter:title', title);
  updateOrCreateMeta('name', 'twitter:description', description);
  updateOrCreateMeta('name', 'twitter:image', primaryImage);
  updateOrCreateMeta('name', 'twitter:image:alt', altText);
  updateOrCreateMeta('name', 'twitter:url', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
}

// Function to update product-specific meta tags
function updateProductMetaTags(product) {
  // Product availability
  const availability = product.stock > 0 ? 'in stock' : 'out of stock';
  updateOrCreateMeta('property', 'product:availability', availability);
  updateOrCreateMeta('property', 'product:price:amount', parseFloat(product["total price"]).toFixed(2));
  updateOrCreateMeta('property', 'product:price:currency', 'AUD');
  
  // Update structured data elements
  const offerAvailability = document.getElementById('offer-availability');
  if (offerAvailability) {
    offerAvailability.setAttribute('content', 
      product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    );
  }
  
  const priceValue = document.getElementById('price-value');
  const offerUrl = document.getElementById('offer-url');
  if (priceValue) priceValue.textContent = parseFloat(product["total price"]).toFixed(2);
  if (offerUrl) offerUrl.setAttribute('content', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
}

// Utility function to create or update meta tags
function updateOrCreateMeta(attribute, name, content) {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

// Function to update breadcrumb navigation
function updateBreadcrumb(product) {
  const breadcrumbProductName = document.getElementById('breadcrumb-product-name');
  if (breadcrumbProductName && product) {
    breadcrumbProductName.textContent = product["product name"];
  }
}

// Function to update canonical URL
function updateCanonicalURL() {
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
}

// Modal image expand setup (add this after fetchProductDetails();)
document.addEventListener("DOMContentLoaded", async function() {
  const mainImage = document.getElementById("view-product-image");
  const modalOverlay = document.getElementById("image-modal-overlay");
  const modalImg = document.getElementById("image-modal-img");
  const closeBtn = document.querySelector(".image-modal-close");

  if (mainImage && modalOverlay && modalImg) {
    mainImage.addEventListener("click", function() {
      if (mainImage.src && !mainImage.src.endsWith("placeholder.png")) {
        modalImg.src = mainImage.src;
        modalOverlay.classList.add("active");
      }
    });

    modalOverlay.addEventListener("click", function(e) {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove("active");
        modalImg.src = "";
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function() {
        modalOverlay.classList.remove("active");
        modalImg.src = "";
      });
    }

    document.addEventListener("keydown", function(e) {
      if (modalOverlay.classList.contains("active") && (e.key === "Escape" || e.key === "Esc")) {
        modalOverlay.classList.remove("active");
        modalImg.src = "";
      }
    });
  }
  
  // Initialize category navigation
  if (window.categoryNavigation) {
    await window.categoryNavigation.initializeFromURL();
  }
});

function injectProductSchema(product) {
  if (!product) return;
  const shortDesc = product.short_description || product.description || '';
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product["product name"],
    "image": [product["image url"] || "https://www.outbackgems.com.au/images/general/Facebook%20Logo.jpg"],
    "description": shortDesc,
    "sku": product["product id"],
    "brand": {
      "@type": "Brand",
      "name": "Outback Gems & Minerals"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "AUD",
      "price": product["total price"],
      "availability": (product.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  // Remove any existing schema
  document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
  // Inject new schema
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

// Generic Related Products System
async function setupRelatedProducts() {
  const relatedSection = document.getElementById('related-products-section');
  
  // Skip if no product ID or if this is a Yowah Nut (handled separately)
  if (!productId || productId.startsWith('yn')) {
    if (relatedSection) {
      relatedSection.classList.add('hidden');
      relatedSection.style.display = 'none';
    }
    return;
  }

  try {
    const products = await getProductData();
    
    // Determine the current product's subcategory
    const currentProduct = products.find(item => item["product id"] === productId);
    if (!currentProduct) {
      if (relatedSection) {
        relatedSection.classList.add('hidden');
        relatedSection.style.display = 'none';
      }
      return;
    }

    // Get the subcategory from the current product
    const currentCategory = currentProduct.category;
    const currentSubcategory = currentProduct["sub category"];
    
    // Skip if this is a main category only (no subcategory) - only show for subcategories
    if (!currentSubcategory) {
      if (relatedSection) {
        relatedSection.classList.add('hidden');
        relatedSection.style.display = 'none';
      }
      return;
    }

    // Filter products in the same subcategory (handle comma-separated subcategories)
    let relatedProducts = products.filter(item => {
      if (item["product id"] === productId) return false; // Exclude current product
      
      const itemSubCategoryString = item["sub category"] || "";
      const currentSubCategoryString = currentSubcategory || "";
      
      if (!itemSubCategoryString || !currentSubCategoryString) return false;
      
      // Split both subcategory strings by comma and check for overlap
      const itemSubCategories = itemSubCategoryString.split(',').map(sub => sub.trim());
      const currentSubCategories = currentSubCategoryString.split(',').map(sub => sub.trim());
      
      // Check if there's any overlap between the subcategories
      return itemSubCategories.some(itemSub => 
        currentSubCategories.some(currentSub => 
          itemSub.toLowerCase() === currentSub.toLowerCase()
        )
      );
    });

    // Special handling for Tumbles category: if we have fewer than 4 products, 
    // add more from the same main category
    if (currentCategory === "Tumbles" && relatedProducts.length < 4) {
      const additionalProducts = products.filter(item => {
        if (item["product id"] === productId) return false; // Exclude current product
        if (item.category !== "Tumbles") return false; // Only tumbles
        
        // Check if this product is already in our relatedProducts array
        const alreadyIncluded = relatedProducts.some(existing => 
          existing["product id"] === item["product id"]
        );
        
        return !alreadyIncluded;
      });
      
      // Shuffle the additional products randomly
      const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      const shuffledAdditional = shuffleArray(additionalProducts);
      
      // Add additional products to reach 4 total (or until we run out)
      const needed = 4 - relatedProducts.length;
      relatedProducts = relatedProducts.concat(shuffledAdditional.slice(0, needed));
    }

    if (relatedProducts.length === 0) {
      if (relatedSection) {
        relatedSection.classList.add('hidden');
        relatedSection.style.display = 'none';
      }
      return;
    }

    // Group by product ID to get unique products
    const uniqueProducts = [];
    const seenIds = new Set();
    
    relatedProducts.forEach(item => {
      const id = item["product id"].trim();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueProducts.push(item);
      }
    });

    // Handle product ordering - special case for Tumbles to maintain subcategory priority
    let displayProducts;
    if (currentCategory === "Tumbles") {
      // For Tumbles, keep the order: same subcategory first, then additional random products
      // The products are already in the correct order from our filtering logic above
      displayProducts = uniqueProducts.slice(0, 4);
    } else {
      // For other categories, shuffle randomly as before
      const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const shuffledProducts = shuffleArray(uniqueProducts);
      displayProducts = shuffledProducts.slice(0, 4);
    }

    if (displayProducts.length === 0) {
      if (relatedSection) {
        relatedSection.classList.add('hidden');
        relatedSection.style.display = 'none';
      }
      return;
    }

    // Update the title based on subcategory and whether we're showing broader category
    const titleElement = document.getElementById('related-products-title');
    if (titleElement) {
      // Use the subcategory name directly for the title
      const subcategoryName = currentSubcategory || 'Items';
      
      // For Tumbles category, adjust title if we're showing products from broader category
      if (currentCategory === "Tumbles") {
        const subcategoryProductCount = products.filter(item => {
          if (item["product id"] === productId) return false;
          const itemSubCategoryString = item["sub category"] || "";
          const currentSubCategoryString = currentSubcategory || "";
          if (!itemSubCategoryString || !currentSubCategoryString) return false;
          const itemSubCategories = itemSubCategoryString.split(',').map(sub => sub.trim());
          const currentSubCategories = currentSubCategoryString.split(',').map(sub => sub.trim());
          return itemSubCategories.some(itemSub => 
            currentSubCategories.some(currentSub => 
              itemSub.toLowerCase() === currentSub.toLowerCase()
            )
          );
        }).length;
        
        if (subcategoryProductCount < 4) {
          titleElement.textContent = `Other Tumbles Available`;
        } else {
          titleElement.textContent = `Other ${subcategoryName} Available`;
        }
      } else {
        titleElement.textContent = `Other ${subcategoryName} Available`;
      }
    }

    // Show the related products section
    if (relatedSection) {
      relatedSection.classList.remove('hidden');
      relatedSection.style.display = 'block';
    }

    // Generate the related products HTML
    const gridWrapper = document.getElementById('related-products-wrapper');
    const swiperWrapper = document.getElementById('related-products-swiper-wrapper');
    
    if (!gridWrapper || !swiperWrapper) return;

    // Get cart data to calculate stock
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Clear existing content
    gridWrapper.innerHTML = '';
    swiperWrapper.innerHTML = '';

    displayProducts.forEach(product => {
      // Calculate available stock
      const cartItem = cart.find(item => 
        item.id === product["product id"] && 
        item.weight === product.weight && 
        item.unit === product.unit
      );
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const availableStock = product.stock - cartQuantity;
      
      // Determine stock status
      let stockClass = availableStock > 0 ? 'in-stock' : 'out-of-stock';
      let stockText = availableStock > 0 ? `${availableStock} in stock` : 'Out of stock';

      // Create card HTML content
      const cardContent = `
        <img src="${product["image url"] || 'images/placeholder.png'}" 
             alt="${product["product name"]}" 
             class="related-product-image"
             loading="lazy">
        <div class="related-product-name">${product["product name"]}</div>
        <div class="related-product-price">$${parseFloat(product["total price"]).toFixed(2)}</div>
        <div class="related-product-stock ${stockClass}">${stockText}</div>
      `;

      // Create grid card
      const gridCard = document.createElement('div');
      gridCard.className = 'product-card';
      gridCard.innerHTML = cardContent;
      gridCard.style.cursor = 'pointer';
      gridCard.addEventListener('click', () => {
        window.location.href = `view-product.html?productid=${product["product id"]}`;
      });
      gridWrapper.appendChild(gridCard);

      // Create swiper slide
      const swiperSlide = document.createElement('div');
      swiperSlide.className = 'swiper-slide';
      const swiperCard = document.createElement('div');
      swiperCard.className = 'product-card';
      swiperCard.innerHTML = cardContent;
      swiperCard.style.cursor = 'pointer';
      swiperCard.addEventListener('click', () => {
        window.location.href = `view-product.html?productid=${product["product id"]}`;
      });
      swiperSlide.appendChild(swiperCard);
      swiperWrapper.appendChild(swiperSlide);
    });

    // Add centering class based on number of products
    gridWrapper.className = 'related-products-grid';
    if (displayProducts.length === 1) {
      gridWrapper.classList.add('center-one');
    } else if (displayProducts.length === 2) {
      gridWrapper.classList.add('center-two');
    } else if (displayProducts.length === 3) {
      gridWrapper.classList.add('center-three');
    }

    // Initialize Swiper for mobile layout
    initializeRelatedProductsSwiper();

  } catch (error) {
    console.error("Error setting up related products:", error);
  }
}

// Function to initialize Swiper for generic related products
function initializeRelatedProductsSwiper() {
  // Destroy existing swiper if it exists
  if (window.relatedProductsSwiper) {
    window.relatedProductsSwiper.destroy(true, true);
  }

  // Initialize new swiper
  window.relatedProductsSwiper = new Swiper('#related-products-swiper', {
    // Basic configuration
    loop: false,
    autoplay: false,
    
    // Responsive breakpoints
    breakpoints: {
      // Mobile (up to 767px) - 1 slide
      0: {
        slidesPerView: 1,
        spaceBetween: 10,
        centeredSlides: true,
      },
      // Small tablet (768px and up) - 2 slides  
      768: {
        slidesPerView: 2,
        spaceBetween: 15,
        centeredSlides: false,
      }
    },
    
    // Navigation arrows
    navigation: {
      nextEl: '.related-products-swiper .swiper-button-next',
      prevEl: '.related-products-swiper .swiper-button-prev',
    },
    
    // Pagination dots
    pagination: {
      el: '.related-products-swiper .swiper-pagination',
      clickable: true,
      dynamicBullets: true,
    },
    
    // Touch/swipe settings
    touchEventsTarget: 'container',
    simulateTouch: true,
    allowTouchMove: true,
    touchStartPreventDefault: false,
    
    // Additional options
    grabCursor: true,
    watchOverflow: true,
    
    // Keyboard navigation
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    
    // Accessibility
    a11y: {
      enabled: true,
      prevSlideMessage: 'Previous product',
      nextSlideMessage: 'Next product',
    }
  });
}

// Function to setup Related Yowah Nuts section (Dual Layout: Grid + Swiper)
async function setupRelatedYowahNuts() {
  // Get the related section element first
  const relatedSection = document.getElementById('related-yowah-nuts-section');
  
  // Check if current product is a Yowah Nut
  if (!productId || !productId.startsWith('yn')) {
    // Not a Yowah Nut - ensure section is hidden
    if (relatedSection) {
      relatedSection.classList.add('hidden');
      relatedSection.style.display = 'none';
    }
    return; // Not a Yowah Nut, exit early
  }

  try {
    const products = await getProductData();
    
    // Filter all Yowah Nut products (product IDs starting with 'yn')
    const yowahNuts = products.filter(item => 
      item["product id"] && 
      item["product id"].startsWith('yn')
    );

    if (yowahNuts.length === 0) {
      // No Yowah Nuts to show - hide the section
      if (relatedSection) {
        relatedSection.classList.add('hidden');
        relatedSection.style.display = 'none';
      }
      return; // No Yowah Nuts to show
    }

    // Group by product ID to get unique products
    const uniqueYowahNuts = [];
    const seenIds = new Set();
    
    yowahNuts.forEach(item => {
      const id = item["product id"].trim();
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueYowahNuts.push(item);
      }
    });

    // Sort by product ID and limit to first 4 products
    uniqueYowahNuts.sort((a, b) => a["product id"].localeCompare(b["product id"]));
    const displayProducts = uniqueYowahNuts.slice(0, 4);

    // Show the related products section
    if (relatedSection) {
      relatedSection.classList.remove('hidden');
      relatedSection.style.display = 'block';
    }

    // Generate the related products HTML for both layouts
    const gridWrapper = document.getElementById('related-yowah-nuts-wrapper');
    const swiperWrapper = document.getElementById('related-yowah-nuts-swiper-wrapper');
    
    if (!gridWrapper || !swiperWrapper) return;

    // Get cart data to calculate stock
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Clear existing content
    gridWrapper.innerHTML = '';
    swiperWrapper.innerHTML = '';

    displayProducts.forEach(product => {
      // Calculate available stock
      const cartItem = cart.find(item => 
        item.id === product["product id"] && 
        item.weight === product.weight && 
        item.unit === product.unit
      );
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const availableStock = product.stock - cartQuantity;
      
      // Determine stock status
      let stockClass = availableStock > 0 ? 'in-stock' : 'out-of-stock';
      let stockText = availableStock > 0 ? `${availableStock} in stock` : 'Out of stock';
      
      // Extract size info from product name for cleaner display
      let sizeInfo = '';
      const name = product["product name"];
      if (name.includes('Large')) {
        if (name.includes('Extra Large')) {
          sizeInfo = '1001-1750ct';
        } else {
          sizeInfo = '501-1000ct';
        }
      } else if (name.includes('Medium')) {
        sizeInfo = '150-500ct';
      } else if (name.includes('Small')) {
        sizeInfo = '≤150ct';
      }
      
      // Add pack info if applicable
      if (name.includes('3 Pack')) {
        sizeInfo += ' (3 Pack)';
      } else if (name.includes('Single')) {
        sizeInfo += ' (Single)';
      }

      // Create card HTML content
      const cardContent = `
        <img src="${product["image url"] || 'images/placeholder.png'}" 
             alt="${product["product name"]}" 
             class="related-product-image"
             loading="lazy">
        <div class="related-product-name">${product["product name"]}</div>
        <div class="related-product-size">${sizeInfo}</div>
        <div class="related-product-price">$${parseFloat(product["total price"]).toFixed(2)}</div>
        <div class="related-product-stock ${stockClass}">${stockText}</div>
      `;

      // Create grid card
      const gridCard = document.createElement('div');
      gridCard.className = 'yowah-card';
      gridCard.innerHTML = cardContent;
      gridCard.style.cursor = 'pointer';
      gridCard.addEventListener('click', () => {
        window.location.href = `view-product.html?productid=${product["product id"]}`;
      });
      gridWrapper.appendChild(gridCard);

      // Create swiper slide
      const swiperSlide = document.createElement('div');
      swiperSlide.className = 'swiper-slide';
      const swiperCard = document.createElement('div');
      swiperCard.className = 'yowah-card';
      swiperCard.innerHTML = cardContent;
      swiperCard.style.cursor = 'pointer';
      swiperCard.addEventListener('click', () => {
        window.location.href = `view-product.html?productid=${product["product id"]}`;
      });
      swiperSlide.appendChild(swiperCard);
      swiperWrapper.appendChild(swiperSlide);
    });

    // Initialize Swiper for mobile layout
    initializeRelatedYowahNutsSwiper();

  } catch (error) {
    console.error("Error setting up related Yowah Nuts:", error);
  }
}

// Function to initialize Swiper for related Yowah Nuts
function initializeRelatedYowahNutsSwiper() {
  // Destroy existing swiper if it exists
  if (window.relatedYowahNutsSwiper) {
    window.relatedYowahNutsSwiper.destroy(true, true);
  }

  // Initialize new swiper
  window.relatedYowahNutsSwiper = new Swiper('#related-yowah-nuts-swiper', {
    // Basic configuration
    loop: false,
    autoplay: false,
    
    // Responsive breakpoints
    breakpoints: {
      // Mobile (up to 767px) - 1 slide
      0: {
        slidesPerView: 1,
        spaceBetween: 10,
        centeredSlides: true,
      },
      // Small tablet (768px and up) - 2 slides  
      768: {
        slidesPerView: 2,
        spaceBetween: 15,
        centeredSlides: false,
      }
    },
    
    // Navigation arrows
    navigation: {
      nextEl: '.related-yowah-nuts-swiper .swiper-button-next',
      prevEl: '.related-yowah-nuts-swiper .swiper-button-prev',
    },
    
    // Pagination dots
    pagination: {
      el: '.related-yowah-nuts-swiper .swiper-pagination',
      clickable: true,
      dynamicBullets: true,
    },
    
    // Touch/swipe settings
    touchEventsTarget: 'container',
    simulateTouch: true,
    allowTouchMove: true,
    touchStartPreventDefault: false,
    
    // Additional options
    grabCursor: true,
    watchOverflow: true,
    
    // Keyboard navigation
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    
    // Accessibility
    a11y: {
      enabled: true,
      prevSlideMessage: 'Previous Yowah Nut',
      nextSlideMessage: 'Next Yowah Nut',
    }
  });
}

// Email Notification Modal Functions
function openEmailNotificationModal() {
  const modal = document.getElementById('email-notification-modal');
  const form = document.getElementById('email-notification-form');
  const successMessage = document.getElementById('email-success-message');
  
  // Reset form and show form, hide success message
  if (form) {
    form.style.display = 'block';
    form.reset();
  }
  if (successMessage) {
    successMessage.classList.add('hidden-element');
  }
  
  // Populate hidden fields with current product details
  populateEmailFormFields();
  
  // Show modal
  if (modal) {
    modal.style.display = 'block';
    // Focus on name input field
    setTimeout(() => {
      const nameInput = document.getElementById('notification-name');
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }
}

function closeEmailNotificationModal() {
  const modal = document.getElementById('email-notification-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function populateEmailFormFields() {
  const selectedIndex = parseInt(variationSelector.value, 10);
  const selectedVariation = variations[selectedIndex];
  
  if (selectedVariation) {
    // Populate hidden fields
    const productIdField = document.getElementById('notification-product-id');
    const productNameField = document.getElementById('notification-product-name');
    const productSizeField = document.getElementById('notification-product-size');
    const productPriceField = document.getElementById('notification-product-price');
    
    if (productIdField) productIdField.value = productId;
    if (productNameField) productNameField.value = selectedVariation["product name"];
    if (productSizeField) productSizeField.value = `${selectedVariation.weight} ${selectedVariation.unit}`;
    if (productPriceField) productPriceField.value = selectedVariation["total price"];
  }
}

function setupEmailNotificationModal() {
  const modal = document.getElementById('email-notification-modal');
  const closeBtn = document.querySelector('.email-modal-close');
  const form = document.getElementById('email-notification-form');
  const successMessage = document.getElementById('email-success-message');
  
  // Close modal when clicking X
  if (closeBtn) {
    closeBtn.addEventListener('click', closeEmailNotificationModal);
  }
  
  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeEmailNotificationModal();
      }
    });
  }
  
  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
      closeEmailNotificationModal();
    }
  });
  
  // Handle form submission
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Honeypot spam protection
      const honeypot = document.getElementById('notification-website');
      if (honeypot && honeypot.value.trim() !== '') {
        console.log('Spam submission blocked by honeypot');
        // Show fake success message to confuse bots
        form.style.display = 'none';
        successMessage.classList.remove('hidden-element');
        setTimeout(() => {
          closeEmailNotificationModal();
        }, 2000);
        return;
      }
      
      const submitBtn = form.querySelector('.email-submit-btn');
      const originalText = submitBtn.textContent;
      
      // Show loading state
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      
      try {
        // Create FormData object
        const formData = new FormData(form);
        
        // Add custom message
        const productName = formData.get('product_name');
        const productSize = formData.get('product_size');
        const customerEmail = formData.get('email');
        const customerName = formData.get('name');
        
        const customMessage = `Stock Notification Request:
        
Customer: ${customerName}
Email: ${customerEmail}
Product: ${productName}
Size: ${productSize}

Please notify this customer when the above item is back in stock.`;
        
        formData.set('message', customMessage);
        
        // Submit to form handler
        const response = await fetch('form-to-email.php', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          // Show success message
          form.style.display = 'none';
          successMessage.classList.remove('hidden-element');
          
          // Auto-close modal after 3 seconds
          setTimeout(() => {
            closeEmailNotificationModal();
          }, 3000);
        } else {
          throw new Error('Network response was not ok');
        }
        
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your request. Please try again or contact us directly.');
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

// Initialize email notification modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupEmailNotificationModal();
});
