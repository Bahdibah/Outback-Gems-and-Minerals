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

function fetchAndLoadMenu() {
  getProductData()
    .then(products => {
      loadSubcategories(products);
      initializeSideMenu();
    });
}


