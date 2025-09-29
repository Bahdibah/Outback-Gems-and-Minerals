// Product functionality for products page

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
    // These will be initialized when DOM is ready
    let productContainer;
    let productHeader;

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

    // Create page title at the top of the page
    function createPageTitle(categoryKeyword) {
      // Remove any existing page title
      const existingTitle = document.getElementById('page-title-container');
      if (existingTitle) {
        existingTitle.remove();
      }
      
      const headerTitle = categoryKeyword ? formatCategoryHeader(categoryKeyword) : "All Products";
      
      const titleHTML = `
        <div id="page-title-container" style="
          width: 100%;
          max-width: 1400px;
          margin: calc(var(--navbar-height, 70px) + -20px) auto 40px auto;
          padding: 0 20px;
          text-align: center;
          position: relative;
        ">
          <h1 style="
            color: #cc5500;
            font-size: 2.8rem;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 2px 4px rgba(204, 85, 0, 0.1);
            position: relative;
            display: inline-block;
            padding: 0 30px;
          ">${headerTitle}</h1>
          <div style="
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 4px;
            background: linear-gradient(90deg, transparent, #cc5500, transparent);
            border-radius: 2px;
          "></div>
          <div style="
            position: absolute;
            bottom: -16px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 2px;
            background: #cc5500;
            border-radius: 1px;
            opacity: 0.6;
          "></div>
        </div>
      `;
      
      // Insert at the very top of the page content
      const body = document.body;
      const navbar = document.getElementById('navbar-container');
      if (navbar && navbar.nextSibling) {
        navbar.insertAdjacentHTML('afterend', titleHTML);
      } else {
        body.insertAdjacentHTML('afterbegin', titleHTML);
      }
    }

    // Create modern navigation buttons at the top using shared module
    async function createNavigationButtons(activeCategory) {
      if (window.categoryNavigation) {
        await window.categoryNavigation.createNavigationButtons(activeCategory);
      }
    }

    // Create subcategory buttons using shared module
    async function createSubcategoryButtons(mainCategory) {
      if (window.categoryNavigation) {
        window.categoryNavigation.createSubcategoryButtons(mainCategory);
      }
    }
    // Format subcategory names for display
    function formatSubcategoryName(subcategory) {
      // Since we now use direct subcategory names, just return the name as-is
      // The subcategory names in inventory.json are already properly formatted
      return subcategory;
    }

    // Update active states of subcategory buttons without recreating them
    function updateSubcategoryActiveStates(activeSubcategory) {
      document.querySelectorAll('.subcategory-nav-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-category') === activeSubcategory;
        btn.classList.toggle('active', isActive);
      });
    }

    // Update active states of main category buttons
    function updateMainCategoryActiveStates(activeMainCategory) {
      document.querySelectorAll('.category-nav-btn').forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        const isActive = btnCategory === activeMainCategory || (!btnCategory && !activeMainCategory);
        btn.classList.toggle('active', isActive);
      });
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', async function() {
      // Initialize DOM elements
      productContainer = document.getElementById("dynamic-product-container");
      productHeader = document.querySelector("h1.dynamic-product-header-title");
      
      const categoryKeyword = getQueryParam("category");
      
      // Create and display page title at the top
      // createPageTitle(categoryKeyword); // Temporarily hidden
      
      // Create modern navigation buttons
      if (window.categoryNavigation) {
        await window.categoryNavigation.createNavigationButtons(categoryKeyword);
      }
      
      setupCanonicalUrl();
      updateCategoryMetaTags(categoryKeyword);

      if (categoryKeyword) {
        loadProductsByCategory(categoryKeyword);
      } else {
        loadProductsByCategory(); // Load all products if no category is specified
      }
      
      // Handle browser back/forward buttons
      window.addEventListener('popstate', async function(event) {
        const categoryKeyword = getQueryParam("category");
        
        // Update page title
        // createPageTitle(categoryKeyword); // Temporarily hidden
        
        // Update navigation buttons
        if (window.categoryNavigation) {
          await window.categoryNavigation.createNavigationButtons(categoryKeyword);
        }
        
        // Reload products for the new category
        if (categoryKeyword) {
          loadProductsByCategory(categoryKeyword);
        } else {
          loadProductsByCategory();
        }
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

    // Function to map navbar category parameters to actual inventory categories
    function mapCategoryKeyword(keyword) {
      if (!keyword) return null;
      
      // Decode URL encoding to get the actual category name
      const decodedKeyword = decodeURIComponent(keyword);
      
      // Return the decoded category name directly since we're now using actual category names in URLs
      return decodedKeyword;
    }

    // Function to load products by category keyword
    function loadProductsByCategory(keyword = null) {
      if (!productContainer) {
        console.error('Product container not found');
        return;
      }
      
      productContainer.innerHTML = "<p>Loading products...</p>";

      getProductData()
        .then(data => {
          if (data && data.length > 0) {
            let filteredProducts;
            if (keyword) {
              // Map the navbar parameter to actual category/subcategory terms
              const mappedKeywords = mapCategoryKeyword(keyword);
              
              // Filter by main category or subcategory
              filteredProducts = data.filter(product => {
                const mainCategory = (product.category || "").trim().toLowerCase();
                const subCategoryString = (product["sub category"] || "").trim().toLowerCase();
                
                // Handle multiple mapped keywords (like 'other' mapping to multiple categories)
                const keywordsToCheck = Array.isArray(mappedKeywords) ? mappedKeywords : [mappedKeywords];
                
                return keywordsToCheck.some(searchKeyword => {
                  const keywordLower = searchKeyword.toLowerCase();
                  
                  // Check if this is a main-category-subcategory format (e.g., "tumbles|amethyst")
                  if (keywordLower.includes('|')) {
                    const [mainCat, subCat] = keywordLower.split('|');
                    
                    // Must match both main category AND subcategory
                    const mainCategoryMatches = mainCategory === mainCat;
                    const subcategories = subCategoryString.split(',').map(sub => sub.trim().toLowerCase());
                    const subCategoryMatches = subcategories.some(subCategory => subCategory === subCat);
                    
                    return mainCategoryMatches && subCategoryMatches;
                  }
                  
                  // For exact category matches (like "Carvings & Collectibles"), do exact comparison
                  if (searchKeyword.includes('&') || searchKeyword.includes(' ')) {
                    return mainCategory === keywordLower;
                  } else {
                    // For simple main category matches (like "tumbles"), just match main category
                    return mainCategory === keywordLower;
                  }
                });
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
            
            // Create product catalog schema for SEO
            createProductCatalogSchema(keyword, filteredProducts);
          } else {
            productContainer.innerHTML = "<p>No products found.</p>";
          }
        })
        .catch(error => {
          console.error("Error fetching product data:", error);
          productContainer.innerHTML = "<p style='color: red;'>Failed to load products. Please try again later.</p>";
        });
    }

    const PRODUCTS_PER_PAGE = 8; // Changed to 8 for better 4-card layout (2 rows of 4)
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

      // Add top pagination first
      const topPagination = createPaginationControls(currentProducts, headerTitle, keyword, data, page, totalPages);
      topPagination.classList.add('top-pagination');
      productContainer.appendChild(topPagination);

      // No longer adding header container here - it's at the top of the page

      if (productsToShow.length > 0) {
        productsToShow.forEach(product => {
          const productCard = document.createElement("div");
          productCard.classList.add("dynamic-product-card");
          productCard.style.position = "relative"; // Enable positioning for overlay

          // Check if product is out of stock
          const isOutOfStock = product.stock === 0 || product.stock === "" || product.stock === null || product.stock === undefined || parseInt(product.stock) === 0;
          if (isOutOfStock) {
            productCard.classList.add("out-of-stock");
          }

          const imageContainer = document.createElement("div");
          imageContainer.classList.add("image-container");
          
          const img = document.createElement("img");
          img.src = product["image url"];
          img.alt = `${product["product name"]} - ${product.category || 'Premium gemstone'} for sale at Outback Gems & Minerals` || "Premium gemstone for sale";
          img.loading = "lazy"; // <-- Add this line
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];
          
          // Add size info for all products except Yowah Nuts (which are handled separately)
          let sizeElement = null;
          if (product["product id"] && product["product id"].startsWith('yn')) {
            // Extract size info from product name for cleaner display (existing Yowah Nuts logic)
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
              sizeElement.className = "product-range-info"; // Use same class as other products
              sizeElement.textContent = sizeInfo;
            }
          } else {
            // Generate size range for all other products based on available weights
            const sizeRange = generateSizeRange(data, product["product id"]);
            if (sizeRange) {
              sizeElement = document.createElement("div");
              sizeElement.className = "product-range-info";
              sizeElement.textContent = sizeRange;
            }
          }

          // Add price display
          const productPrice = document.createElement("p");
          productPrice.className = "product-price";
          productPrice.textContent = calculatePriceDisplay(data, product["product id"]);

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
          productCard.appendChild(productButton);

          productContainer.appendChild(productCard);
        });

        // Add ghost cards to maintain grid layout for 4-card rows
        const productsShown = productsToShow.length;
        const cardsInLastRow = productsShown % 4;
        if (cardsInLastRow !== 0) {
          const ghostCardsNeeded = 4 - cardsInLastRow;
          for (let i = 0; i < ghostCardsNeeded; i++) {
            const ghostCard = document.createElement("div");
            ghostCard.className = "dynamic-product-card ghost-card";
            productContainer.appendChild(ghostCard);
          }
        }

        if (products.length < 8) { // Changed from 4 to 8 to account for new page size
          // Only show suggestions for subcategories (those with dashes), not main categories
          if (keyword && keyword.includes('-')) {
            suggestAdditionalProducts(keyword, products, data);
          }
        }
      } else {
        productContainer.innerHTML += "<p>No products found in this category.</p>";
        // Only show suggestions for subcategories (those with dashes), not main categories
        if (keyword && keyword.includes('-')) {
          suggestAdditionalProducts(keyword, [], data);
        }
      }

      // Function to create modern pagination controls
      function createPaginationControls(currentProducts, headerTitle, keyword, data, page, totalPages) {
        const pagination = document.createElement("div");
        pagination.className = "pagination-controls";
        
        if (totalPages <= 1) {
          // Create invisible placeholder to maintain layout spacing
          pagination.style.visibility = "hidden";
          pagination.style.height = "40px"; // Same height as visible pagination
          pagination.innerHTML = "&nbsp;"; // Add invisible content to maintain height
          return pagination;
        }

        pagination.style.visibility = "visible";
        pagination.style.height = "auto";

        // Previous button
        const prevItem = document.createElement("button");
        prevItem.className = `pagination-item pagination-arrow ${page <= 1 ? 'disabled' : ''}`;
        prevItem.innerHTML = '←';
        prevItem.title = 'Previous page';
        if (page > 1) {
          prevItem.onclick = () => {
            displayProducts(currentProducts, headerTitle, keyword, data, page - 1);
            document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
          };
        }
        pagination.appendChild(prevItem);

        // Page numbers logic
        function addPageItem(pageNum, isActive = false, isEllipsis = false) {
          const item = document.createElement(isEllipsis ? "span" : "button");
          item.className = `pagination-item ${isActive ? 'active' : ''} ${isEllipsis ? 'pagination-ellipsis' : ''}`;
          item.textContent = isEllipsis ? '…' : pageNum;
          
          if (!isEllipsis && !isActive) {
            item.onclick = () => {
              displayProducts(currentProducts, headerTitle, keyword, data, pageNum);
              document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
            };
          }
          
          pagination.appendChild(item);
        }

        // Smart pagination logic
        if (totalPages <= 7) {
          // Show all pages if 7 or fewer
          for (let i = 1; i <= totalPages; i++) {
            addPageItem(i, i === page);
          }
        } else {
          // Complex pagination for many pages
          if (page <= 4) {
            // Near the beginning
            for (let i = 1; i <= 5; i++) {
              addPageItem(i, i === page);
            }
            addPageItem(null, false, true); // ellipsis
            addPageItem(totalPages);
          } else if (page >= totalPages - 3) {
            // Near the end
            addPageItem(1);
            addPageItem(null, false, true); // ellipsis
            for (let i = totalPages - 4; i <= totalPages; i++) {
              addPageItem(i, i === page);
            }
          } else {
            // In the middle
            addPageItem(1);
            addPageItem(null, false, true); // ellipsis
            for (let i = page - 1; i <= page + 1; i++) {
              addPageItem(i, i === page);
            }
            addPageItem(null, false, true); // ellipsis
            addPageItem(totalPages);
          }
        }

        // Next button
        const nextItem = document.createElement("button");
        nextItem.className = `pagination-item pagination-arrow ${page >= totalPages ? 'disabled' : ''}`;
        nextItem.innerHTML = '→';
        nextItem.title = 'Next page';
        if (page < totalPages) {
          nextItem.onclick = () => {
            displayProducts(currentProducts, headerTitle, keyword, data, page + 1);
            document.getElementById('dynamic-product-container').scrollIntoView({ behavior: 'smooth' });
          };
        }
        pagination.appendChild(nextItem);

        return pagination;
      }

      // Add bottom pagination at the end
      const bottomPagination = createPaginationControls(currentProducts, headerTitle, keyword, data, page, totalPages);
      bottomPagination.classList.add('bottom-pagination');
      productContainer.appendChild(bottomPagination);
    }

    function suggestAdditionalProducts(currentCategory, displayedProducts, data) {
      displayedProducts = displayedProducts || [];
      const displayedProductNames = new Set(displayedProducts.map(product => product["product name"]));
      
      // Only show suggestions for subcategory searches, not main category searches
      // Check if currentCategory matches any main category exactly
      const mainCategories = ['faceting rough', 'carvings & collectibles', 'raw material & specimens', 'tumbles', 'slabs'];
      const isMainCategory = mainCategories.includes(currentCategory?.toLowerCase());
      
      // Don't show "You may also like" for main categories
      if (isMainCategory) {
        return;
      }
      
      // For subcategory searches, show related products from the same main category
      const filteredSuggestions = data.filter(product => {
        const productMainCategory = (product.category || "").trim().toLowerCase();
        const productSubCategory = (product["sub category"] || "").trim().toLowerCase();
        
        // Find which main category the current search belongs to
        let searchMainCategory = '';
        if (currentCategory) {
          const matchingProduct = data.find(p => {
            const subCatString = (p["sub category"] || "").trim().toLowerCase();
            if (subCatString) {
              const subcategories = subCatString.split(',').map(sub => sub.trim());
              return subcategories.some(subCat => subCat.includes(currentCategory.toLowerCase()));
            }
            return false;
          });
          if (matchingProduct) {
            searchMainCategory = (matchingProduct.category || "").trim().toLowerCase();
          }
        }
        
        // Show products from same main category, excluding already displayed products
        return productMainCategory === searchMainCategory && 
               !displayedProductNames.has(product["product name"]);
      });
      
      const shuffledSuggestions = filteredSuggestions.sort(() => 0.5 - Math.random()).slice(0, 4);

      const suggestionContainer = document.createElement("div");
      suggestionContainer.classList.add("suggestion-container");

      const suggestionHeaderContainer = document.createElement("div");
      suggestionHeaderContainer.className = "dynamic-product-header-container";
      const suggestionDivider = document.createElement("hr");
      suggestionDivider.className = "product-header-divider";
      suggestionHeaderContainer.appendChild(suggestionDivider);

      const suggestionHeader = document.createElement("h1");
      suggestionHeader.className = "dynamic-product-header-title";
      suggestionHeader.textContent = "You May Also Like";
      suggestionHeaderContainer.appendChild(suggestionHeader);

      suggestionContainer.appendChild(suggestionHeaderContainer);

      if (shuffledSuggestions.length > 0) {
        shuffledSuggestions.forEach(product => {
          const productCard = document.createElement("div");
          productCard.classList.add("dynamic-product-card");
          productCard.style.position = "relative"; // Enable positioning for overlay

          const imageContainer = document.createElement("div");
          imageContainer.classList.add("image-container");
          
          const img = document.createElement("img");
          img.src = product["image url"];
          img.alt = `${product["product name"]} - Related ${product.category || 'gemstone'} from Outback Gems & Minerals` || "Related gemstone from Outback Gems";
          img.loading = "lazy";
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];
          
          // Add size info for all products except Yowah Nuts in suggestions too
          let sizeElement = null;
          if (product["product id"] && product["product id"].startsWith('yn')) {
            // Extract size info from product name for cleaner display (existing Yowah Nuts logic)
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
              sizeElement.className = "product-range-info"; // Use same class as other products
              sizeElement.textContent = sizeInfo;
            }
          } else {
            // Generate size range for all other products based on available weights
            const sizeRange = generateSizeRange(data, product["product id"]);
            if (sizeRange) {
              sizeElement = document.createElement("div");
              sizeElement.className = "product-range-info";
              sizeElement.textContent = sizeRange;
            }
          }

          // Add price display for suggestions
          const productPrice = document.createElement("p");
          productPrice.className = "product-price";
          productPrice.textContent = calculatePriceDisplay(data, product["product id"]);

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
          productCard.appendChild(productButton);

          suggestionContainer.appendChild(productCard);
        });
      } else {
        const noSuggestionsMessage = document.createElement("p");
        noSuggestionsMessage.textContent = "No additional suggestions available.";
        suggestionContainer.appendChild(noSuggestionsMessage);
      }

      productContainer.appendChild(suggestionContainer);
    }
    // --- Product loading logic ENDS here ---

    // Function to generate size range for products based on available weights
    function generateSizeRange(data, productId) {
      // Find all variants of this product ID
      const productVariants = data.filter(item => item["product id"] === productId);
      
      if (productVariants.length <= 1) {
        // Single variant - show exact weight with unit
        const variant = productVariants[0];
        if (variant && variant.weight && variant.unit) {
          const formattedSize = formatSizeWithSpacing(variant.weight, variant.unit, variant);
          return formattedSize;
        }
        return null;
      }
      
      // Multiple variants - show range
      const weights = productVariants.map(variant => variant.weight).filter(weight => weight != null);
      const unit = productVariants[0]?.unit || '';
      
      if (weights.length === 0) return null;
      
      const minWeight = Math.min(...weights);
      const maxWeight = Math.max(...weights);
      
      // If all weights are the same, show single value
      if (minWeight === maxWeight) {
        const variant = productVariants[0]; // Use first variant for dimensions
        const formattedSize = formatSizeWithSpacing(minWeight, unit, variant);
        return formattedSize;
      }
      
      // Show range for different weights with proper spacing
      const minFormatted = formatSizeWithSpacing(minWeight, unit);
      const maxFormatted = formatSizeWithSpacing(maxWeight, unit);
      
      // For ranges, we can optimize by showing "50-100ct" instead of "50 ct-100 ct"
      if (unit === 'ct' || unit === 'g') {
        return `${minWeight}-${maxWeight}${unit}`;
      } else {
        // For other units like "slice", "bag", etc., show full format
        return `${minFormatted}-${maxFormatted}`;
      }
    }

    // Helper function to format size with proper spacing
    function formatSizeWithSpacing(weight, unit, variant = null) {
      let sizeText = '';
      
      // Add space for word-based units like "slice", "bag", "piece", etc.
      if (unit && /^[a-zA-Z]/.test(unit) && unit !== 'ct' && unit !== 'g' && unit !== 'kg') {
        sizeText = `${weight} ${unit}`;
      } else {
        // Keep compact format for standard units like "ct", "g", "kg"
        sizeText = `${weight}${unit}`;
      }
      
      // Add dimensions for slabs
      if (variant && variant["Dimensions"] && variant.category === "Slabs") {
        sizeText += ` - ${variant["Dimensions"]}`;
      }
      
      return sizeText;
    }

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
  // Main categories
  "faceting rough": {
    title: "Premium Faceting Rough | Synthetic Gemstone Cutting Material | Outback Gems & Minerals",
    description: "Shop our extensive collection of premium faceting rough including synthetic materials in various colors. High-quality rough perfect for lapidary and gemstone cutting projects.",
    image: ["https://www.outbackgems.com.au/images/main/s104.jpeg", "https://www.outbackgems.com.au/images/main/CZ-Champagne.jpeg", "https://www.outbackgems.com.au/images/main/s105.jpeg", "https://www.outbackgems.com.au/images/main/CZ-Golden.jpeg"],
    altText: "Premium synthetic faceting rough collection including spinel and cubic zirconia at Outback Gems & Minerals",
    category: "Faceting Rough",
    keywords: "faceting rough, synthetic gemstones, gemstone cutting, lapidary material, rough material, faceting material, cutting stones"
  },
  "carvings & collectibles": {
    title: "Crystal Carvings & Collectibles | Handcrafted Gemstone Art | Outback Gems & Minerals",
    description: "Discover our unique collection of handcrafted crystal carvings and collectible gemstone art. Beautiful pieces perfect for display, gifts and crystal enthusiasts.",
    image: ["https://www.outbackgems.com.au/images/main/btf001.jpeg", "https://www.outbackgems.com.au/images/main/hrt001.jpeg", "https://www.outbackgems.com.au/images/main/mtr001.jpeg", "https://www.outbackgems.com.au/images/main/ccb001.jpeg"],
    altText: "Handcrafted crystal carvings including butterflies, hearts, towers and collectibles at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "crystal carvings, gemstone collectibles, crystal art, handcrafted crystals, mineral art, decorative crystals, crystal gifts"
  },
  "raw material & specimens": {
    title: "Raw Gemstone Material & Natural Specimens | Collector Quality Minerals | Outback Gems & Minerals",
    description: "Browse our collection of raw gemstone material and natural mineral specimens. Premium quality pieces perfect for collectors, fossickers and educational purposes.",
    image: ["https://www.outbackgems.com.au/images/main/other-herkimer-diamonds.jpeg", "https://www.outbackgems.com.au/images/main/yn001.jpeg", "https://www.outbackgems.com.au/images/main/sw001.jpeg", "https://www.outbackgems.com.au/images/main/hap001.jpeg"],
    altText: "Raw gemstone material including Herkimer diamonds, Yowah nuts and natural specimens at Outback Gems & Minerals",
    category: "Raw Material & Specimens", 
    keywords: "raw gemstones, mineral specimens, natural crystals, collector specimens, fossicking material, raw minerals, educational specimens"
  },
  "slabs": {
    title: "Natural Rough Slabs | Premium Lapidary & Cabochon Material | Outback Gems & Minerals",
    description: "Premium natural rough slabs perfect for lapidary work, cabochon cutting and decorative displays. Quality mineral slabs for all your creative projects.",
    image: ["https://www.outbackgems.com.au/images/main/cla001.jpeg", "https://www.outbackgems.com.au/images/main/msa001.jpeg", "https://www.outbackgems.com.au/images/main/rfj001.jpeg", "https://www.outbackgems.com.au/images/main/mag001.jpeg"],
    altText: "Natural rough slabs including crazy lace agate, moss agate and rainforest jasper for lapidary work at Outback Gems & Minerals",
    category: "Slabs",
    keywords: "natural rough slabs, lapidary slabs, mineral slabs, cabochon material, rough slabs, decorative stone slabs"
  },
  "slabs|bumblebee jasper": {
    title: "Bumblebee Jasper Slab | Premium Yellow & Black Lapidary Material | Outback Gems & Minerals",
    description: "Premium bumblebee jasper slab featuring striking yellow and black volcanic patterns. Ideal for lapidary work, cabochon cutting and collector displays. Unique Indonesian volcanic material perfect for specialty projects.",
    image: ["https://www.outbackgems.com.au/images/main/bbj001.jpeg", "https://www.outbackgems.com.au/images/main/bbj002.jpeg"],
    altText: "Bumblebee jasper slab with yellow and black volcanic patterns for lapidary work at Outback Gems & Minerals",
    category: "Slabs",
    keywords: "bumblebee jasper slab, yellow jasper slab, black jasper slab, volcanic slab, lapidary material, cabochon material, Indonesian jasper, bumblebee jasper cabochon"
  },
  "tumbles": {
    title: "Buy Tumbled Gemstones | Premium Polished Crystal Collection | Outback Gems & Minerals",
    description: "Shop premium tumbled gemstones including amethyst, quartz, agate, and jasper. High-quality polished crystal tumbles perfect for collectors, jewelry making, and crystal healing. 100g bags available.",
    image: ["https://www.outbackgems.com.au/images/main/other-amethyst-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/other-quartz-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/other-agate-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/tmb004.jpeg"],
    altText: "Premium tumbled gemstones collection including amethyst, quartz, agate and various crystal tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "buy tumbled gemstones, tumbled stones, polished crystals, crystal tumbles, tumbled gemstone collection, smooth gemstones, pocket stones, healing crystals, crystal collection Australia"
  },
  
  // Subcategory combinations (category|subcategory format)
  "faceting rough|synthetic spinel": {
    title: "Buy Synthetic Spinel Faceting Rough | Premium Blue & Multi-Color Synthetic Spinel | Outback Gems & Minerals",
    description: "Shop premium synthetic spinel faceting rough in stunning blues, silver, and powder blue. High-quality synthetic spinel perfect for faceting, lapidary projects, and gemstone cutting. Available in multiple sizes from 20ct to 84ct.",
    image: ["https://www.outbackgems.com.au/images/main/s104.jpeg", "https://www.outbackgems.com.au/images/main/s105.jpeg"],
    altText: "Premium synthetic spinel faceting rough in blue colors - High-quality gemstone cutting material at Outback Gems & Minerals",
    category: "Faceting Rough",
    keywords: "buy synthetic spinel, synthetic spinel rough, blue synthetic spinel, faceting spinel, spinel cutting material, synthetic spinel gemstones, lapidary spinel, synthetic spinel Australia"
  },
  "faceting rough|synthetic cz": {
    title: "Premium Synthetic Cubic Zirconia Faceting Rough | CZ Cutting Material | Outback Gems & Minerals", 
    description: "Browse our selection of high-brilliance synthetic cubic zirconia faceting rough. Perfect for faceting projects and jewellery making.",
    image: ["https://www.outbackgems.com.au/images/main/CZ-Champagne.jpeg", "https://www.outbackgems.com.au/images/main/CZ-Golden.jpeg"],
    altText: "Synthetic cubic zirconia faceting rough - Premium CZ cutting material at Outback Gems & Minerals",
    category: "Faceting Rough",
    keywords: "cubic zirconia, CZ faceting rough, synthetic gems, faceting material, jewelry stones, CZ cutting"
  },
  "faceting rough|synthetic cz,synthetic spinel": {
    title: "Mixed Synthetic Faceting Rough | CZ & Spinel Cutting Material | Outback Gems & Minerals",
    description: "Premium mixed synthetic faceting rough including both cubic zirconia and synthetic spinel. Variety pack perfect for faceting enthusiasts.",
    image: "https://www.outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
    altText: "Mixed synthetic CZ and spinel faceting rough at Outback Gems & Minerals",
    category: "Faceting Rough", 
    keywords: "mixed synthetic rough, CZ and spinel, variety faceting pack, synthetic gemstones, cutting material"
  },
  "carvings & collectibles|crystal butterflies": {
    title: "Amethyst & Rose Quartz Crystal Butterflies | Gemstone Butterfly Carvings | Outback Gems & Minerals",
    description: "Beautiful crystal butterfly carvings crafted from premium amethyst, rose quartz and other gemstones. Perfect collectibles and decorative pieces for crystal enthusiasts.",
    image: ["https://www.outbackgems.com.au/images/main/btf001.jpeg", "https://www.outbackgems.com.au/images/main/bbj002.jpeg"],
    altText: "Amethyst and rose quartz crystal butterfly carvings at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "crystal butterflies, amethyst butterflies, rose quartz butterflies, gemstone butterflies, crystal carvings, butterfly collectibles"
  },
  "carvings & collectibles|crystal hearts": {
    title: "Amethyst & Rose Quartz Crystal Hearts | Gemstone Heart Carvings | Outback Gems & Minerals",
    description: "Premium crystal heart carvings made from beautiful amethyst, rose quartz and other gemstones. Perfect for gifts, collecting and crystal healing practices.",
    image: ["https://www.outbackgems.com.au/images/main/hrt001.jpeg", "https://www.outbackgems.com.au/images/main/hrt002.jpeg"],
    altText: "Amethyst and rose quartz crystal heart carvings at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "crystal hearts, amethyst hearts, rose quartz hearts, gemstone hearts, crystal carvings, heart collectibles, healing crystals"
  },
  "carvings & collectibles|crystal towers (mini)": {
    title: "Mini Amethyst & Quartz Crystal Towers | Small Gemstone Towers | Outback Gems & Minerals",
    description: "Mini crystal towers and small gemstone towers in amethyst, clear quartz and other materials. Perfect for crystal grids, decoration and collecting.",
    image: ["https://www.outbackgems.com.au/images/main/mtr001.jpeg", "https://www.outbackgems.com.au/images/main/mtr002.jpeg"],
    altText: "Mini amethyst and quartz crystal towers at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "crystal towers, mini towers, amethyst towers, quartz towers, crystal points, gemstone towers, crystal grids"
  },
  "carvings & collectibles|crystal chip bottles": {
    title: "Crystal Chip Bottles | Gemstone Chip Collections | Outback Gems & Minerals",
    description: "Beautiful crystal chip bottles filled with premium gemstone chips. Perfect for crafts, decoration and collecting various crystal energies.",
    image: ["https://www.outbackgems.com.au/images/main/ccb001.jpeg", "https://www.outbackgems.com.au/images/main/ccb002.jpeg"],
    altText: "Crystal chip bottles with gemstone chips at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "crystal chip bottles, gemstone chips, crystal crafts, decorative bottles, mixed crystals"
  },
  "carvings & collectibles|gem tree (5-7cm)": {
    title: "Gem Trees | Small Crystal Trees 5-7cm | Outback Gems & Minerals",
    description: "Beautiful small gem trees featuring wire-wrapped crystal chips. Decorative crystal trees perfect for feng shui, decoration and gifts.",
    image: ["https://www.outbackgems.com.au/images/main/mtr001.jpeg", "https://www.outbackgems.com.au/images/main/ccb001.jpeg"],
    altText: "Small gem trees with crystal chips 5-7cm at Outback Gems & Minerals",
    category: "Carvings & Collectibles",
    keywords: "gem trees, crystal trees, wire wrapped crystals, feng shui trees, decorative crystals, small trees"
  },
  "raw material & specimens|herkimer diamonds": {
    title: "Herkimer Diamond Crystals | Natural Quartz Specimens | Outback Gems & Minerals",
    description: "Herkimer diamonds: naturally double-terminated quartz crystals prized for their distinctive formation and sparkle. Premium natural specimens.",
    image: ["https://www.outbackgems.com.au/images/main/other-herkimer-diamonds.jpeg", "https://www.outbackgems.com.au/images/main/hap001.jpeg"],
    altText: "Herkimer diamond specimens - Natural double-terminated quartz crystals at Outback Gems & Minerals",
    category: "Raw Material & Specimens",
    keywords: "herkimer diamonds, natural quartz, double terminated crystals, quartz specimens, crystal collecting"
  },
  "raw material & specimens|sapphire wash bag": {
    title: "Sapphire Wash Bags | Queensland Gemfield Dirt | Fossicking Experience | Outback Gems & Minerals",
    description: "Experience fossicking at home with our Sapphire Wash Bags from the Queensland Gemfields. Real dirt bags for gem hunting adventures.",
    image: ["https://www.outbackgems.com.au/images/main/sw001.jpeg", "https://www.outbackgems.com.au/images/main/sw002.jpeg"],
    altText: "Sapphire wash bags for fossicking - Queensland gemfield dirt bags at Outback Gems & Minerals",
    category: "Raw Material & Specimens",
    keywords: "sapphire wash bags, fossicking, Queensland gemfields, gem hunting, sapphire dirt, fossicking bags"
  },
  "raw material & specimens|yowah nuts": {
    title: "Yowah Nuts for Sale | Unopened Small, Medium, Large & 3-Packs | Direct from QLD Opal Fields | Outback Gems & Minerals",
    description: "Yowah nuts for sale direct from Queensland Opal Fields! Shop genuine unopened Yowah Nuts in various sizes - single, small, medium, large and 3-pack options. Each unopened nut may contain beautiful banded ironstone or precious opal. Buy yowah nuts for sale from Australia's premier opal region.",
    image: ["https://www.outbackgems.com.au/images/main/yn001.jpeg", "https://www.outbackgems.com.au/images/main/yn002.jpeg"],
    altText: "Yowah nuts for sale - unopened nuts in various sizes from Queensland Opal Fields at Outback Gems & Minerals",
    category: "Raw Material & Specimens",
    keywords: "yowah nuts for sale, buy yowah nuts, unopened yowah nuts, Queensland opal fields, yowah nuts small medium large, 3-pack yowah nuts, opal nuts Australia, shop yowah nuts, yowah nuts for sale Australia"
  },
  "tumbles|amethyst": {
    title: "Amethyst Tumbled Stones | Purple Quartz Tumbles | Outback Gems & Minerals",
    description: "Beautiful amethyst tumbled stones - premium purple quartz perfect for collecting, jewelry making and crystal healing practices.",
    image: ["https://www.outbackgems.com.au/images/main/other-amethyst-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/tmb004.jpeg"],
    altText: "Amethyst tumbled stones - Purple quartz tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "amethyst tumbles, purple quartz, tumbled amethyst, healing crystals, polished amethyst"
  },
  "tumbles|rose quartz": {
    title: "Rose Quartz Tumbled Stones | Pink Crystal Tumbles | Outback Gems & Minerals",
    description: "Premium rose quartz tumbled stones in beautiful pink hues. Perfect for crystal healing, jewelry making and mineral collecting.",
    image: ["https://www.outbackgems.com.au/images/main/other-quartz-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/tmb005.jpeg"],
    altText: "Rose quartz tumbled stones - Pink crystal tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "rose quartz tumbles, pink quartz, tumbled rose quartz, healing crystals, love stones"
  },
  "tumbles|smoky quartz": {
    title: "Smoky Quartz Tumbled Stones | Grey Crystal Tumbles | Outback Gems & Minerals",
    description: "Smoky quartz tumbled stones in rich brown to grey tones. Grounding crystals perfect for collecting and healing practices.",
    image: ["https://www.outbackgems.com.au/images/main/other-quartz-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/tmb006.jpeg"],
    altText: "Smoky quartz tumbled stones - Grey crystal tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "smoky quartz tumbles, grey quartz, brown quartz, grounding crystals, tumbled smoky quartz"
  },
  "tumbles|agate": {
    title: "Agate Tumbled Stones | Banded Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful agate tumbled stones featuring natural banding patterns. Premium polished stones perfect for collecting and decorative displays.",
    image: ["https://www.outbackgems.com.au/images/main/other-agate-tumbles.jpeg", "https://www.outbackgems.com.au/images/main/tmb007.jpeg"],
    altText: "Agate tumbled stones with natural banding at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "agate tumbles, banded agate, tumbled agate, polished agate, decorative stones"
  },
  "tumbles|amazonite": {
    title: "Amazonite Tumbled Stones | Blue-Green Crystal Tumbles | Outback Gems & Minerals",
    description: "Stunning amazonite tumbled stones in beautiful blue-green hues. Premium feldspar crystals perfect for collecting and crystal healing.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Amazonite tumbled stones - Blue-green crystal tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "amazonite tumbles, blue green crystals, feldspar tumbles, healing crystals, amazonite stones"
  },
  "tumbles|aventurine": {
    title: "Aventurine Tumbled Stones | Green Crystal Tumbles | Outback Gems & Minerals",
    description: "Premium aventurine tumbled stones with beautiful sparkly inclusions. Green quartz crystals perfect for luck, prosperity and crystal healing.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Green aventurine tumbled stones with sparkly inclusions at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "aventurine tumbles, green aventurine, sparkly crystals, luck stones, prosperity crystals"
  },
  "tumbles|bumblebee jasper": {
    title: "Bumblebee Jasper Tumbled Stones | Yellow & Black Crystal Tumbles | Outback Gems & Minerals",
    description: "Vibrant bumblebee jasper tumbled stones with striking yellow and black patterns. Unique volcanic stones perfect for collectors.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Bumblebee jasper tumbled stones with yellow and black patterns at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "bumblebee jasper tumbles, yellow jasper, black jasper, volcanic stones, patterned stones"
  },
  "tumbles|citrine": {
    title: "Citrine Tumbled Stones | Golden Yellow Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful citrine tumbled stones in warm golden yellow tones. Abundance and prosperity crystals perfect for collecting and healing practices.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Golden citrine tumbled stones - Yellow crystal tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "citrine tumbles, yellow crystals, golden citrine, abundance stones, prosperity crystals"
  },
  "tumbles|clear quartz": {
    title: "Clear Quartz Tumbled Stones | Crystal Clear Tumbles | Outback Gems & Minerals",
    description: "Pure clear quartz tumbled stones with excellent clarity. Master healer crystals perfect for amplifying energy and crystal collections.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Clear quartz tumbled stones - Crystal clear tumbles at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "clear quartz tumbles, crystal clear stones, master healer, amplifying crystals, pure quartz"
  },
  "tumbles|crazy lace agate": {
    title: "Crazy Lace Agate Tumbled Stones | Patterned Crystal Tumbles | Outback Gems & Minerals",
    description: "Stunning crazy lace agate tumbled stones with intricate patterns and bands. Unique Mexican agate perfect for collectors and display.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Crazy lace agate tumbled stones with intricate patterns at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "crazy lace agate tumbles, patterned agate, Mexican agate, banded stones, lace patterns"
  },
  "tumbles|fire quartz": {
    title: "Fire Quartz Tumbled Stones | Hematite Included Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful fire quartz tumbled stones with hematite inclusions creating fiery patterns. Unique grounding crystals perfect for collectors.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Fire quartz tumbled stones with hematite inclusions at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "fire quartz tumbles, hematite inclusions, included quartz, grounding crystals, fiery patterns"
  },
  "tumbles|jasper": {
    title: "Jasper Tumbled Stones | Earth Tone Crystal Tumbles | Outback Gems & Minerals",
    description: "Premium jasper tumbled stones in beautiful earth tones and patterns. Nurturing and protective stones perfect for collecting and grounding.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Jasper tumbled stones in earth tones at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "jasper tumbles, earth tone stones, nurturing crystals, protective stones, patterned jasper"
  },
  "tumbles|malachite": {
    title: "Malachite Tumbled Stones | Green Copper Crystal Tumbles | Outback Gems & Minerals",
    description: "Stunning malachite tumbled stones with vibrant green bands and swirls. Copper mineral crystals perfect for transformation and healing.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Malachite tumbled stones with green bands and swirls at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "malachite tumbles, green copper stones, banded malachite, transformation crystals, swirled patterns"
  },
  "tumbles|mookite": {
    title: "Mookite Tumbled Stones | Australian Jasper Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful mookite tumbled stones in warm earth tones. Australian jasper with grounding energy perfect for collecting and healing practices.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Mookite tumbled stones - Australian jasper in earth tones at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "mookite tumbles, Australian jasper, earth tone crystals, grounding stones, warm colors"
  },
  "tumbles|moroccan agate": {
    title: "Moroccan Agate Tumbled Stones | Desert Crystal Tumbles | Outback Gems & Minerals",
    description: "Exotic Moroccan agate tumbled stones with unique desert patterns and colors. Premium stones perfect for collectors and decorative displays.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Moroccan agate tumbled stones with desert patterns at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "Moroccan agate tumbles, desert agate, exotic patterns, collector stones, unique colors"
  },
  "tumbles|moss agate": {
    title: "Moss Agate Tumbled Stones | Nature Pattern Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful moss agate tumbled stones with natural moss-like inclusions. Nature's art in stone perfect for gardeners and nature lovers.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Moss agate tumbled stones with natural moss patterns at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "moss agate tumbles, moss patterns, nature stones, garden crystals, included agate"
  },
  "tumbles|obsidian": {
    title: "Obsidian Tumbled Stones | Volcanic Glass Crystal Tumbles | Outback Gems & Minerals",
    description: "Sleek obsidian tumbled stones formed from volcanic glass. Powerful protection and grounding stones perfect for spiritual practices.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Black obsidian tumbled stones - Volcanic glass crystals at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "obsidian tumbles, volcanic glass, protection stones, grounding crystals, black stones"
  },
  "tumbles|prehnite": {
    title: "Prehnite Tumbled Stones | Soft Green Crystal Tumbles | Outback Gems & Minerals",
    description: "Gentle prehnite tumbled stones in soft green hues. Peaceful healing crystals perfect for meditation and emotional balance.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Soft green prehnite tumbled stones at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "prehnite tumbles, soft green crystals, peaceful stones, meditation crystals, emotional healing"
  },
  "tumbles|rainforest jasper": {
    title: "Rainforest Jasper Tumbled Stones | Green Forest Crystal Tumbles | Outback Gems & Minerals",
    description: "Beautiful rainforest jasper tumbled stones with green forest-like patterns. Nature-inspired stones perfect for earth connection and healing.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Rainforest jasper tumbled stones with green forest patterns at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "rainforest jasper tumbles, forest patterns, green jasper, nature connection, earth stones"
  },
  "tumbles|tiger eye": {
    title: "Tiger Eye Tumbled Stones | Golden Brown Crystal Tumbles | Outback Gems & Minerals",
    description: "Stunning tiger eye tumbled stones with golden brown chatoyancy. Courage and confidence stones perfect for protection and grounding.",
    image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
    altText: "Golden brown tiger eye tumbled stones with chatoyancy at Outback Gems & Minerals",
    category: "Tumbles",
    keywords: "tiger eye tumbles, golden brown stones, chatoyant crystals, courage stones, confidence crystals"
  }
};

