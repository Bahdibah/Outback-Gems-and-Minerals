let cachedProducts = [];
let debounceTimeout;
let loading = true; // Track whether data is still loading

// Debugging: Ensure the script is loaded

function fetchProductData() {
  loading = true; // Set loading to true while fetching data
  return fetch("https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjckrSmV4Q396r2J5437VHynXSLyUYow6iqkCoXEY7HrOg2cr_voo08MQL6qcMM04pBDpWPA1kgKDaTRUEOJBZ48B-SMN75SrRx86Pow9494AvOa4RBDe-WLCDnlG85PhU5LDk8GvqfMbrbDHzmS9kAs0tPivdOdAxqxdhgCnvUxPy8IKXdl6i92dL9O3GKWDjsSqKlqqa9bKbFxAnZn8oVEil2fg5qGD_Izy_rtBqgkVDTQpttRxrY86FnFn8373jngn3hJLR3QkHgvIWAzf2wa9cjBsGiOi70hv-IAu87d_WCywlb4vX0d2RHsA&lib=MreWV8qvFAXZ2-rISPaQS69qZewlWwj59")
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      cachedProducts = data;
      loading = false; // Set loading to false once data is loaded
    })
    .catch(error => {
      loading = false; // Ensure loading is set to false even if there's an error
      console.error("Error fetching product data:", error);
    });
}

function debounceSearch() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    search();
  }, 300);
}

function search() {
  const resultContainer = document.getElementById("results");
  const searchTerm = document.getElementById("search-input")?.value.toLowerCase() || "";

  // Initialize results container if it doesn't exist
  if (!resultContainer) {
    const searchResultsContainer = document.getElementById("search-results-container");
    
    // Create results list if it doesn't exist
    const newResultsList = document.createElement("ul");
    newResultsList.id = "results";
    newResultsList.className = "search-results";
    searchResultsContainer.appendChild(newResultsList);
    return; // Exit and let the next search handle displaying results
  }

  // Check if data is still loading
  if (loading) {
    resultContainer.innerHTML = "<p>Loading products...</p>"; // Show loading message

    // Wait and retry the search once loading is complete
    setTimeout(() => {
      search(); // Retry the search
    }, 100); // Retry every 100ms
    return;
  }

  // Proceed with the search once loading is complete
  if (searchTerm !== "") {
    const filteredProducts = cachedProducts.filter(product =>
      product["product name"].toLowerCase().includes(searchTerm)
    );

    // Then, get only unique product ids
    const uniqueProducts = getUniqueByProductId(filteredProducts);

    displayResults(uniqueProducts);
  }   else {
    // If search bar is empty, clear results
    displayResults([]);
  }
}

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

function displayResults(results) {
  const resultContainer = document.getElementById("results");
  if (!resultContainer) return; // Exit if container is not found
   resultContainer.innerHTML= ""

  if (results.length === 0) {
    resultContainer.innerHTML = "<p>No products found.</p>";
    return;
  }

  const maxResults = 10;
  results.slice(0, maxResults).forEach(result => {
    const listItem = document.createElement("li");

    const img = document.createElement("img");
    img.src = result["image url"];
    img.alt = result["product name"];
    img.style.width = "50px";
    img.style.height = "50px";
    img.style.objectFit = "cover";
    img.style.marginRight = "10px";

    const text = document.createElement("span");
    text.textContent = result["product name"];

    listItem.onclick = () => {
      window.location.href = `view-product.html?productid=${encodeURIComponent(result["product id"])}`;
    };

    listItem.appendChild(img);
    listItem.appendChild(text);
    resultContainer.appendChild(listItem);
  });
}

// Update the cart count in the navbar
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) cartCountElement.textContent = totalItems;
}

