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

// Dynamically load the side menu HTML
fetch("side-menu.html")
  .then(response => response.text())
  .then(html => {
    document.getElementById("side-menu-container").innerHTML = html;
    // Dynamically load side-menu.js AFTER the HTML is present
    const script = document.createElement('script');
    script.src = 'side-menu.js';
    script.onload = () => {
      // Now that side-menu.js is loaded, initialize the menu
      if (typeof fetchAndLoadMenu === "function") {
        fetchAndLoadMenu();
      }
      if (typeof setupSideMenuListeners === "function") {
        setupSideMenuListeners();
      }
    };
    document.body.appendChild(script);
  });

  // Add this function just before your fetchProductDetails function
function highlightNavigation(category) {
  if (!category) return;
  
  const mainCategory = category.split(',')[0].split('-')[0].toLowerCase();
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
    updateMetaTags(currentVariation); // Add this line
    injectProductSchema(currentVariation);

    // Add this line to highlight navigation based on the category
    if (variations[0] && variations[0].category) {
      highlightNavigation(variations[0].category);
    }
    
    

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
    
    //Escape to synthetic level if mix CZ & Spinel bag
    if (category && continueLink && continueBtn) {
      if (category == 'synthetic-spinel,synthetic-cubic-zirconia') {
        continueLink.href = `products.html?category=synthetic`;
      }
      else {
      continueLink.href = `products.html?category=${encodeURIComponent(category)}`;}
      continueBtn.textContent = `Continue Shopping`;
    }

  } catch (error) {
    console.error("Error fetching product details:", error);
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
        if (mainImage) {
          mainImage.src = apiImage;
          mainImage.setAttribute("loading", "lazy"); // Add this line
        }

        // Render thumbnails
        thumbnailsContainer.innerHTML = "";
        allThumbs.forEach((imgUrl, idx) => {
          const thumb = document.createElement("img");
          thumb.src = imgUrl;
          thumb.alt = `Thumbnail ${idx + 1}`;
          thumb.className = "view-product-image-placeholder";
          thumb.style.cursor = "pointer";
          thumb.loading = "lazy"; // Add this line
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
}

fetchProductDetails();

// Product SEO meta mapping for enhanced optimization
const productSEOMeta = {
  // Synthetic Spinel Products
  "s104": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Brilliant clarity, vibrant color. {weight}{unit} available at ${price}. Perfect for collectors and lapidary enthusiasts.",
    keywords: "synthetic spinel, silver blue spinel, faceting rough, lapidary, gemstone cutting, Australian gems",
    image: "https://outbackgems.com.au/images/main/s104.jpeg",
    altText: "Silver Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s105": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Soft pale blue clarity. {weight}{unit} available at ${price}. Ideal for faceting and lapidary projects.",
    keywords: "synthetic spinel, powder blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s105.jpeg",
    altText: "Powder Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s106": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Crisp icy blue clarity. {weight}{unit} available at ${price}. Outstanding for faceting projects.",
    keywords: "synthetic spinel, ice blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s106.jpeg",
    altText: "Ice Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s107": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Clear summer sky blue. {weight}{unit} available at ${price}. Perfect for faceting and lapidary.",
    keywords: "synthetic spinel, sky blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s107.jpeg",
    altText: "Sky Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s112": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Rich deep blue hue with excellent clarity. {weight}{unit} at ${price}. Ideal for collectors.",
    keywords: "synthetic spinel, royal blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s112.jpeg",
    altText: "Royal Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s113": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Classic sapphire-blue with vibrant clarity. {weight}{unit} at ${price}. Perfect for faceting.",
    keywords: "synthetic spinel, sapphire blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s113.jpeg",
    altText: "Sapphire Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s114": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Dark midnight blue with excellent clarity. {weight}{unit} at ${price}. Ideal for lapidary.",
    keywords: "synthetic spinel, midnight blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s114.jpeg",
    altText: "Midnight Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s119": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Vibrant ocean blue with great clarity. {weight}{unit} at ${price}. Perfect for faceting.",
    keywords: "synthetic spinel, ocean blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s119.jpeg",
    altText: "Ocean Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "s120": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Synthetic Spinel | Outback Gems & Minerals",
    description: "Premium {color} synthetic spinel faceting rough. Subtle blue-grey tone with high clarity. {weight}{unit} at ${price}. Ideal for lapidary.",
    keywords: "synthetic spinel, slate blue spinel, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/s120.jpeg",
    altText: "Slate Blue Synthetic Spinel faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Cubic Zirconia Products
  "cz001": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium {color} cubic zirconia faceting rough. Warm golden color with excellent clarity. {weight}{unit} at ${price}. Perfect for faceting projects.",
    keywords: "cubic zirconia, champagne CZ, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/CZ-Champagne.jpeg",
    altText: "Champagne Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz002": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium {color} cubic zirconia faceting rough. Delicate lavender hue with brilliant clarity. {weight}{unit} at ${price}. Ideal for faceting.",
    keywords: "cubic zirconia, lavender CZ, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/CZ-Lavender.jpeg",
    altText: "Lavender Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz003": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium {color} cubic zirconia faceting rough. Vibrant golden yellow with high clarity. {weight}{unit} at ${price}. Perfect for lapidary.",
    keywords: "cubic zirconia, golden yellow CZ, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/CZ-Golden.jpeg",
    altText: "Golden Yellow Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "cz004": {
    titleTemplate: "Buy {name} {weight}{unit} Faceting Rough - ${price} | Premium Cubic Zirconia | Outback Gems & Minerals",
    description: "Premium {color} cubic zirconia faceting rough. Bright orange color with excellent clarity. {weight}{unit} at ${price}. Ideal for faceting.",
    keywords: "cubic zirconia, orange CZ, faceting rough, lapidary, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/CZ-Orange.jpeg",
    altText: "Orange Cubic Zirconia faceting rough - Premium gemstone for lapidary projects at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Natural Zircon Products
  "hzr002": {
    titleTemplate: "Buy {name} 300ct Bag - ${price} | Natural Zircon from Harts Range NT | Outback Gems & Minerals",
    description: "300ct bag of mixed natural zircons from Harts Range, NT. Colorful assortment in various shapes and sizes. Perfect for lapidary practice at ${price}.",
    keywords: "natural zircon, Harts Range zircon, Australian gemstones, lapidary supplies, NT minerals",
    image: "https://outbackgems.com.au/images/main/hzr002.jpeg",
    altText: "Natural Zircon crystals from Harts Range NT - Premium Australian gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Natural-Zircon.jpeg",
    categoryAltText: "Natural zircon rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "hzr003": {
    titleTemplate: "Buy {name} 145ct Bag - ${price} | Natural Zircon from Harts Range NT | Outback Gems & Minerals",
    description: "145ct bag of mixed natural zircons from Harts Range, NT. Various colors suitable for faceting. Premium quality at ${price}.",
    keywords: "natural zircon, Harts Range zircon, Australian gemstones, faceting material, NT minerals",
    image: "https://outbackgems.com.au/images/main/hzr003.jpeg",
    altText: "Natural Zircon crystals from Harts Range NT - Premium Australian gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Natural-Zircon.jpeg",
    categoryAltText: "Natural zircon rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  
  // Amethyst Products
  "waam001": {
    titleTemplate: "Buy {name} 1200ct Bag - ${price} | Natural Amethyst from WA | Outback Gems & Minerals",
    description: "1200ct bag of natural amethyst crystals from Western Australia. Beautiful purple shades for display at ${price}. Premium Australian minerals.",
    keywords: "natural amethyst, WA amethyst, Australian minerals, purple crystals, display specimens",
    image: "https://outbackgems.com.au/images/main/waam001.jpeg",
    altText: "Natural Western Australian Amethyst crystals - Premium purple gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Amethyst.jpeg",
    categoryAltText: "Natural amethyst specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  "waam002": {
    titleTemplate: "Buy {name} 1000ct Bag - ${price} | Natural Amethyst from WA | Outback Gems & Minerals",
    description: "1000ct bag of natural amethyst from WA. Various shapes and shades from clear to deep purple. Perfect for collections at ${price}.",
    keywords: "natural amethyst, WA amethyst, Australian minerals, purple quartz, crystal specimens",
    image: "https://outbackgems.com.au/images/main/waam002.jpeg",
    altText: "Natural Western Australian Amethyst crystals - Premium purple gemstones at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Amethyst.jpeg",
    categoryAltText: "Natural amethyst specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Smoky Quartz
  "sq002": {
    titleTemplate: "Buy {name} 108ct Crystal - ${price} | Natural Smoky Quartz from Mooralla VIC | Outback Gems & Minerals",
    description: "Beautiful 108ct smoky quartz crystal from Mooralla, Victoria. Well-defined crystal structure. Outstanding display piece at ${price}.",
    keywords: "smoky quartz, Mooralla quartz, Victorian minerals, crystal specimens, display crystals",
    image: "https://outbackgems.com.au/images/main/sq002.jpeg",
    altText: "Natural Smoky Quartz crystal from Mooralla VIC - Premium crystal specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Smoky-Quartz.jpeg",
    categoryAltText: "Natural smoky quartz specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Mixed Faceting Bags
  "fb001": {
    titleTemplate: "Buy {name} 1000ct Bulk Bag - ${price} | Mixed Cubic Zirconia Faceting Rough | Outback Gems & Minerals",
    description: "1000ct bulk bag of mixed cubic zirconia. Various colors and sizes for faceting practice. Great value at ${price}.",
    keywords: "bulk cubic zirconia, faceting practice, mixed CZ rough, lapidary supplies, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/fb001.jpeg",
    altText: "Mixed Cubic Zirconia bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-CZ.jpeg",
    categoryAltText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "fb002": {
    titleTemplate: "Buy {name} 300ct Bulk Bag - ${price} | Mixed Synthetic Spinel Faceting Rough | Outback Gems & Minerals",
    description: "300ct bulk bag of mixed synthetic spinel. Various colors and sizes for faceting practice. Excellent value at ${price}.",
    keywords: "bulk synthetic spinel, faceting practice, mixed spinel rough, lapidary supplies",
    image: "https://outbackgems.com.au/images/main/fb002.jpeg",
    altText: "Mixed Synthetic Spinel bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "fb003": {
    titleTemplate: "Buy {name} 500ct Bulk Bag - ${price} | Mixed CZ & Spinel Faceting Rough | Outback Gems & Minerals",
    description: "500ct bulk bag of mixed cubic zirconia and synthetic spinel. Various colors for faceting practice. Perfect value at ${price}.",
    keywords: "bulk faceting rough, mixed CZ spinel, faceting practice, lapidary supplies, gemstone cutting",
    image: "https://outbackgems.com.au/images/main/fb003.jpeg",
    altText: "Mixed CZ & Spinel bulk faceting rough - Premium lapidary supplies at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    categoryAltText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  
  // Agate Products
  "as001": {
    titleTemplate: "Buy {name} - ${price} | Thunder Egg Agate Slice from Agate Creek QLD | Outback Gems & Minerals",
    description: "Thunder egg agate slice from Agate Creek, QLD. Vivid red swirls with crystalline sections. Unpolished specimen at ${price}.",
    keywords: "agate slice, thunder egg, Agate Creek QLD, Australian agate, mineral specimens",
    image: "https://outbackgems.com.au/images/main/Other-Agate-Slice.jpeg",
    altText: "Thunder Egg Agate Slice from Agate Creek QLD - Premium Australian mineral specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Agate-Slice.jpeg",
    categoryAltText: "Natural agate slice specimens - Premium Australian minerals at Outback Gems & Minerals"
  },
  
  // Sapphire Washbags
  "sw001": {
    titleTemplate: "Buy {name} 1kg Bag - ${price} | Sapphire Fossicking from Queensland Gemfields | Outback Gems & Minerals",
    description: "1kg sapphire washbag from Queensland Gemfields. Includes bonus cut sapphire. Home fossicking experience at ${price}.",
    keywords: "sapphire washbag, Queensland sapphires, fossicking, gemfield dirt, sapphire hunting",
    image: "https://outbackgems.com.au/images/main/sw001.jpeg",
    altText: "Queensland Sapphire Washbag - Premium fossicking experience from Queensland Gemfields at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Washbag.jpeg",
    categoryAltText: "Sapphire washbag specimens - Premium fossicking supplies at Outback Gems & Minerals"
  },
  
  // Yowah Nuts
  "yn001": {
    titleTemplate: "Buy {name} 501-1000ct - ${price} | Large Unopened Yowah Nut from QLD | Outback Gems & Minerals",
    description: "Large unopened Yowah Nut (501-1000ct) from Queensland opal fields. Chance at precious opal discovery. Exciting find at ${price}.",
    keywords: "Yowah nut, Queensland opal, unopened ironstone, opal hunting, opal nuts",
    image: "https://outbackgems.com.au/images/main/yn001.jpeg",
    altText: "Large Unopened Yowah Nut from Queensland - Premium opal hunting specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Yowah-Nuts.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn002": {
    titleTemplate: "Buy {name} 150-500ct - ${price} | Medium Unopened Yowah Nut from QLD | Outback Gems & Minerals",
    description: "Medium unopened Yowah Nut (150-500ct) from Queensland opal fields. Perfect for opal hunting enthusiasts at ${price}.",
    keywords: "Yowah nut, Queensland opal, unopened ironstone, opal hunting, medium opal nuts",
    image: "https://outbackgems.com.au/images/main/yn002.jpeg",
    altText: "Medium Unopened Yowah Nut from Queensland - Premium opal hunting specimen at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Yowah-Nuts.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  "yn003": {
    titleTemplate: "Buy {name} 3-Pack - ${price} | Medium Unopened Yowah Nuts from QLD | Outback Gems & Minerals",
    description: "3-pack of medium Yowah Nuts (150-500ct each) from Queensland. Increase your opal discovery chances at ${price}.",
    keywords: "Yowah nut pack, Queensland opal, unopened ironstone, opal hunting, value pack",
    image: "https://outbackgems.com.au/images/main/yn003.jpeg",
    altText: "3-Pack Medium Yowah Nuts from Queensland - Premium opal hunting value pack at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/Other-Yowah-Nuts.jpeg",
    categoryAltText: "Yowah nut specimens - Premium opal hunting supplies at Outback Gems & Minerals"
  },
  
  // Tumbles
  "tb001": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Quartz Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of quartz tumbles. Milky white to clear varieties. Perfect for collectors and crafts at ${price}.",
    keywords: "quartz tumbles, tumbled stones, crystal specimens, craft supplies, clear quartz",
    image: "https://outbackgems.com.au/images/main/tb001.jpeg",
    altText: "Quartz Tumbled Stones 100g bag - Premium crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  "tb002": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Amethyst Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of amethyst tumbles. Beautiful purple hues from pale lilac to deep violet. Ideal for jewelry making at ${price}.",
    keywords: "amethyst tumbles, purple tumbles, tumbled stones, jewelry supplies, crystal specimens",
    image: "https://outbackgems.com.au/images/main/other-amethyst-tumbles.jpeg",
    altText: "Amethyst Tumbled Stones 100g bag - Premium purple crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  "tb003": {
    titleTemplate: "Buy {name} 100g Bag - ${price} | Agate Tumbled Stones | Outback Gems & Minerals",
    description: "100g bag of colorful agate tumbles. Natural banded patterns in vibrant colors. Great for jewelry making at ${price}.",
    keywords: "agate tumbles, banded agate, tumbled stones, jewelry supplies, decorative stones",
    image: "https://outbackgems.com.au/images/main/other-agate-tumbles.jpeg",
    altText: "Agate Tumbled Stones 100g bag - Premium banded crystal specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    categoryAltText: "Tumbled stone specimens - Premium crystal collections at Outback Gems & Minerals"
  },
  
  // Herkimer Diamonds
  "hd001": {
    titleTemplate: "Buy {name} 100g - ${price} | Natural Herkimer Diamond Quartz Crystals | Outback Gems & Minerals",
    description: "100g of natural Herkimer Diamonds from New York. Exceptional double-terminated quartz crystals. Unique formation at ${price}.",
    keywords: "Herkimer diamonds, double terminated quartz, New York crystals, facetable crystals, specimen crystals",
    image: "https://outbackgems.com.au/images/main/other-herkimer-diamonds.jpeg",
    altText: "Natural Herkimer Diamond Quartz Crystals - Premium double-terminated specimens at Outback Gems & Minerals",
    categoryImage: "https://outbackgems.com.au/images/category-cards/other-herkimer-diamonds.jpeg",
    categoryAltText: "Herkimer diamond specimens - Premium quartz crystals at Outback Gems & Minerals"
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

// Enhanced meta tags function with product-specific optimization
function updateMetaTags(product) {
  if (!product) return;
  
  const productMeta = productSEOMeta[productId];
  const color = extractColor(product["product name"]);
  const stockStatus = product.stock > 0 ? 'In Stock' : 'Out of Stock';
  const stockText = product.stock > 0 ? ` ${stockStatus} -` : ` ${stockStatus}.`;
  
  let title, description, ogImage, altText;
  
  if (productMeta) {
    // Use optimized templates with dynamic data
    title = productMeta.titleTemplate
      .replace('{name}', product["product name"])
      .replace('{weight}', product.weight)
      .replace('{unit}', product.unit)
      .replace('{color}', color)
      .replace('${price}', product["total price"].toFixed(2));
      
    description = productMeta.description
      .replace('{name}', product["product name"])
      .replace('{weight}', product.weight)
      .replace('{unit}', product.unit)
      .replace('{color}', color)
      .replace('${price}', product["total price"].toFixed(2)) + stockText + " Shop online at Outback Gems & Minerals.";
    
    // Use product-specific image, fallback to API image, then category image
    ogImage = productMeta.image || product["image url"] || productMeta.categoryImage || 'https://outbackgems.com.au/images/general/Facebook%20Logo.jpg';
    altText = productMeta.altText || `${product["product name"]} ${product.weight}${product.unit} - Premium ${color || 'gemstone'} specimen at Outback Gems & Minerals`;
  } else {
    // Fallback for products not in mapping
    title = `Buy ${product["product name"]} ${product.weight}${product.unit} - $${product["total price"].toFixed(2)} | Outback Gems & Minerals`;
    description = `${product.description || 'Premium gemstone product'}${stockText} Available for $${product["total price"].toFixed(2)}. Shop online at Outback Gems & Minerals.`;
    ogImage = product["image url"] || 'https://outbackgems.com.au/images/general/Facebook%20Logo.jpg';
    altText = `${product["product name"]} ${product.weight}${product.unit} - Premium ${color || 'gemstone'} specimen at Outback Gems & Minerals`;
  }

  document.title = title;

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
  const keywords = productMeta?.keywords || 'gemstones, minerals, crystals, specimen details, gem pricing, faceting rough';
  metaKeywords.setAttribute('content', keywords);

  // Open Graph
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', description);
  
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
  
  let ogImageMeta = document.querySelector('meta[property="og:image"]');
  if (!ogImageMeta) {
    ogImageMeta = document.createElement('meta');
    ogImageMeta.setAttribute('property', 'og:image');
    document.head.appendChild(ogImageMeta);
  }
  ogImageMeta.setAttribute('content', ogImage);
  
  // Twitter Cards
  let twitterCard = document.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) {
    twitterCard = document.createElement('meta');
    twitterCard.setAttribute('name', 'twitter:card');
    document.head.appendChild(twitterCard);
  }
  twitterCard.setAttribute('content', 'summary_large_image');

  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (!twitterTitle) {
    twitterTitle = document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    document.head.appendChild(twitterTitle);
  }
  twitterTitle.setAttribute('content', title);
  
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (!twitterImage) {
    twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    document.head.appendChild(twitterImage);
  }
  twitterImage.setAttribute('content', ogImage);
  
  let twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (!twitterDesc) {
    twitterDesc = document.createElement('meta');
    twitterDesc.setAttribute('name', 'twitter:description');
    document.head.appendChild(twitterDesc);
  }
  twitterDesc.setAttribute('content', description);

  let twitterUrl = document.querySelector('meta[name="twitter:url"]');
  if (!twitterUrl) {
    twitterUrl = document.createElement('meta');
    twitterUrl.setAttribute('name', 'twitter:url');
    document.head.appendChild(twitterUrl);
  }
  twitterUrl.setAttribute('content', `https://outbackgems.com.au/view-product.html?productid=${productId}`);
  
  // Add canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', `https://outbackgems.com.au/view-product.html?productid=${productId}`);

  // Enhanced image alt text using product-specific alt text
  if (productImageElement) {
    productImageElement.alt = altText;
  }
}

// Modal image expand setup (add this after fetchProductDetails();)
document.addEventListener("DOMContentLoaded", function() {
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

