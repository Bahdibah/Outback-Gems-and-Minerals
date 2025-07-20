function formatSubcategory(cat) {
  return cat.replace(/^[^-]+-/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
}

async function loadNaturalProducts() {
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

  const naturalProducts = apiProducts.filter(p => p.category && p.category.startsWith("natural-"));
  container.innerHTML = ""; 

  const seenSubcategories = new Set();

  naturalProducts.forEach(product => {
    if (product.category.includes(",")) return;

    const subcategory = product.category.replace(/^natural-/, '').toLowerCase();
    if (seenSubcategories.has(subcategory)) return;
    seenSubcategories.add(subcategory);

    const localInfo = localProducts.find(lp => lp.category === product.category);
    const image = localInfo?.["category-image"] || "default.jpg";
    const description = localInfo?.["category-description"] || "No description available.";
    const title = formatSubcategory(product.category);

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

  // After all real cards are appended:
  const cardsPerRow = 3; // Change if your grid-template-columns changes for desktop
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

document.addEventListener("DOMContentLoaded", loadNaturalProducts);