// Update the cart dropdown in the navbar
function updateCartDropdown() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartItemsList = document.getElementById("cart-items-list");
  const cartMessage = document.getElementById("cart-message");
  const cartTotal = document.getElementById("cart-total");

  if (!cartItemsList || !cartMessage || !cartTotal) {
    console.error("Cart dropdown elements not found in the DOM.");
    return;
  }

  if (cart.length === 0) {
    cartMessage.textContent = "Your cart is empty.";
    cartItemsList.innerHTML = "";
    cartTotal.textContent = "$0.00";
    return;
  }

  let subtotal = 0;
  cartItemsList.innerHTML = ""; // Clear existing items

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");

    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
      <div class="cart-item-details">
        <span class="product-name">${item.name}</span>
        <span class="product-code">Code: ${item.id}</span>
        <span class="product-quantity">Qty: ${item.quantity}</span>
      </div>
      <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
    `;

    cartItemsList.appendChild(cartItem);
  });

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartMessage.textContent = `You currently have ${totalQuantity} items in your cart`;
  cartTotal.textContent = `$${subtotal.toFixed(2)}`;
}

// Listen for cartUpdated event
document.addEventListener("cartUpdated", function() {
  updateCartCount();
  updateCartDropdown();
});

document.addEventListener("DOMContentLoaded", () => {

  // Fetch product data
  fetchProductData();

  // Wait for navbar.html to load
  fetch("navbar.html")
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load navbar. Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      const navbarContainer = document.querySelector("header") || document.getElementById("navbar-container");
      if (navbarContainer) {
        navbarContainer.innerHTML = html;

            // --- Add burger menu toggle here ---
          const burger = document.getElementById("burger-menu");
          const navLinksBurger = document.querySelector("nav ul.burger-nav-links");
          if (burger && navLinksBurger) {
            burger.addEventListener("click", function () {
              navLinksBurger.classList.toggle("open");
            });
            navLinksBurger.querySelectorAll("a").forEach(link => {
              link.addEventListener("click", () => {
                navLinksBurger.classList.remove("open");
              });
            });

            // Add new click handler for clicking outside
            document.addEventListener("click", (event) => {
              if (!event.target.closest("#burger-menu") && 
                  !event.target.closest(".burger-nav-links") && 
                  navLinksBurger.classList.contains("open")) {
                  navLinksBurger.classList.remove("open");
          }
        });
          }
        // --- End burger menu toggle ---
        // Add event listener for checkout button
        const checkoutBtn = document.getElementById("checkout-button");
        if (checkoutBtn) {
          checkoutBtn.addEventListener("click", function() {
            window.location.href = "cart.html";
          });
        }

  
        const searchButton = document.getElementById('search-button');
        const searchInput = document.getElementById('search-input');
        const searchContainer = searchInput?.closest('.navbar-search');
        if (searchButton && searchInput && searchContainer) {
          searchButton.addEventListener('click', (e) => {
            if (window.innerWidth <= 900) {
              e.preventDefault();
              searchContainer.classList.add('mobile-search-active');
              searchInput.focus();
            } else {
              search();
            }
          });
          
          searchInput.addEventListener("focus", search);
          searchInput.addEventListener("input", debounceSearch);
          searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          });
  
          // Optionally, hide input when it loses focus
          searchInput.addEventListener('blur', () => {
            if (window.innerWidth <= 900) {
              //Set delay for the searchbar to disappear to allow results to disappear first
              setTimeout(() => {
              searchContainer.classList.remove('mobile-search-active');
              }, 300);
            }
          });
        };
            

        // Now that the navbar is loaded, access the search input and results container
        const resultContainer = document.getElementById("search-results-container");

        if (!searchInput || !resultContainer) {
          console.error("searchInput or resultContainer not found after loading navbar");
          return;
        }
        
        // Hide search results when clicking outside the search input or results
        document.addEventListener("click", (event) => {          
        const searchInput = document.getElementById("search-input");
        const resultsContainer = document.getElementById("search-results-container");
        if  (
            !event.target.closest("#search-input") &&
            !event.target.closest("#search-results-container") &&
            !event.target.closest("#search-button")
          ) {
            document.querySelector('.search-results-container').style.visibility = 'hidden';
            if (searchInput.value.trim() === "") {
            resultsContainer.innerHTML = ""; // Clear results if input is empty
            }
          } else {
            document.querySelector('.search-results-container').style.visibility = 'visible';
          }
        });

        updateCartCount();
        updateCartDropdown();

        //Hightlght navlink for current page
        // Highlight navlink for current page/category
        const navLinks = document.querySelectorAll("nav ul li a");
        const currentPath = window.location.pathname.split("/").pop().toLowerCase() || "index.html";
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get("category");
        const mainCategory = categoryParam ? categoryParam.split('-')[0].toLowerCase() : null;

        // Clear all existing active classes first
        navLinks.forEach(link => {
          link.classList.remove("active");
        });

        // EXPLICIT: Remove active class from category links (synthetic, natural, other)
        const categoryLinks = document.querySelectorAll('a[href*="synthetic"], a[href*="natural"], a[href*="other"]');
        categoryLinks.forEach(link => {
          link.classList.remove("active");
        });

        // Additional timeout to ensure active classes stay removed
        setTimeout(() => {
          navLinks.forEach(link => link.classList.remove("active"));
          categoryLinks.forEach(link => link.classList.remove("active"));
        }, 100);

        // Map mainCategory to high-level page
        const categoryToPage = {
          synthetic: "synthetic.html",
          natural: "natural.html",
          other: "other.html"
        };

        let categoryLinkHighlighted = false;

        // Removed category highlighting logic - no highlighting when viewing filtered products page
        // if (
        //   (currentPath === "products.html" || currentPath === "view-product.html") &&
        //   mainCategory &&
        //   categoryToPage[mainCategory]
        // ) {
        //   navLinks.forEach(link => {
        //     const href = link.getAttribute("href").replace(/^\//, '').toLowerCase();
        //     if (href === categoryToPage[mainCategory]) {
        //       link.classList.add("active");
        //       categoryLinkHighlighted = true;
        //     }
        //   });
        // }

        // Highlight only exact page matches (not filtered category pages)
        // DISABLED: We don't want category highlighting on filtered pages
        // if (!categoryLinkHighlighted) {
        //   navLinks.forEach(link => {
        //     const linkPath = link.getAttribute("href").replace(/^\//, '').split("?")[0].split("#")[0].toLowerCase();
        //     if (linkPath === currentPath) {
        //       link.classList.add("active");
        //     }
        //   });
        // }
      } else {
        console.error("Navbar container not found in the DOM.");
      }
    })
    .catch(error => {
      console.error("Error loading navbar:", error);
    });
});

// Removed category highlighting event listener - no highlighting for filtered category pages
// document.addEventListener("productCategoryLoaded", function(e) {
//   const category = e.detail.category;
//   const mainCategory = category ? category.split('-')[0].toLowerCase() : null;
//   const categoryToPage = {
//     synthetic: "synthetic.html",
//     natural: "natural.html",
//     other: "other.html"
//   };
//   const navLinks = document.querySelectorAll("nav ul li a");
//   if (mainCategory && categoryToPage[mainCategory]) {
//     navLinks.forEach(link => {
//       const href = link.getAttribute("href").replace(/^\//, '').toLowerCase();
//       if (href === categoryToPage[mainCategory]) {
//         link.classList.add("active");
//       }
//     });
//   }
// });
