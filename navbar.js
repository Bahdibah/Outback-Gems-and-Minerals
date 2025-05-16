let cachedProducts = [];
let debounceTimeout;

// Debugging: Ensure the script is loaded

function fetchProductData() {
  return fetch("https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjckrSmV4Q396r2J5437VHynXSLyUYow6iqkCoXEY7HrOg2cr_voo08MQL6qcMM04pBDpWPA1kgKDaTRUEOJBZ48B-SMN75SrRx86Pow9494AvOa4RBDe-WLCDnlG85PhU5LDk8GvqfMbrbDHzmS9kAs0tPivdOdAxqxdhgCnvUxPy8IKXdl6i92dL9O3GKWDjsSqKlqqa9bKbFxAnZn8oVEil2fg5qGD_Izy_rtBqgkVDTQpttRxrY86FnFn8373jngn3hJLR3QkHgvIWAzf2wa9cjBsGiOi70hv-IAu87d_WCywlb4vX0d2RHsA&lib=MreWV8qvFAXZ2-rISPaQS69qZewlWwj59")
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      cachedProducts = data;
    })
    .catch(error => {
    });
}

function debounceSearch() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    search();
  }, 300);
}

function search() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  if(searchTerm !="") {
  const results = cachedProducts.filter(product =>
    product["product name"].toLowerCase().includes(searchTerm)
  );
  displayResults(results);}
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

        // Hide search results when clicking outside the search input or results
        document.addEventListener("click", (event) => {

          if (
            !event.target.closest("#search-input") &&
            !event.target.closest("#search-results-container") &&
            !event.target.closest("#search-button")
            ) {
            document.querySelector('.search-results-container').style.visibility = 'hidden'
            } else {
            document.querySelector('.search-results-container').style.visibility = 'visible'
            }
        });
      } else {
        console.error("Navbar container not found in the DOM.");
      }
    })
    
    .catch(error => {
      console.error("Error loading navbar:", error);
    });;
});