// Breadcrumb Navigation System
class BreadcrumbManager {
  constructor() {
    this.breadcrumbContainer = document.getElementById('breadcrumb-container');
    this.breadcrumbList = document.getElementById('breadcrumb-list');
    this.init();
  }

  init() {
    // Initialize breadcrumb based on current page
    this.updateBreadcrumb();
  }

  // Update breadcrumb based on URL parameters and page
  updateBreadcrumb() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const subcategory = urlParams.get('subcategory');
    const productType = urlParams.get('type');
    const currentPage = window.location.pathname.split('/').pop();

    let breadcrumbs = [];

    // Always start with Home
    breadcrumbs.push({ text: 'Home', url: 'index.html' });

    // Add main category based on page
    if (currentPage.includes('synthetic')) {
      breadcrumbs.push({ text: 'Synthetic Materials', url: 'synthetic.html' });
    } else if (currentPage.includes('natural')) {
      breadcrumbs.push({ text: 'Natural Products', url: 'natural.html' });
    } else if (currentPage.includes('other')) {
      breadcrumbs.push({ text: 'Finished Products', url: 'other.html' });
    }

    // Add subcategories if they exist
    if (category) {
      breadcrumbs.push({ text: this.formatCategoryName(category), url: `products.html?category=${category}` });
    }

    if (subcategory) {
      breadcrumbs.push({ text: this.formatCategoryName(subcategory), url: `products.html?category=${category}&subcategory=${subcategory}` });
    }

    if (productType) {
      breadcrumbs.push({ text: this.formatCategoryName(productType), url: `products.html?category=${category}&subcategory=${subcategory}&type=${productType}` });
    }

    this.renderBreadcrumbs(breadcrumbs);
  }

  // Format category names for display
  formatCategoryName(category) {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Render breadcrumbs in the DOM
  renderBreadcrumbs(breadcrumbs) {
    if (breadcrumbs.length <= 1) {
      this.breadcrumbContainer.style.display = 'none';
      return;
    }

    this.breadcrumbContainer.style.display = 'block';
    this.breadcrumbList.innerHTML = '';

    breadcrumbs.forEach((crumb, index) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      if (index === breadcrumbs.length - 1) {
        // Last item - current page (no link)
        li.innerHTML = `<span class="breadcrumb-current">${crumb.text}</span>`;
        li.setAttribute('aria-current', 'page');
      } else {
        // Linked items
        li.innerHTML = `<a href="${crumb.url}" class="breadcrumb-link">${crumb.text}</a>`;
      }

      this.breadcrumbList.appendChild(li);

      // Add separator (except for last item)
      if (index < breadcrumbs.length - 1) {
        const separator = document.createElement('li');
        separator.className = 'breadcrumb-separator';
        separator.innerHTML = '<span aria-hidden="true">›</span>';
        this.breadcrumbList.appendChild(separator);
      }
    });
  }

  // Method to manually set breadcrumbs (for dynamic content)
  setBreadcrumbs(breadcrumbs) {
    this.renderBreadcrumbs(breadcrumbs);
  }
}

// Initialize breadcrumb manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.breadcrumbManager = new BreadcrumbManager();
});
