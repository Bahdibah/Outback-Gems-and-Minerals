// Category Navigation Module
// Shared functionality for category navigation across products.html and view-product.html

class CategoryNavigation {
  constructor() {
    this.categories = [];
    this.categoryLabels = {
      'faceting rough': 'Faceting Rough',
      'carvings & collectibles': 'Carvings & Collectibles',
      'raw material & specimens': 'Raw Material & Specimens',
      'tumbles': 'Tumbles',
      'slabs': 'Slabs'
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
      
      // Find all main categories using the new category field
      products.forEach(product => {
        if (product.category) {
          // Use the main category directly (no more dash splitting)
          const mainCategory = product.category.trim().toLowerCase();
          if (mainCategory) {
            mainCategories.add(mainCategory);
          }
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

    // Determine if activeCategory is a subcategory and extract main category
    let mainCategoryForSubcategories = '';
    let isSubcategory = false;
    
    if (activeCategory && activeCategory.includes('|')) {
      mainCategoryForSubcategories = activeCategory.split('|')[0];
      isSubcategory = true;
    } else if (activeCategory) {
      mainCategoryForSubcategories = activeCategory;
    }

    const navigationHTML = `
      <div id="category-navigation" class="category-navigation">
        <!-- Mobile dropdown selectors -->
        <select class="mobile-category-dropdown" id="mobile-category-select">
          <option value="">All Products</option>
          ${this.categories.map(category => `
            <option value="${category.key}"${(mainCategoryForSubcategories === category.key) ? ' selected' : ''}>
              ${category.label}
            </option>
          `).join('')}
        </select>
        <select class="mobile-subcategory-dropdown" id="mobile-subcategory-select" style="display: none;">
          <option value="">All Subcategories</option>
        </select>
        
        <!-- Desktop/tablet button navigation -->
        <div id="main-categories" class="main-categories">
          ${this.categories.map(category => `
            <button class="category-nav-btn${(activeCategory === category.key || mainCategoryForSubcategories === category.key) ? ' active' : ''}" data-category="${category.key}">
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

    // Add subcategories if a main category is selected or if it's a subcategory
    if (mainCategoryForSubcategories && !window.location.pathname.includes('view-product.html')) {
      this.createSubcategoryButtons(mainCategoryForSubcategories);
      // Also update mobile subcategory dropdown
      this.updateMobileSubcategoryDropdown(mainCategoryForSubcategories);
      const mobileSubcategorySelect = document.getElementById('mobile-subcategory-select');
      if (mobileSubcategorySelect) {
        mobileSubcategorySelect.style.display = 'block';
        
        // If it's a subcategory, select the correct option
        if (isSubcategory) {
          setTimeout(() => {
            const option = mobileSubcategorySelect.querySelector(`option[value="${activeCategory}"]`);
            if (option) {
              mobileSubcategorySelect.value = activeCategory;
            }
          }, 100);
        }
      }
    } else {
      // Hide subcategory dropdown when no category is selected OR on view-product pages
      const mobileSubcategorySelect = document.getElementById('mobile-subcategory-select');
      if (mobileSubcategorySelect) {
        mobileSubcategorySelect.style.display = 'none';
      }
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
        if (product.category && product["sub category"]) {
          const mainCategory = product.category.trim().toLowerCase();
          if (mainCategory === categoryKey.toLowerCase()) {
            const subcategoryString = product["sub category"].trim();
            if (subcategoryString) {
              // Split by comma and add each subcategory individually
              const subcategoryList = subcategoryString.split(',').map(sub => sub.trim());
              subcategoryList.forEach(subcategory => {
                if (subcategory && subcategory !== '') {
                  subcategories.add(subcategory);
                }
              });
            }
          }
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
          const subcategoryKey = `${categoryKey}|${subcat.toLowerCase()}`;
          const isActive = currentCategory === subcategoryKey;
          return `<button class="subcategory-nav-btn${isActive ? ' active' : ''}" data-category="${subcategoryKey}">${displayName}</button>`;
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
    // Since we now use direct subcategory names, just return the name as-is
    // The subcategory names in inventory.json are already properly formatted
    return subcategory;
  }

  // Update mobile subcategory dropdown options
  async updateMobileSubcategoryDropdown(categoryKey) {
    try {
      const mobileSubcategorySelect = document.getElementById('mobile-subcategory-select');
      if (!mobileSubcategorySelect) return;

      // Get product data
      let products = [];
      if (typeof getProductData === 'function') {
        products = await getProductData();
      } else if (window.productData) {
        products = window.productData;
      } else {
        console.warn('Product data not available for subcategory dropdown');
        return;
      }

      // Find subcategories for the selected main category
      const subcategories = new Set();
      products.forEach(product => {
        if (product.category && product.category.toLowerCase() === categoryKey.toLowerCase() && product['sub category']) {
          const subcategoryString = product['sub category'].trim();
          if (subcategoryString) {
            // Split by comma and add each subcategory individually
            const subcategoryList = subcategoryString.split(',').map(sub => sub.trim());
            subcategoryList.forEach(subcategory => {
              if (subcategory && subcategory !== '') {
                subcategories.add(subcategory);
              }
            });
          }
        }
      });

      if (subcategories.size > 0) {
        const categoryLabel = this.categoryLabels[categoryKey] || this.formatCategoryName(categoryKey);
        const sortedSubcategories = Array.from(subcategories).sort();
        
        // Get current active subcategory from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentCategory = urlParams.get('category') || '';
        
        mobileSubcategorySelect.innerHTML = `
          <option value="${categoryKey}">All ${categoryLabel}</option>
          ${sortedSubcategories.map(subcat => {
            const subcategoryKey = `${categoryKey}|${subcat.toLowerCase()}`;
            return `<option value="${subcategoryKey}"${currentCategory === subcategoryKey ? ' selected' : ''}>
              ${this.formatSubcategoryName(subcat)}
            </option>`;
          }).join('')}
        `;
      } else {
        mobileSubcategorySelect.style.display = 'none';
      }

    } catch (error) {
      console.error("Error updating mobile subcategory dropdown:", error);
    }
  }

  // Add event listeners to category buttons
  addCategoryEventListeners() {
    // Desktop/tablet button event listeners
    document.querySelectorAll('.category-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const categoryKeyword = e.target.getAttribute('data-category');
        this.handleCategoryClick(categoryKeyword);
      });
    });

    // Mobile dropdown event listeners
    const mobileCategorySelect = document.getElementById('mobile-category-select');
    const mobileSubcategorySelect = document.getElementById('mobile-subcategory-select');
    
    if (mobileCategorySelect) {
      mobileCategorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        this.handleCategoryClick(selectedCategory);
        
        // Update subcategory dropdown
        if (selectedCategory) {
          this.updateMobileSubcategoryDropdown(selectedCategory);
          mobileSubcategorySelect.style.display = 'block';
        } else {
          mobileSubcategorySelect.style.display = 'none';
        }
      });
    }
    
    if (mobileSubcategorySelect) {
      mobileSubcategorySelect.addEventListener('change', (e) => {
        const selectedSubcategory = e.target.value;
        this.handleCategoryClick(selectedSubcategory);
      });
    }
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
        
        // Update active states - pass the full subcategory for proper highlighting
        this.updateMainCategoryActiveStates(categoryKeyword);
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
      
      // Handle subcategory format (e.g., "slabs|tiger eye")
      let categoryToCheck = activeCategory;
      let isSubcategory = false;
      
      if (activeCategory && activeCategory.includes('|')) {
        // Extract main category from subcategory
        categoryToCheck = activeCategory.split('|')[0];
        isSubcategory = true;
      }
      
      if (btnCategory === categoryToCheck || 
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
    let category = urlParams.get('category') || '';
    
    // For view-product page, don't set active category initially - wait for product to load
    if (window.location.pathname.includes('view-product.html')) {
      category = ''; // Start with no active category on view-product page
    }
    
    await this.createNavigationButtons(category);
    
    // Add event listener for view-product page category updates
    document.addEventListener('productCategoryLoaded', (event) => {
      const productCategory = event.detail.category;
      const productSubcategory = event.detail.subcategory;
      
      if (productCategory) {
        // Use the main category directly (no more dash splitting)
        const mainCategory = productCategory.trim().toLowerCase();
        this.updateMainCategoryActiveStates(mainCategory);
        
        // Don't show subcategory navigation on view-product pages
        // Only update main category dropdown selection
      }
    });
    
    // For view-product pages, also check if there's already a product loaded
    if (window.location.pathname.includes('view-product.html')) {
      // Use a timeout to allow the view-product.js to finish loading
      setTimeout(() => {
        // Try to get the product category from any existing product data
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('productid');
        if (productId && typeof getProductData === 'function') {
          getProductData().then(products => {
            const product = products.find(p => p['product id'] === productId);
            if (product && product.category) {
              const mainCategory = product.category.trim().toLowerCase();
              this.updateMainCategoryActiveStates(mainCategory);
              
              // Also update subcategory if available
              if (product["sub category"]) {
                this.updateSubcategoryActiveStates(product["sub category"]);
              }
            }
          });
        }
      }, 100);
    }
  }
}

// Create global instance
window.categoryNavigation = new CategoryNavigation();