function updateCategoryMetaTags(categoryKeyword) {
  let meta = null;
  if (categoryKeyword && categoryMeta[categoryKeyword]) {
    meta = categoryMeta[categoryKeyword];
  }
  
  // Enhanced fallback system for missing categories/subcategories
  let fallbackMeta = null;
  if (!meta && categoryKeyword) {
    // Check if it's a subcategory format (category|subcategory)
    if (categoryKeyword.includes('|')) {
      const [mainCategory, subCategory] = categoryKeyword.split('|');
      
      // Generate dynamic fallback for subcategories
      fallbackMeta = generateSubcategoryFallback(mainCategory, subCategory);
    } else {
      // Generate dynamic fallback for main categories
      fallbackMeta = generateMainCategoryFallback(categoryKeyword);
    }
  }
  
  // Use meta, fallback, or final generic fallback
  const finalMeta = meta || fallbackMeta;
  const formatted = categoryKeyword ? formatCategoryHeader(categoryKeyword) : "All Products";
  
  const title = finalMeta ? finalMeta.title : (categoryKeyword ? `${formatted} | Outback Gems & Minerals` : "Premium Gemstones & Minerals Collection | Outback Gems & Minerals");
  const description = finalMeta ? finalMeta.description : (categoryKeyword
    ? `Browse our selection of ${formatted.toLowerCase()} at Outback Gems & Minerals. Quality specimens for collectors and enthusiasts.`
    : "Discover Australia's finest collection of natural and synthetic gemstones, minerals, crystals and fossicking supplies. Quality specimens for collectors and lapidary enthusiasts.");

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

  // Update keywords meta tag
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const baseKeywords = "gemstones, minerals, crystals, sapphire, spinel, zircon, fossicking supplies, Australian gems, natural gemstones, synthetic gemstones, lapidary supplies";
    const categoryKeywords = finalMeta && finalMeta.keywords ? `, ${finalMeta.keywords}` : (categoryKeyword ? `, ${categoryKeyword.replace(/-/g, ' ').replace(/\|/g, ', ')}, ${formatted.toLowerCase()}` : "");
    metaKeywords.setAttribute('content', baseKeywords + categoryKeywords);
  }

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
  let image = "https://www.outbackgems.com.au/images/main/bbj005.jpeg"; // Default fallback image
  
  if (finalMeta && finalMeta.image) {
    // Handle both array of images and single image
    if (Array.isArray(finalMeta.image)) {
      image = finalMeta.image[0]; // Use first image for primary social media tags
    } else {
      image = finalMeta.image;
    }
  }

  // og:image (primary)
  let ogImage = document.querySelector('meta[property="og:image"]');
  if (!ogImage) {
    ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    document.head.appendChild(ogImage);
  }
  ogImage.setAttribute('content', image);

  // Add additional og:image tags for multi-image support
  if (finalMeta && finalMeta.image && Array.isArray(finalMeta.image) && finalMeta.image.length > 1) {
    // Remove any existing additional og:image tags first
    const existingAdditionalImages = document.querySelectorAll('meta[property="og:image"][data-additional="true"]');
    existingAdditionalImages.forEach(img => img.remove());
    
    // Add additional images (skip first one as it's already set above)
    for (let i = 1; i < Math.min(finalMeta.image.length, 4); i++) { // Limit to 4 images total
      const additionalOgImage = document.createElement('meta');
      additionalOgImage.setAttribute('property', 'og:image');
      additionalOgImage.setAttribute('data-additional', 'true');
      additionalOgImage.setAttribute('content', finalMeta.image[i]);
      document.head.appendChild(additionalOgImage);
    }
  }

  // twitter:image
  let twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (!twitterImage) {
    twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    document.head.appendChild(twitterImage);
  }
  twitterImage.setAttribute('content', image);

  // Update image alt text for social media
  const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
  const twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]');
  const altText = finalMeta && finalMeta.altText ? finalMeta.altText : `${formatted} collection at Outback Gems & Minerals`;
  
  if (ogImageAlt) ogImageAlt.setAttribute('content', altText);
  if (twitterImageAlt) twitterImageAlt.setAttribute('content', altText);

  // Update breadcrumb schema if category is present
  if (categoryKeyword) {
    updateBreadcrumbSchema(categoryKeyword, formatted);
  }
  
  // Optionally update canonical URL (already handled by setupCanonicalUrl)
}

