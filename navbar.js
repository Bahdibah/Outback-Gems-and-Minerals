function search() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();

  // Fetch product data from the API
  fetch("https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjckrSmV4Q396r2J5437VHynXSLyUYow6iqkCoXEY7HrOg2cr_voo08MQL6qcMM04pBDpWPA1kgKDaTRUEOJBZ48B-SMN75SrRx86Pow9494AvOa4RBDe-WLCDnlG85PhU5LDk8GvqfMbrbDHzmS9kAs0tPivdOdAxqxdhgCnvUxPy8IKXdl6i92dL9O3GKWDjsSqKlqqa9bKbFxAnZn8oVEil2fg5qGD_Izy_rtBqgkVDTQpttRxrY86FnFn8373jngn3hJLR3QkHgvIWAzf2wa9cjBsGiOi70hv-IAu87d_WCywlb4vX0d2RHsA&lib=MreWV8qvFAXZ2-rISPaQS69qZewlWwj59")
    .then(response => response.json())
    .then(data => {
      // Filter products based on the search term
      const results = data.filter(product =>
        product["product name"].toLowerCase().includes(searchTerm)
      );

      // Display the search results
      displayResults(results);
    })
    .catch(error => {
      console.error("Error fetching product data:", error);
      displayResults([]); // Display no results if there's an error
    });
}

// Attach the search function to the global window object
window.search = search;

function displayResults(results) {
  const resultContainer = document.getElementById("results");
  resultContainer.innerHTML = ""; // Clear previous results

  if (results.length === 0) {
    resultContainer.innerHTML = "<p>No products found.</p>";
    return;
  }

  results.forEach(result => {
    const listItem = document.createElement("li");
    listItem.textContent = result["product name"];
    listItem.onclick = () => {
      // Redirect to the product page
      window.location.href = `view-product.html?productid=${encodeURIComponent(result["product id"])}`;
    };
    resultContainer.appendChild(listItem);
  });
}