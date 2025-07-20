

getProductData().then(products => {
  // Only keep unique product ids (same as products.js)
  const seen = new Set();
  const uniqueProducts = products.filter(product => {
    if (seen.has(product["product id"])) return false;
    seen.add(product["product id"]);
    return true;
  });

  uniqueProducts.forEach(product => {
    const categories = (product.category || "").toLowerCase().split(",").map(c => c.trim());
    let added = false;
    if (categories.some(cat => cat.includes("natural"))) {
      addProductToList("sitemap-natural-list", product);
      added = true;
    }
    if (categories.some(cat => cat.includes("synthetic"))) {
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