// Function to generate dynamic fallback SEO for subcategories
function generateSubcategoryFallback(mainCategory, subCategory) {
  const formattedMain = formatCategoryHeader(mainCategory);
  const formattedSub = formatCategoryHeader(subCategory);
  
  // Category-specific fallback templates
  const templates = {
    'tumbles': {
      title: `${formattedSub} Tumbled Stones | Polished Crystal Tumbles | Outback Gems & Minerals`,
      description: `Beautiful ${formattedSub.toLowerCase()} tumbled stones - premium polished crystals perfect for collecting, jewelry making and crystal healing practices.`,
      keywords: `${formattedSub.toLowerCase()} tumbles, ${formattedSub.toLowerCase()} stones, polished ${formattedSub.toLowerCase()}, tumbled crystals, healing stones`,
      image: "https://www.outbackgems.com.au/images/category-cards/other-tumbles.jpeg",
      altText: `${formattedSub} tumbled stones at Outback Gems & Minerals`
    },
    'carvings & collectibles': {
      title: `${formattedSub} Crystal Carvings | Handcrafted Gemstone Art | Outback Gems & Minerals`,
      description: `Beautiful ${formattedSub.toLowerCase()} crystal carvings and collectible pieces. Handcrafted gemstone art perfect for display and collecting.`,
      keywords: `${formattedSub.toLowerCase()} carvings, crystal ${formattedSub.toLowerCase()}, gemstone art, collectible crystals, handcrafted stones`,
      image: "https://www.outbackgems.com.au/images/category-cards/Other-Thunder-Egg.jpeg",
      altText: `${formattedSub} crystal carvings at Outback Gems & Minerals`
    },
    'faceting rough': {
      title: `${formattedSub} Faceting Rough | Premium Cutting Material | Outback Gems & Minerals`,
      description: `Premium ${formattedSub.toLowerCase()} faceting rough material. High-quality stones perfect for lapidary work and gemstone cutting projects.`,
      keywords: `${formattedSub.toLowerCase()} rough, faceting material, ${formattedSub.toLowerCase()} cutting, lapidary stones, rough gemstones`,
      image: "https://www.outbackgems.com.au/images/category-cards/Synthetic-Spinel.jpeg",
      altText: `${formattedSub} faceting rough at Outback Gems & Minerals`
    },
    'raw material & specimens': {
      title: `${formattedSub} Specimens | Natural Mineral Collection | Outback Gems & Minerals`,
      description: `Premium ${formattedSub.toLowerCase()} specimens and natural mineral pieces. Perfect for collectors, education and mineral enthusiasts.`,
      keywords: `${formattedSub.toLowerCase()} specimens, natural ${formattedSub.toLowerCase()}, mineral collection, collector stones, raw materials`,
      image: "https://www.outbackgems.com.au/images/category-cards/other-herkimer-diamonds.jpeg",
      altText: `${formattedSub} specimens at Outback Gems & Minerals`
    },
    'slabs': {
      title: `${formattedSub} Slabs | Natural Rough Slabs | Outback Gems & Minerals`,
      description: `Premium ${formattedSub.toLowerCase()} slabs perfect for lapidary work, cabochon cutting and decorative projects.`,
      keywords: `${formattedSub.toLowerCase()} slabs, natural rough slabs, lapidary material, cabochon material, stone slabs`,
      image: "https://www.outbackgems.com.au/images/category-cards/Other-Agate-Slice.jpeg",
      altText: `${formattedSub} slabs at Outback Gems & Minerals`
    }
  };
  
  return templates[mainCategory] || {
    title: `${formattedSub} | ${formattedMain} | Outback Gems & Minerals`,
    description: `Browse our ${formattedSub.toLowerCase()} collection in ${formattedMain.toLowerCase()}. Quality specimens at Outback Gems & Minerals.`,
    keywords: `${formattedSub.toLowerCase()}, ${formattedMain.toLowerCase()}, gemstones, minerals, crystals`,
    image: "https://www.outbackgems.com.au/images/main/bbj005.jpeg",
    altText: `${formattedSub} collection at Outback Gems & Minerals`
  };
}

