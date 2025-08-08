// Dynamically load the side menu first
fetch("side-menu.html")
  .then(response => response.text())
  .then(html => {
    document.getElementById("side-menu-container").innerHTML = html;
    // Now dynamically load side-menu.js AFTER the HTML is present
    const script = document.createElement('script');
    script.src = 'side-menu.js';
    script.onload = () => {
      // Now that side-menu.js is loaded, fetchAndLoadMenu will run and work as expected
      if (typeof fetchAndLoadMenu === "function") {
        fetchAndLoadMenu();
      }
      if (typeof setupSideMenuListeners === "function") {
        setupSideMenuListeners();
      }
    };
    document.body.appendChild(script);

    // Function to show description tooltip expansion
    function showDescriptionExpansion(fullText, productTitle, descriptionElement) {
      // Create tooltip overlay
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        background-color: #444;
        border: 2px solid #cc5500;
        border-radius: 8px;
        padding: 12px 15px;
        width: calc(100% - 36px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
        z-index: 1000;
        color: #bfbfbfd2;
        font-size: 1.1rem;
        line-height: 1.4;
        pointer-events: auto;
        left: 50%;
        transform: translateX(-50%);
        text-align: left;
      `;
      
      // Add the full text
      tooltip.textContent = fullText;
      
      // Position the tooltip centered horizontally and above the button
      const card = descriptionElement.closest('.dynamic-product-card');
      const button = card.querySelector('.dynamic-product-button');
      const buttonRect = button.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      
      // Position it above the button with some spacing
      const buttonTopRelativeToCard = buttonRect.top - cardRect.top;
      tooltip.style.bottom = (550 - buttonTopRelativeToCard + 10) + 'px'; // 10px gap above button
      
      // Add the tooltip to the card (which has position: relative)
      card.appendChild(tooltip);
      
      // Close when clicking anywhere (including on the tooltip itself)
      const closeTooltip = (e) => {
        if (card.contains(tooltip)) {
          card.removeChild(tooltip);
        }
        document.removeEventListener('click', closeTooltip);
      };
      
      // Add slight delay before adding listener to prevent immediate closure
      setTimeout(() => {
        document.addEventListener('click', closeTooltip);
      }, 50);
    }

    // Function to handle description overflow
    function handleDescriptionOverflow(descriptionElement, originalText) {
      // Wait for the element to be fully rendered
      setTimeout(() => {
        // Calculate actual line height based on CSS: 1.1rem * 1.4 line-height
        const computedStyle = window.getComputedStyle(descriptionElement);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualLineHeight = lineHeight || (fontSize * 1.4);
        
        // Set original text to measure actual height
        descriptionElement.textContent = originalText;
        const originalHeight = descriptionElement.scrollHeight;
        
        // Calculate maximum height for 4 complete lines
        const maxHeight = actualLineHeight * 4;
        
        // Only truncate if text actually exceeds 4 lines by a meaningful margin
        if (originalHeight > maxHeight + 5) { // +5px buffer to avoid edge cases
          const words = originalText.split(' ');
          let bestFitText = '';
          
          // Find the longest text that fits within 4 lines
          for (let i = 1; i <= words.length; i++) {
            const testText = words.slice(0, i).join(' ') + '...';
            descriptionElement.textContent = testText;
            
            if (descriptionElement.scrollHeight > maxHeight) {
              // This word made it too long, use the previous iteration
              bestFitText = words.slice(0, Math.max(1, i - 1)).join(' ');
              break;
            }
          }
          
          if (bestFitText) {
            // Clear and rebuild with truncated text + Read More
            descriptionElement.innerHTML = '';
            descriptionElement.appendChild(document.createTextNode(bestFitText + '... '));
            
            // Create "Read More" link
            const readMoreLink = document.createElement('span');
            readMoreLink.textContent = 'Read More';
            readMoreLink.style.color = '#cc5500';
            readMoreLink.style.cursor = 'pointer';
            readMoreLink.style.textDecoration = 'underline';
            readMoreLink.style.fontWeight = 'bold';
            
            descriptionElement.appendChild(readMoreLink);
            
            // Add click handler for "Read More" - show tooltip expansion
            readMoreLink.onclick = (e) => {
              e.stopPropagation();
              showDescriptionExpansion(originalText, descriptionElement.closest('.dynamic-product-card').querySelector('h3').textContent, descriptionElement);
            };
          }
        } else {
          // Ensure original text is displayed
          descriptionElement.textContent = originalText;
        }
      }, 10);
    }

    // --- Product loading logic STARTS here ---
    const productContainer = document.getElementById("dynamic-product-container");
    const productHeader = document.querySelector(".dynamic-product-header-title");

    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }

    // Add this function after the getQueryParam function in products.js
    // Combine your duplicate setupCanonicalUrl function references
    function setupCanonicalUrl() {
      const categoryKeyword = getQueryParam("category");
      
      // Find existing canonical link or create a new one
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      
      // Set the appropriate URL based on whether there's a category
      if (!categoryKeyword) {
        // Base products page with no category
        canonicalLink.href = 'https://www.outbackgems.com.au/products.html';
      } else {
        // For specific category pages, include the category in the canonical URL
        canonicalLink.href = `https://www.outbackgems.com.au/products.html?category=${encodeURIComponent(categoryKeyword)}`;
      }
    }

    const categoryKeyword = getQueryParam("category");
    setupCanonicalUrl();
    updateCategoryMetaTags(categoryKeyword);

    if (categoryKeyword) {
      loadProductsByCategory(categoryKeyword);
    } else {
      loadProductsByCategory(); // Load all products if no category is specified
    }

    // Add event listeners to side menu toggles (for in-page filtering)
    const sideMenuToggles = document.querySelectorAll(".side-menu-toggle");
    sideMenuToggles.forEach(toggle => {
      toggle.addEventListener("click", function () {
        const categoryKeyword = this.getAttribute("data-category");
        // Update the URL dynamically without reloading the page
        const newUrl = `${window.location.pathname}?category=${encodeURIComponent(categoryKeyword)}`;
        history.pushState({ category: categoryKeyword }, "", newUrl);
        setupCanonicalUrl(); // Update the canonical URL
        loadProductsByCategory(categoryKeyword);
      });
    });

    //function to only load unique product ids on the product grid
    function getUniqueByProductId(products) {
    const seen = new Set();
    return products.filter(product => {
      if (seen.has(product["product id"])) {
        return false;
      }
      seen.add(product["product id"]);
      return true;
    });
    }

    // Function to load products by category keyword
    function loadProductsByCategory(keyword = null) {
      productContainer.innerHTML = "<p>Loading products...</p>";

      getProductData()
        .then(data => {
          if (data && data.length > 0) {
            let filteredProducts;
            if (keyword) {
              filteredProducts = data.filter(product => {
                const categories = (product.category || "").split(",").map(c => c.trim());
                return categories.some(cat => cat.includes(keyword));
              });
            } else {
              filteredProducts = data;
            }

            // Only keep unique product ids
        filteredProducts = getUniqueByProductId(filteredProducts);

           // Sort alphabetically by product name
          filteredProducts.sort((a, b) => {
            const nameA = (a["product name"] || "").toLowerCase();
            const nameB = (b["product name"] || "").toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
          });

            const headerTitle = keyword ? formatCategoryHeader(keyword) : "All Products";
            displayProducts(filteredProducts, headerTitle, keyword, data);
          } else {
            productContainer.innerHTML = "<p>No products found.</p>";
          }
        })
        .catch(error => {
          console.error("Error fetching product data:", error);
          productContainer.innerHTML = "<p style='color: red;'>Failed to load products. Please try again later.</p>";
        });
    }

    const PRODUCTS_PER_PAGE = 6;
    let currentPage = 1;
    let currentProducts = [];

    function displayProducts(products, headerTitle, keyword, data, page = 1) {
      currentProducts = products;
      currentPage = page;
      const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
      const startIdx = (page - 1) * PRODUCTS_PER_PAGE;
      const endIdx = startIdx + PRODUCTS_PER_PAGE;
      const productsToShow = products.slice(startIdx, endIdx);

      productContainer.innerHTML = "";

      const headerContainer = document.createElement("div");
headerContainer.className = "dynamic-product-header-container";
const headerTitleH1 = document.createElement("h1");
headerTitleH1.className = "dynamic-product-header-title";
headerTitleH1.textContent = headerTitle;
headerContainer.appendChild(headerTitleH1);
const divider = document.createElement("hr");
divider.className = "product-header-divider";
headerContainer.appendChild(divider);
productContainer.appendChild(headerContainer);

      if (productsToShow.length > 0) {
        productsToShow.forEach(product => {
          const productCard = document.createElement("div");
          productCard.classList.add("dynamic-product-card");

          const imageContainer = document.createElement("div");
          imageContainer.classList.add("image-container");
          const img = document.createElement("img");
          img.src = product["image url"];
          img.alt = product["product name"] || "Product Image";
          img.loading = "lazy"; // <-- Add this line
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];

          // Add size info for Yowah Nuts products
          let sizeElement = null;
          if (product["product id"] && product["product id"].startsWith('yn')) {
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

            if (sizeInfo) {
              sizeElement = document.createElement("div");
              sizeElement.className = "product-size-info";
              sizeElement.textContent = sizeInfo;
              sizeElement.style.cssText = `
                color: #ffb366;
                font-size: 0.9rem;
                font-weight: 600;
                margin: 2px 0 4px 0;
                text-align: center;
              `;
            }
          }

          // Add price display
          const productPrice = document.createElement("p");
          productPrice.className = "product-price";
          productPrice.textContent = calculatePriceDisplay(data, product["product id"]);

          const productDescription = document.createElement("p");
          productDescription.className = "card-description";
          productDescription.textContent = product.description;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "Shop Now";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          
          // Add size element for Yowah Nuts if it exists
          if (sizeElement) {
            productCard.appendChild(sizeElement);
          }
          
          productCard.appendChild(productPrice);
          productCard.appendChild(productDescription);
          productCard.appendChild(productButton);

          productContainer.appendChild(productCard);

          // Handle description overflow after DOM is rendered
          setTimeout(() => {
            handleDescriptionOverflow(productDescription, product.description);
          }, 10);
        });

        // Add ghost cards to maintain grid layout
        const productsShown = productsToShow.length;
        if (productsToShow.length < 4) {
          const ghostCardsNeeded = 3 - productsToShow.length;
          for (let i = 0; i < ghostCardsNeeded; i++) {
            const ghostCard = document.createElement("div");
            ghostCard.className = "dynamic-product-card ghost-card";
            productContainer.appendChild(ghostCard);
          }
        } else {
          const ghostCardsNeeded = 6 - productsShown;
          for (let i = 0; i < ghostCardsNeeded; i++) {
            const ghostCard = document.createElement("div");
            ghostCard.className = "dynamic-product-card ghost-card";
            productContainer.appendChild(ghostCard);
          }
        }

        if (products.length < 4) {
          suggestAdditionalProducts(keyword, products, data);
        }
      } else {
        productContainer.innerHTML += "<p>No products found in this category.</p>";
        suggestAdditionalProducts(keyword, [], data);
      }

      // Pagination controls
      if (totalPages > 1) {
        const pagination = document.createElement("div");
        pagination.className = "pagination-controls";
        if (page > 1) {
          const prevBtn = document.createElement("button");
          prevBtn.textContent = "Previous";
          prevBtn.onclick = () => {
            displayProducts(currentProducts, headerTitle, keyword, data, page - 1);
            document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
          };
          pagination.appendChild(prevBtn);
        }

         // Page number links
  const pageNumbers = document.createElement("span");
  function addPageLink(i) {
    if (i === page) {
      const currentPageSpan = document.createElement("span");
      currentPageSpan.textContent = ` ${i} `;
      pageNumbers.appendChild(currentPageSpan);
    } else {
      const pageLink = document.createElement("a");
      pageLink.href = "#";
      pageLink.textContent = ` ${i} `;
      pageLink.onclick = (e) => {
        e.preventDefault();
        displayProducts(currentProducts, headerTitle, keyword, data, i);
        document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
      };
      pageNumbers.appendChild(pageLink);
    }
  }

  if (totalPages < 5) {
    for (let i = 1; i <= totalPages; i++) {
      addPageLink(i);
    }
  } else {
    // Always show first page
    addPageLink(1);

    // Show ellipsis if needed
    if (page > 3) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = " ... ";
      pageNumbers.appendChild(ellipsis);
    }

    // Show current-1, current, current+1 (if in range)
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
      addPageLink(i);
    }

    // Show ellipsis if needed
    if (page < totalPages - 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = " ... ";
      pageNumbers.appendChild(ellipsis);
    }

    // Always show last page
    addPageLink(totalPages);
  }

  pagination.appendChild(pageNumbers);

        pagination.appendChild(document.createTextNode(` Page ${page} of ${totalPages} `));
        if (page < totalPages) {
          const nextBtn = document.createElement("button");
          nextBtn.textContent = "Next";
          nextBtn.onclick = () => {
            displayProducts(currentProducts, headerTitle, keyword, data, page + 1);
            document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
          };
          pagination.appendChild(nextBtn);
        }

        productContainer.appendChild(pagination);        
      }
    }

    function suggestAdditionalProducts(currentCategory, displayedProducts, data) {
      displayedProducts = displayedProducts || [];
      const displayedProductNames = new Set(displayedProducts.map(product => product["product name"]));
      const broaderCategory = currentCategory ? currentCategory.split("-")[0] : "";
      const filteredSuggestions = data.filter(product =>
        product.category.includes(broaderCategory) && !displayedProductNames.has(product["product name"])
      );
      const shuffledSuggestions = filteredSuggestions.sort(() => 0.5 - Math.random()).slice(0, 3);

      const suggestionContainer = document.createElement("div");
      suggestionContainer.classList.add("suggestion-container");

      const suggestionHeaderContainer = document.createElement("div");
      suggestionHeaderContainer.className = "dynamic-product-header-container";
      const suggestionDivider = document.createElement("hr");
      suggestionDivider.className = "product-header-divider";
      suggestionHeaderContainer.appendChild(suggestionDivider);

      const suggestionHeader = document.createElement("div");
      suggestionHeader.className = "dynamic-product-header-title";
      suggestionHeader.textContent = "You May Also Like";
      suggestionHeaderContainer.appendChild(suggestionHeader);

      suggestionContainer.appendChild(suggestionHeaderContainer);

      if (shuffledSuggestions.length > 0) {
        shuffledSuggestions.forEach(product => {
          const productCard = document.createElement("div");
          productCard.classList.add("dynamic-product-card");

          const imageContainer = document.createElement("div");
          imageContainer.classList.add("image-container");
          const img = document.createElement("img");
          img.src = product["image url"];
          img.alt = product["product name"] || "Product Image";
          img.loading = "lazy";
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];

          // Add size info for Yowah Nuts products in suggestions
          let sizeElement = null;
          if (product["product id"] && product["product id"].startsWith('yn')) {
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

            if (sizeInfo) {
              sizeElement = document.createElement("div");
              sizeElement.className = "product-size-info";
              sizeElement.textContent = sizeInfo;
              sizeElement.style.cssText = `
                color: #ffb366;
                font-size: 0.9rem;
                font-weight: 600;
                margin: 2px 0 4px 0;
                text-align: center;
              `;
            }
          }

          // Add price display for suggestions
          const productPrice = document.createElement("p");
          productPrice.className = "product-price";
          productPrice.textContent = calculatePriceDisplay(data, product["product id"]);

          const productDescription = document.createElement("p");
          productDescription.className = "card-description";
          productDescription.textContent = product.description;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "Shop Now";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          
          // Add size element for Yowah Nuts if it exists in suggestions
          if (sizeElement) {
            productCard.appendChild(sizeElement);
          }
          
          productCard.appendChild(productPrice);
          productCard.appendChild(productDescription);
          productCard.appendChild(productButton);

          suggestionContainer.appendChild(productCard);

          // Handle description overflow after DOM is rendered
          setTimeout(() => {
            handleDescriptionOverflow(productDescription, product.description);
          }, 10);
        });
      } else {
        const noSuggestionsMessage = document.createElement("p");
        noSuggestionsMessage.textContent = "No additional suggestions available.";
        suggestionContainer.appendChild(noSuggestionsMessage);
      }

      productContainer.appendChild(suggestionContainer);
    }
    // --- Product loading logic ENDS here ---
  });

