const CATEGORY_DISPLAY = {
  synthetic: "Synthetic Rough",
  natural: "Natural Rough",
  other: "Other Products"
};

function formatSubcategory(cat) {
  return cat.replace(/^[^-]+-/, '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
}

function loadSubcategories(products) {
  const categories = {
    synthetic: new Set(),
    natural: new Set(),
    other: new Set()
  };

  products.forEach(prod => {
    const [main] = prod.category.split('-');
    if (categories[main]) {
      categories[main].add(prod.category);
    }
  });

  Object.entries(categories).forEach(([main, subcats]) => {
    const ul = document.getElementById(`${main}-subcategories`);
    if (ul) {
      ul.innerHTML = Array.from(subcats).sort().map(subcat =>
        `<li><a href="#" class="side-menu-toggle" data-category="${subcat}">${formatSubcategory(subcat)}</a></li>`
      ).join('');
    }
  });
}

function setSubcategoryHeights() {
  document.querySelectorAll('.category-card').forEach(card => {
    const sublist = card.querySelector('.subcategory-list');
    if (!sublist) return;
    if (card.classList.contains('open')) {
      sublist.style.maxHeight = sublist.scrollHeight + 'px';
    } else {
      sublist.style.maxHeight = '0px';
    }
  });
}

function initializeSideMenu() {
  const sideMenu = document.getElementById('side-menu');
  if (!sideMenu) return;

  sideMenu.addEventListener('click', function(e) {
    // Expand/collapse
    if (e.target.classList.contains('category-expand')) {
      e.preventDefault();
      e.stopPropagation();
      const card = e.target.closest('.category-card');
      const sublist = card.querySelector('.subcategory-list');

      // Toggle class
      card.classList.toggle('open');

      // Force reflow before setting maxHeight
      void sublist.offsetWidth;

      // Set height accordingly
      if (card.classList.contains('open')) {
        sublist.style.maxHeight = sublist.scrollHeight + 'px';
      } else {
        sublist.style.maxHeight = '0';
      }
      return;
    }

    // Navigation
    if (e.target.classList.contains('side-menu-toggle')) {
      e.preventDefault();
      const categoryKeyword = e.target.getAttribute('data-category');
      window.location.href = `products.html?category=${encodeURIComponent(categoryKeyword)}`;
    }
  });
}

// --- Caching logic ---
const CACHE_KEY = 'sideMenuProducts';
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

function getCachedProducts() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedProducts(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}

function fetchAndLoadMenu() {
  const cached = getCachedProducts();
  if (cached) {
    loadSubcategories(cached);
    initializeSideMenu();
  } else {
    fetch("https://script.google.com/macros/s/AKfycbyCY8VW0D1A7AFJiU7X6tN5-RTrnYxQIV4QCzmFprxYrCVv2o4uKWnmKfJ6Xh40H4uqXA/exec")
      .then(res => res.json())
      .then(products => {
        setCachedProducts(products);
        loadSubcategories(products);
        initializeSideMenu();
      });
  }
}


