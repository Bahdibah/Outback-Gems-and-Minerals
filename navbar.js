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
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  if (searchTerm !== "") {
    const results = cachedProducts.filter(product =>
      product["product name"].toLowerCase().includes(searchTerm)
    );

    displayResults(results);
  }   
}

function displayResults(results) {
  const resultContainer = document.getElementById("results");
  resultContainer.innerHTML = "";

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

  cartMessage.textContent = `You currently have ${cart.length} items in your cart.`;
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

        // Now that the navbar is loaded, access the search input and results container
        const searchInput = document.getElementById("search-input");
        const resultContainer = document.getElementById("search-results-container");

        if (!searchInput || !resultContainer) {
          console.error("searchInput or resultContainer not found after loading navbar");
          return;
        }

        // Add event listener for input changes
        searchInput.addEventListener("input", debounceSearch);

        console.log("Before keypress loop")
        console.log("Search input element:", searchInput);
        // Trigger search on Enter key press
        searchInput.addEventListener("keydown", (event) => {
          console.log("In keypress main function");
          console.log("Search input element:", searchInput);
          if (event.key === "Enter") {
            console.log("In keypress if loop");
            event.preventDefault(); // Prevent default behavior (e.g., form submission)
            search(); // Trigger the search function
          }
        });

        console.log("After keypress loop")
        console.log("Search input element:", searchInput);
        // Hide search results when clicking outside the search input or results
        document.addEventListener("click", (event) => {
          if (
            !event.target.closest("#search-input") &&
            !event.target.closest("#search-results-container") &&
            !event.target.closest("#search-button")
          ) {
            document.querySelector('.search-results-container').style.visibility = 'hidden';
          } else {
            document.querySelector('.search-results-container').style.visibility = 'visible';
          }
        });

        // <-- ADD THESE LINES HERE:
        updateCartCount();
        updateCartDropdown();
      } else {
        console.error("Navbar container not found in the DOM.");
      }
    })
    .catch(error => {
      console.error("Error loading navbar:", error);
    });
});
