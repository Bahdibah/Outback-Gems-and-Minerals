// Background image rotation for other.html
document.addEventListener('DOMContentLoaded', function() {
  const images = [
    "images/banners/Other Banner 1.jpg",
    "images/banners/Other Banner 2.jpg",
    "images/banners/Other Banner 3.jpg",
    "images/banners/Other Banner 4.jpg"
  ];
  let current = 0;
  const homeSection = document.getElementById("home");
  if (homeSection) {
    setInterval(() => {
      current = (current + 1) % images.length;
      homeSection.style.backgroundImage = `url('${images[current]}')`;
    }, 15000); // Change image every 15 seconds
  }
});
function formatSubcategory(cat) {
  return cat.replace(/^[^-]+-/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
}

async function loadOtherProducts() {
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

  let apiProducts = [];
  try {
    apiProducts = await getProductData();
  } catch (e) {
    console.error("Product cache fetch failed", e);
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

  const otherProducts = apiProducts.filter(p => p.category && p.category.startsWith("other-"));
  container.innerHTML = ""; // Clear existing cards

  const seenSubcategories = new Set();

  otherProducts.forEach(product => {
    // Exclude products with multiple categories
    if (product.category.includes(",")) return;

    const subcategory = product.category.replace(/^other-/, '').toLowerCase();
    if (seenSubcategories.has(subcategory)) return; // Skip duplicates
    seenSubcategories.add(subcategory);

    const localInfo = localProducts.find(lp => lp.category === product.category);
    const image = localInfo?.["category-image"] || "default.jpg";
    const description = localInfo?.["category-description"] || "No description available.";
    const title = formatSubcategory(product.category);

    // Build card using the unified structure
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card-image" style="background-image:url('images/category-cards/${image}')"></div>
      <div class="product-card-content">
        <h3 class="product-card-title">${title}</h3>
        <p class="product-card-description">${description}</p>
        <a href="/products.html?category=${encodeURIComponent(product.category)}" class="product-card-button" data-category="${product.category}">
          VIEW ALL
        </a>
      </div>
    `;
    container.appendChild(card);
  });

  // Add ghost cards for grid alignment
  const cardsPerRow = 3;
  const realCards = container.querySelectorAll('.product-card:not(.ghost-card)').length;
  const remainder = realCards % cardsPerRow;
  if (remainder !== 0) {
    const ghostsToAdd = cardsPerRow - remainder;
    for (let i = 0; i < ghostsToAdd; i++) {
      const ghost = document.createElement('div');
      ghost.className = 'product-card ghost-card';
      container.appendChild(ghost);
    }
  }
}

document.addEventListener("DOMContentLoaded", loadOtherProducts);