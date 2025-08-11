// Category Navigation Module
// Shared functionality for category navigation across products.html and view-product.html

class CategoryNavigation {
  constructor() {
    this.categories = [];
    this.categoryLabels = {
      'synthetic': 'Synthetic Rough',
      'natural': 'Natural Rough',
      'other': 'Other Products',
      'carvings': 'Carvings',
      'rough-slabs': 'Rough & Slabs'
    };
  }

  // Dynamically discover main categories from product data
  async discoverMainCategories() {
    try {
      // Get product data
      let products = [];
      if (typeof getProductData === 'function') {
        products = await getProductData();
      } else if (window.productData) {
        products = window.productData;
      } else {
        console.warn('Product data not available for category discovery');
        return;
      }

      const mainCategories = new Set();
      
      // Find all main categories
      products.forEach(product => {
        if (product.category) {
          const categories = product.category.split(',').map(cat => cat.trim().toLowerCase());
          categories.forEach(category => {
            // Extract main category (everything before the first dash)
            const mainCategory = category.includes('-') ? category.split('-')[0] : category;
            if (mainCategory) {
              mainCategories.add(mainCategory);
            }
          });
        }
      });

      // Convert to sorted array and create category objects
      this.categories = Array.from(mainCategories).sort().map(key => ({
        key: key,
        label: this.categoryLabels[key] || this.formatCategoryName(key)
      }));

    } catch (error) {
      console.error("Error discovering main categories:", error);
      // Fallback to empty array if there's an error
      this.categories = [];
    }
  }