// Helper function for formatting category headers
function formatCategoryHeader(keyword) {
  if (!keyword) return "All Products";
  const parts = keyword.split("-");
  const subcategory = parts[parts.length - 1];
  const formatted = subcategory.replace(/\b\w/g, c => c.toUpperCase());
  return `Buy ${formatted}`;
}

// Mapping for custom SEO meta tags per category
const categoryMeta = {
  "synthetic-spinel": {
    title: "Buy Synthetic Spinel from Our Range of Premium Faceting Material – Outback Gems & Minerals",
    description: "Shop our range of vivid synthetic spinel gemstones. Perfect for collectors and cutters. High-quality, affordable, and available in a variety of colours at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/synthetic-spinel.jpeg",
    altText: "Synthetic spinel rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "synthetic-sapphire": {
    title: "Buy Synthetic Sapphire from Our Range of Premium Faceting Material – Outback Gems & Minerals",
    description: "Discover durable, brilliantly coloured synthetic sapphires for faceting and jewellery. Shop now at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/synthetic-sapphire.jpeg",
    altText: "Synthetic sapphire rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "synthetic-cubic-zirconia": {
    title: "Buy Synthetic Cubic Zirconia from Our Range of Premium Faceting Material – Outback Gems & Minerals",
    description: "Browse our selection of high-brilliance synthetic cubic zirconia. Perfect for faceting projects and jewellery. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/synthetic-cubic-zirconia.jpeg",
    altText: "Synthetic cubic zirconia rough material specimens - Premium faceting gemstones at Outback Gems & Minerals"
  },
  "natural-zircon": {
    title: "Buy Natural Zircon from Our Range of Premium Natural Rough and Faceting Material – Outback Gems & Minerals",
    description: "Shop natural zircon gemstones with rich tones and ancient origins. Brilliant, fiery, and unique. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-zircon.jpeg",
    altText: "Natural zircon rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-sapphire": {
    title: "Buy Natural Sapphire from Our Range of Premium Natural Rough and Faceting Material – Outback Gems & Minerals",
    description: "Explore the timeless beauty of natural sapphires. Vivid colours, exceptional durability. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-sapphire.jpeg",
    altText: "Natural sapphire rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-garnet": {
    title: "Buy Natural Garnet from Our Range of Premium Natural Rough and Faceting Material – Outback Gems & Minerals",
    description: "Shop natural garnet gemstones known for their brilliance and fire. Rich tones and ancient origins. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-garnet.jpeg",
    altText: "Natural garnet rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-apatite": {
    title: "Buy Natural Apatite from Our Range of Premium Natural Rough and Faceting Material – Outback Gems & Minerals",
    description: "Apatite in vibrant blue and green hues. Unique phosphate mineral specimens. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-apatite.jpeg",
    altText: "Natural apatite rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-amethyst": {
    title: "Buy Natural Amethyst Specimens from Our Range of Gems and Minerals – Outback Gems & Minerals",
    description: "Amethyst: the purple variety of quartz. Rich colour, perfect for collections and creative projects. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-amethyst.jpeg",
    altText: "Natural amethyst rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-smoky-quartz": {
    title: "Buy Natural Smoky Quartz - Outback Gems & Minerals",
    description: "Smoky Quartz: brown to grey quartz, valued for grounding tones and natural crystal formations. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-smoky-quartz.jpeg",
    altText: "Natural smoky quartz rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "natural-peridot": {
    title: "Buy Natural Peridot Specimens from Our Range of Gems and Minerals – Outback Gems & Minerals",
    description: "Peridot (olivine): vibrant green gemstone formed deep within the Earth. Distinctive lime-green hue. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-peridot.jpeg",
    altText: "Natural peridot rough specimens - Premium gemstones at Outback Gems & Minerals"
  },
  "other-olivine": {
    title: "Buy Olivine (Peridot) Specimens from Our Range of Gems and Minerals – Outback Gems & Minerals",
    description: "Olivine, also known as peridot, is a vibrant green gemstone from deep within the Earth. Shop at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-olivine.jpeg",
    altText: "Olivine peridot specimens - Premium gemstone collection at Outback Gems & Minerals"
  },
  "other-sapphire-wash-bags": {
    title: "Buy Sapphire Washbags for Gem Fossicking – Direct from Queensland Gemfields | Outback Gems & Minerals",
    description: "Experience fossicking at home with our Sapphire Washbags from the Queensland Gemfields. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-sapphire-wash-bags.jpeg",
    altText: "Sapphire washbags for fossicking - Queensland gemfield dirt bags at Outback Gems & Minerals"
  },
  "other-thunder-eggs": {
    title: "Buy Thunder Eggs - Outback Gems & Minerals",
    description: "Thunder eggs: crack them open to reveal vibrant patterns and hidden crystals. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-thunder-eggs.jpeg",
    altText: "Thunder egg specimens - Natural geodes available at Outback Gems & Minerals"
  },
  "other-agate-slices": {
    title: "Buy Agate Slices - Outback Gems & Minerals",
    description: "Agate slices: natural banding and vibrant colours for display, decoration, or creative use. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-agate-slices.jpeg",
    altText: "Agate slice specimens with natural banding - Premium stones at Outback Gems & Minerals"
  },
  "other-yowah-nuts": {
    title: "Buy Unopened Yowah Nuts – Single, Small, Medium, Large & 3-Packs | Direct from the Queensland Opal Fields | Outback Gems & Minerals",
    description: "Shop genuine unopened Yowah nuts in single, small, medium, large, and 3-pack options. Direct from Queensland Opal fields. Each unopened nut is a natural surprise which may reveal beautiful banded ironstone or hidden opal. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-yowah-nuts.jpeg",
    altText: "Unopened Yowah nuts specimens - Queensland opal bearing ironstone at Outback Gems & Minerals"
  },
  "other-tumbles": {
    title: "Buy Tumbled Stones – Mixed Gemstone & Mineral Tumbles for Collectors, Gifts & Display | Outback Gems & Minerals",
    description: "Discover the beauty of nature in miniature with our range of tumbled stones. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Tumbled stone specimens - Mixed gemstone and mineral collection at Outback Gems & Minerals"
  },
  "natural-herkimer-diamonds": {
    title: "Buy Herkimer Diamonds – Facetable and Specimen Quartz Crystals | Outback Gems & Minerals",
    description: "Herkimer diamonds: naturally double-terminated quartz crystals prized for their distinctive formation and sparkle. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category-cards/natural-herkimer-diamonds.jpeg",
    altText: "Natural herkimer diamond specimens - Herkimer Diamond quartz crystals at Outback Gems & Minerals"
  }
};

function updateCategoryMetaTags(categoryKeyword) {
  let meta = null;
  if (categoryKeyword && categoryMeta[categoryKeyword]) {
    meta = categoryMeta[categoryKeyword];
  }
  // Fallback to generic if not found
  const formatted = categoryKeyword ? formatCategoryHeader(categoryKeyword) : "All Products";
  const title = meta ? meta.title : (categoryKeyword ? `${formatted} - Outback Gems & Minerals` : "Products - Outback Gems & Minerals");
  const description = meta ? meta.description : (categoryKeyword
    ? `Browse our selection of ${formatted.toLowerCase()} at Outback Gems & Minerals.`
    : "Browse our complete collection of natural and synthetic gemstones, crystals, minerals and fossicking supplies. Find high-quality specimens at Outback Gems & Minerals.");

  // Set dynamic title
  document.title = title;

  // Update or create meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // Update Open Graph and Twitter tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', title);

  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', window.location.href);

  const twitterUrl = document.querySelector('meta[name="twitter:url"]');
  if (twitterUrl) twitterUrl.setAttribute('content', window.location.href);

  // Set Open Graph and Twitter image tags
  const image = meta && meta.image ? meta.image : "https://www.outbackgems.com.au/images/logo.png"; // fallback image

  // og:image
  let ogImage = document.querySelector('meta[property="og:image"]');
  if (!ogImage) {
    ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    document.head.appendChild(ogImage);
  }
  ogImage.setAttribute('content', image);

  // twitter:image
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (!twitterImage) {
    twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    document.head.appendChild(twitterImage);
  }
  twitterImage.setAttribute('content', image);
  // Optionally update canonical URL (already handled by setupCanonicalUrl)
}