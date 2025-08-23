

getProductData().then(products => {
  // Only keep unique product ids (same as products.js)
  const seen = new Set();
  const uniqueProducts = products.filter(product => {
    if (seen.has(product["product id"])) return false;
    seen.add(product["product id"]);
    return true;
  });

  uniqueProducts.forEach(product => {
    // Use the main category directly
    const mainCategory = (product.category || "").toLowerCase();
    let added = false;
    
    if (mainCategory.includes("natural")) {
      addProductToList("sitemap-natural-list", product);
      added = true;
    }
    if (mainCategory.includes("synthetic")) {
      addProductToList("sitemap-synthetic-list", product);
      added = true;
    }
    if (!added) {
      addProductToList("sitemap-other-list", product);
    }
  });
});

function addProductToList(listId, product) {
  const ul = document.getElementById(listId);
  if (!ul) return;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
  a.textContent = product["product name"];
  li.appendChild(a);
  ul.appendChild(li);
}