  // Format category name for display if no label is defined
  formatCategoryName(categoryKey) {
    return categoryKey.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Create navigation buttons
  async createNavigationButtons(activeCategory) {
    // First discover the main categories from the data
    await this.discoverMainCategories();
    
    // Remove any existing navigation buttons
    const existingNav = document.getElementById('category-navigation');
    if (existingNav) {
      existingNav.remove();
    }

    const navigationHTML = `
      <div id="category-navigation" class="category-navigation">
        <div id="main-categories" class="main-categories">
          ${this.categories.map(category => `
            <button class="category-nav-btn${(activeCategory === category.key || (activeCategory && activeCategory.startsWith(category.key + '-'))) ? ' active' : ''}" data-category="${category.key}">
              ${category.label}
            </button>
          `).join('')}
          <button class="category-nav-btn${!activeCategory ? ' active' : ''}" data-category="">
            All Products
          </button>
        </div>
        <div id="subcategory-navigation" class="subcategory-navigation">
          <!-- Subcategories will be inserted here -->
        </div>
      </div>
    `;

    // Insert at the top of the page content - handle different page structures
    const pageWrapper = document.getElementById('page-wrapper');
    const navbar = document.getElementById('navbar-container');
    
    if (pageWrapper) {
      // Insert at the very beginning of the page wrapper content
      pageWrapper.insertAdjacentHTML('afterbegin', navigationHTML);
    } else if (navbar && navbar.nextSibling) {
      // Fallback: insert after navbar
      navbar.insertAdjacentHTML('afterend', navigationHTML);
    } else {
      // Last resort: insert at body beginning
      document.body.insertAdjacentHTML('afterbegin', navigationHTML);
    }

    // Add subcategories if a main category is selected
    if (activeCategory) {
      this.createSubcategoryButtons(activeCategory);
    }

    // Add click event listeners to navigation buttons
    this.addCategoryEventListeners();
  }

  // Create subcategory buttons for the given main category
  async createSubcategoryButtons(categoryKey) {
    try {
      // Get product data - assuming getProductData is available globally
      let products = [];
      if (typeof getProductData === 'function') {
        products = await getProductData();
      } else if (window.productData) {
        products = window.productData;
      } else {
        console.warn('Product data not available for subcategory creation');
        return;
      }

      const subcategories = new Set();
      
      // Find all subcategories for this main category
      products.forEach(product => {
        if (product.category) {
          const categories = product.category.split(',').map(cat => cat.trim().toLowerCase());
          categories.forEach(category => {
            if (category.startsWith(categoryKey) && category.includes('-')) {
              subcategories.add(category);
            }
          });
        }
      });

      const subcategoryContainer = document.getElementById('subcategory-navigation');
      
      if (!subcategoryContainer) return;

      if (subcategories.size > 0) {
        subcategoryContainer.style.display = 'flex';
        
        // Get current active subcategory from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentCategory = urlParams.get('category') || '';
        
        // Convert to sorted array and create buttons
        const sortedSubcategories = Array.from(subcategories).sort();
        
        subcategoryContainer.innerHTML = sortedSubcategories.map(subcat => {
          const displayName = this.formatSubcategoryName(subcat);
          const isActive = currentCategory === subcat;
          return `<button class="subcategory-nav-btn${isActive ? ' active' : ''}" data-category="${subcat}">${displayName}</button>`;
        }).join('');

        // Add event listeners to subcategory buttons
        this.addSubcategoryEventListeners();
      } else {
        subcategoryContainer.style.display = 'none';
        subcategoryContainer.innerHTML = '';
      }

    } catch (error) {
      console.error("Error creating subcategory buttons:", error);
    }
  }

  // Format subcategory names for display
  formatSubcategoryName(subcategory) {
    const parts = subcategory.split('-');
    if (parts.length <= 1) return subcategory;
    
    // Get the subcategory part (everything after the first dash)
    const subParts = parts.slice(1);
    
    return subParts.map(word => {
      // Handle special cases
      if (word === 'cz') return 'Cubic Zirconia';
      if (word === 'yowah' && subParts.includes('nuts')) return 'Yowah Nuts';
      if (word === 'nuts' && subParts.includes('yowah')) return '';
      if (word === 'thunder' && subParts.includes('eggs')) return 'Thunder Eggs';
      if (word === 'eggs' && subParts.includes('thunder')) return '';
      if (word === 'agate' && subParts.includes('slices')) return 'Agate Slices';
      if (word === 'slices' && subParts.includes('agate')) return '';
      if (word === 'wash' && subParts.includes('bags')) return 'Wash Bags';
      if (word === 'bags' && subParts.includes('wash')) return '';
      if (word === 'herkimer' && subParts.includes('diamonds')) return 'Herkimer Diamonds';
      if (word === 'diamonds' && subParts.includes('herkimer')) return '';
      if (word === 'smoky' && subParts.includes('quartz')) return 'Smoky Quartz';
      if (word === 'quartz' && subParts.includes('smoky')) return '';
      if (word === 'gem' && subParts.includes('tree')) return 'Gem Tree';
      if (word === 'tree' && subParts.includes('gem')) return '';
      if (word === 'crystal' && subParts.includes('points')) return 'Crystal Points';
      if (word === 'points' && subParts.includes('crystal')) return '';
      if (word === 'tigers' && subParts.includes('eye')) return "Tiger's Eye";
      if (word === 'eye' && subParts.includes('tigers')) return '';
      if (word === 'petrified' && subParts.includes('wood')) return 'Petrified Wood';
      if (word === 'wood' && subParts.includes('petrified')) return '';
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).filter(word => word).join(' ');
  }

  // Add event listeners to category buttons
  addCategoryEventListeners() {
    document.querySelectorAll('.category-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryKeyword = e.target.getAttribute('data-category');
        this.handleCategoryClick(categoryKeyword);
      });
    });
  }

  // Add event listeners to subcategory buttons
  addSubcategoryEventListeners() {
    document.querySelectorAll('.subcategory-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryKeyword = e.target.getAttribute('data-category');
        
        // For view-product page, navigate to products page
        if (window.location.pathname.includes('view-product.html')) {
          const newUrl = `products.html?category=${encodeURIComponent(categoryKeyword)}`;
          window.location.href = newUrl;
          return;
        }
        
        // For products page, handle subcategory selection
        const newUrl = `${window.location.pathname}?category=${encodeURIComponent(categoryKeyword)}`;
        history.pushState({ category: categoryKeyword }, "", newUrl);
        
        // Update active states
        this.updateMainCategoryActiveStates(categoryKeyword.split('-')[0]);
        this.updateSubcategoryActiveStates(categoryKeyword);
        
        // Trigger products page functions
        if (typeof loadProductsByCategory === 'function') {
          loadProductsByCategory(categoryKeyword);
        }
      });
    });
  }

  // Update subcategory active states
  updateSubcategoryActiveStates(activeSubcategory) {
    document.querySelectorAll('.subcategory-nav-btn').forEach(btn => {
      const btnCategory = btn.getAttribute('data-category');
      if (btnCategory === activeSubcategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Handle category button clicks
  handleCategoryClick(categoryKeyword) {
    // For view-product page, navigate to products page with category
    if (window.location.pathname.includes('view-product.html')) {
      const newUrl = categoryKeyword ? 
        `products.html?category=${encodeURIComponent(categoryKeyword)}` :
        'products.html';
      window.location.href = newUrl;
      return;
    }

    // For products page, update URL and trigger category change
    const newUrl = categoryKeyword ? 
      `${window.location.pathname}?category=${encodeURIComponent(categoryKeyword)}` :
      window.location.pathname;
    
    history.pushState({ category: categoryKeyword }, "", newUrl);
    
    if (categoryKeyword) {
      // Update main category active states
      this.updateMainCategoryActiveStates(categoryKeyword);
      
      // Create/update subcategory buttons for the selected category
      this.createSubcategoryButtons(categoryKeyword);
      
      // Trigger category change event for products page
      if (window.filterProductsByCategory) {
        window.filterProductsByCategory(categoryKeyword);
      } else {
        // Fallback for products page if function not available yet
        if (typeof updateMainCategoryActiveStates === 'function') {
          updateMainCategoryActiveStates(categoryKeyword);
        }
        if (typeof loadProductsByCategory === 'function') {
          loadProductsByCategory(categoryKeyword);
        }
      }
    } else {
      // Show all products
      this.updateMainCategoryActiveStates('');
      
      // Hide subcategories
      const subcategoryContainer = document.getElementById('subcategory-navigation');
      if (subcategoryContainer) {
        subcategoryContainer.style.display = 'none';
        subcategoryContainer.innerHTML = '';
      }
      
      // Trigger show all products for products page
      if (window.showAllProducts) {
        window.showAllProducts();
      } else {
        // Fallback for products page
        if (typeof loadProductsByCategory === 'function') {
          loadProductsByCategory(null);
        }
      }
    }
  }

  // Update active states for main category buttons
  updateMainCategoryActiveStates(activeCategory) {
    document.querySelectorAll('.category-nav-btn').forEach(btn => {
      const btnCategory = btn.getAttribute('data-category');
      if (btnCategory === activeCategory || 
          (activeCategory && activeCategory.startsWith(btnCategory + '-') && btnCategory !== '')) {
        btn.classList.add('active');
      } else if (btnCategory === '' && !activeCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update subcategory active states
    document.querySelectorAll('.subcategory-nav-btn').forEach(btn => {
      const btnCategory = btn.getAttribute('data-category');
      if (btnCategory === activeCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Initialize navigation based on current URL
  async initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || '';
    await this.createNavigationButtons(category);
  }
}

// Create global instance
window.categoryNavigation = new CategoryNavigation();