// Function to generate dynamic fallback SEO for main categories
function generateMainCategoryFallback(categoryKeyword) {
  const formatted = formatCategoryHeader(categoryKeyword);
  
  return {
    title: `${formatted} Collection | Premium Quality | Outback Gems & Minerals`,
    description: `Browse our premium ${formatted.toLowerCase()} collection. Quality specimens and materials perfect for collectors and enthusiasts at Outback Gems & Minerals.`,
    keywords: `${formatted.toLowerCase()}, ${categoryKeyword.replace(/\s+/g, ' ')}, gemstones, minerals, crystals, quality specimens`,
    image: "https://www.outbackgems.com.au/images/main/bbj005.jpeg",
    altText: `${formatted} collection at Outback Gems & Minerals`
  };
}

// Function to update breadcrumb schema dynamically
function updateBreadcrumbSchema(categoryKeyword, formattedCategory) {
  // Remove existing breadcrumb schema
  const existingBreadcrumb = document.querySelector('script[type="application/ld+json"]');
  if (existingBreadcrumb && existingBreadcrumb.textContent.includes('BreadcrumbList')) {
    existingBreadcrumb.remove();
  }

  // Create new breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.outbackgems.com.au/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": "https://www.outbackgems.com.au/products.html"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": formattedCategory,
        "item": window.location.href
      }
    ]
  };

  // Add new breadcrumb schema to head
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(breadcrumbSchema, null, 2);
  document.head.appendChild(script);
}

