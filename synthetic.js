function formatSubcategory(cat) {
  return cat.replace(/^[^-]+-/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
}

async function loadSyntheticProducts() {
  const loadingDiv = document.getElementById("loading-categories");
  const container = document.querySelector(".product-card-container");

  // Show loading message above the cards
  loadingDiv.style.display = "block";
  loadingDiv.style.width = "100%";
  loadingDiv.style.fontSize = "1.5rem";
  loadingDiv.style.color = "#cc5500";
  loadingDiv.style.fontWeight = "bold";
  loadingDiv.style.textAlign = "center";
  loadingDiv.style.whiteSpace = "nowrap";
  loadingDiv.style.margin = "32px 0 24px 0";
  loadingDiv.textContent = "Loading Categories...";

  container.innerHTML = "";

  // Fetch your data as before...
  const apiUrl = "https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec";
  let apiProducts = [];
  try {
    const apiRes = await fetch(apiUrl);
    apiProducts = await apiRes.json();
  } catch (e) {
    console.error("API fetch failed", e);
  }

  let localProducts = [];
  try {
    const localRes = await fetch("products.json");
    localProducts = await localRes.json();
  } catch (e) {
    console.error("Local JSON fetch failed", e);
  }

  // Hide loading message before rendering cards
  loadingDiv.style.display = "none";

  const syntheticProducts = apiProducts.filter(p => p.category && p.category.startsWith("synthetic-"));
  const seenSubcategories = new Set();

  syntheticProducts.forEach(product => {
    const subcategory = product.category.replace(/^synthetic-/, '').toLowerCase();
    if (seenSubcategories.has(subcategory)) return; // Skip duplicates
    seenSubcategories.add(subcategory);

    const localInfo = localProducts.find(lp => lp.category === product.category);
    const image = localInfo?.["category-image"] || "default.jpg";
    const description = localInfo?.["category-description"] || "No description available.";
    const title = formatSubcategory(product.category);

    // Build card using your existing structure
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.backgroundImage = `url('images/${image}')`;
    card.style.backgroundSize = "100%";
    card.style.backgroundRepeat = "no-repeat";
    card.style.backgroundPosition = "center";

    card.innerHTML = `
      <div class="product-card-content">
        <h3 class="product-card-title">${title}</h3>
        <p class="product-card-description">${description}</p>
          <a href="/products.html?category=${encodeURIComponent(product.category)}" data-category="${product.category}">
           <button class="product-button">
            Shop all ${title}
          </button>
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadSyntheticProducts);