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

          const productDescription = document.createElement("p");
          productDescription.textContent = product.description;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "View Details";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          productCard.appendChild(productDescription);
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

          const productDescription = document.createElement("p");
          productDescription.textContent = product.description;

          const productButton = document.createElement("button");
          productButton.classList.add("dynamic-product-button");
          productButton.textContent = "View Details";
          productButton.onclick = () => {
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          };

          productCard.appendChild(imageContainer);
          productCard.appendChild(productName);
          productCard.appendChild(productDescription);
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
  const parts = keyword.split("-");
  const subcategory = parts[parts.length - 1];
  const formatted = subcategory.replace(/\b\w/g, c => c.toUpperCase());
  return `Buy ${formatted}`;
}

// Mapping for custom SEO meta tags per category
const categoryMeta = {
  "synthetic-spinel": {
    title: "Buy Synthetic Spinel from Our Range of Premium Faceting Material – Outback Gems",
    description: "Shop our range of vivid synthetic spinel gemstones. Perfect for collectors and cutters. High-quality, affordable, and available in a variety of colours at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Synthetic Spinel.jpg"
  },
  "synthetic-sapphire": {
    title: "Buy Synthetic Sapphire from Our Range of Premium Faceting Material – Outback Gems",
    description: "Discover durable, brilliantly coloured synthetic sapphires for faceting and jewellery. Shop now at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Synthetic CZ.jpg"
  },
  "synthetic-cubic-zirconia": {
    title: "Buy Synthetic Cubic Zirconia from Our Range of Premium Faceting Material – Outback Gems",
    description: "Browse our selection of high-brilliance synthetic cubic zirconia. Perfect for faceting projects and jewellery. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Synthetic CZ.jpg"
  },
  "natural-zircon": {
    title: "Buy Natural Zircon from Our Range of Premium Natural Rough and Faceting Material – Outback Gems",
    description: "Shop natural zircon gemstones with rich tones and ancient origins. Brilliant, fiery, and unique. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Natural Zircon.jpg"
  },
  "natural-sapphire": {
    title: "Buy Natural Sapphire from Our Range of Premium Natural Rough and Faceting Material – Outback Gems",
    description: "Explore the timeless beauty of natural sapphires. Vivid colours, exceptional durability. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Natural Zircon.jpg"
  },
  "natural-garnet": {
    title: "Buy Natural Garnet from Our Range of Premium Natural Rough and Faceting Material – Outback Gems",
    description: "Shop natural garnet gemstones known for their brilliance and fire. Rich tones and ancient origins. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Amethyst.jpg"
  },
  "natural-apatite": {
    title: "Buy Natural Apatite from Our Range of Premium Natural Rough and Faceting Material – Outback Gems",
    description: "Apatite in vibrant blue and green hues. Unique phosphate mineral specimens. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Amethyst.jpg"
  },
  "natural-amethyst": {
    title: "Buy Natural Amethyst Specimens from Our Range of Gems and Minerals – Outback Gems",
    description: "Amethyst: the purple variety of quartz. Rich colour, perfect for collections and creative projects. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Amethyst.jpg"
  },
  "natural-smoky-quartz": {
    title: "Buy Natural Smoky Quartz - Outback Gems",
    description: "Smoky Quartz: brown to grey quartz, valued for grounding tones and natural crystal formations. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Smoky Quartz.jpg"
  },
  "natural-peridot": {
    title: "Buy Natural Peridot Specimens from Our Range of Gems and Minerals – Outback Gems",
    description: "Peridot (olivine): vibrant green gemstone formed deep within the Earth. Distinctive lime-green hue. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Olivine.jpg"
  },
  "other-olivine": {
    title: "Buy Olivine (Peridot) Specimens from Our Range of Gems and Minerals – Outback Gems",
    description: "Olivine, also known as peridot, is a vibrant green gemstone from deep within the Earth. Shop at Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Olivine.jpg"
  },
  "other-sapphire-wash-bags": {
    title: "Buy Sapphire Washbags for Gem Fossicking – Direct from Queensland Gemfields | Outback Gems",
    description: "Experience fossicking at home with our Sapphire Washbags from the Queensland Gemfields. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Washbag.jpg"
  },
  "other-thunder-eggs": {
    title: "Buy Thunder Eggs - Outback Gems",
    description: "Thunder eggs: crack them open to reveal vibrant patterns and hidden crystals. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Thunder Egg.jpg"
  },
  "other-agate-slices": {
    title: "Buy Agate Slices - Outback Gems",
    description: "Agate slices: natural banding and vibrant colours for display, decoration, or creative use. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Agate Slice.jpg"
  },
  "other-yowah-nuts": {
    title: "Buy Unopened Yowah Nuts – Single, Small, Medium, Large & 3-Packs | Direct from the Queensland Opal Fields | Outback Gems",
    description: "Shop genuine unopened Yowah nuts in single, small, medium, large, and 3-pack options. Direct from Queensland Opal fields. Each unopened nut is a natural surprise—may reveal beautiful banded ironstone or hidden opal. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/Other Yowah Nuts.jpg"
  },
  "other-tumbles": {
    title: "Buy Tumbled Stones – Mixed Gemstone & Mineral Tumbles for Collectors, Gifts & Display | Outback Gems",
    description: "Discover the beauty of nature in miniature with our range of tumbled stones. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/other-tumbles.jpeg"
  },
  "natural-herkimer-diamonds": {
    title: "Buy Herkimer Diamonds – Facetable and Specimen Quartz Crystals | Outback Gems",
    description: "Herkimer diamonds: naturally double-terminated quartz crystals prized for their distinctive formation and sparkle. Outback Gems & Minerals.",
    image: "https://www.outbackgems.com.au/images/category cards/other-herkimer-diamonds.jpeg"
  }
};

function updateCategoryMetaTags(categoryKeyword) {
  let meta = null;
  if (categoryKeyword && categoryMeta[categoryKeyword]) {
    meta = categoryMeta[categoryKeyword];
  }
  // Fallback to generic if not found
  const formatted = categoryKeyword ? formatCategoryHeader(categoryKeyword) : "All Products";
  const title = meta ? meta.title : (categoryKeyword ? `${formatted} - Outback Gems` : "Products - Outback Gems");
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

  // Optionally update canonical URL (already handled by setupCanonicalUrl)
}