// Function to create product catalog schema for the current category
function createProductCatalogSchema(categoryKeyword, products) {
  // Remove existing product catalog schema
  const existingCatalog = document.querySelectorAll('script[type="application/ld+json"]');
  existingCatalog.forEach(script => {
    if (script.textContent.includes('ItemList') || script.textContent.includes('hasOfferCatalog')) {
      script.remove();
    }
  });

  if (!products || products.length === 0) return;

  const meta = categoryKeyword && categoryMeta[categoryKeyword] ? categoryMeta[categoryKeyword] : null;
  const categoryName = meta ? meta.category : (categoryKeyword ? formatCategoryHeader(categoryKeyword) : "All Products");
  
  // Create product list schema
  const productListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${categoryName} Collection`,
    "description": meta ? meta.description : `Browse our collection of ${categoryName.toLowerCase()} at Outback Gems & Minerals`,
    "numberOfItems": products.length,
    "itemListElement": products.slice(0, 10).map((product, index) => ({
      "@type": "Product",
      "position": index + 1,
      "name": product.name || `Product ${product.id}`,
      "description": product.description || `Premium ${categoryName.toLowerCase()} specimen`,
      "image": product.images && product.images.length > 0 ? `https://www.outbackgems.com.au/${product.images[0]}` : "https://www.outbackgems.com.au/images/logo.png",
      "url": `https://www.outbackgems.com.au/view-product.html?id=${product.id}`,
      "sku": product.id,
      "offers": {
        "@type": "Offer",
        "price": product.price || "0.00",
        "priceCurrency": "AUD",
        "availability": "https://schema.org/InStock"
      }
    }))
  };

  // Add schema to head
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(productListSchema, null, 2);
  document.head.appendChild(script);
}