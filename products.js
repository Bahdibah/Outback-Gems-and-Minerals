// Dynamically load the side menu first
fetch("side-menu.html")
  .then(response => response.text())
  .then(html => {
    document.getElementById("side-menu-container").innerHTML = html;
    // Now let side-menu.js handle the rest:
    if (typeof fetchAndLoadMenu === "function") {
      fetchAndLoadMenu(); // This should load subcategories and initialize the menu
    }

    // --- Product loading logic STARTS here ---
    const productContainer = document.getElementById("dynamic-product-container");
    const productHeader = document.querySelector(".dynamic-product-header-title");

    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }

    const categoryKeyword = getQueryParam("category");

    if (categoryKeyword) {
      const sideMenuItem = document.querySelector(`.side-menu-toggle[data-category="${categoryKeyword}"]`);
      if (sideMenuItem) {
        loadProductsByCategory(categoryKeyword);
      } else {
        loadProductsByCategory(); // fallback
      }
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
        loadProductsByCategory(categoryKeyword);
      });
    });

    // Function to load products by category keyword
    function loadProductsByCategory(keyword = null) {
      productContainer.innerHTML = "<p>Loading products...</p>";

      fetch("https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec")
        .then(response => response.json())
        .then(data => {
          if (data && data.length > 0) {
            let filteredProducts;
            if (keyword) {
              filteredProducts = data.filter(product => product.category.includes(keyword));
            } else {
              filteredProducts = data;
            }
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
      const headerTitleDiv = document.createElement("div");
      headerTitleDiv.className = "dynamic-product-header-title";
      headerTitleDiv.textContent = headerTitle;
      const divider = document.createElement("hr");
      divider.className = "product-header-divider";
      headerContainer.appendChild(headerTitleDiv);
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
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];

          const productDescription = document.createElement("p");
          productDescription.textContent = product.description;

          const priceLine = document.createElement("p");
          priceLine.textContent = `$${product["price per unit"]} per ${product.unit}`;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "View Details";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          productCard.appendChild(productDescription);
          productCard.appendChild(priceLine);
          productCard.appendChild(productButton);

          productContainer.appendChild(productCard);
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
          imageContainer.appendChild(img);

          const productName = document.createElement("h3");
          productName.textContent = product["product name"];

          const productDescription = document.createElement("p");
          productDescription.textContent = product.description;

          const priceLine = document.createElement("p");
          priceLine.textContent = `$${product["price per unit"]} per ${product.unit}`;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "View Details";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          productCard.appendChild(productDescription);
          productCard.appendChild(priceLine);
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
  });

// Helper function for formatting category headers
function formatCategoryHeader(keyword) {
  if (!keyword) return "All Products";
  return keyword
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}