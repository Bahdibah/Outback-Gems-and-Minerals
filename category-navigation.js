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
        return;
      }

      // Store products for counting
      this.products = products;
      
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
        <!-- Mobile dropdown selector for main categories -->
        <select class="mobile-category-dropdown" id="mobile-category-select">
          <option value="">All Products</option>
          ${this.categories.map(category => `
            <option value="${category.key}"${(mainCategoryForSubcategories === category.key) ? ' selected' : ''}>
              ${category.label}
            </option>
          `).join('')}
        </select>
        
        <!-- Desktop/tablet button navigation -->
        <div id="main-categories" class="main-categories">
          ${this.categories.map(category => `
            <button class="category-nav-btn${(activeCategory === category.key || mainCategoryForSubcategories === category.key) ? ' active' : ''}" data-category="${category.key}">
              <span class="category-label">${category.label}</span>
              <span class="item-count">${this.getItemCount(category.key)} products</span>
            </button>
          `).join('')}
          <button class="category-nav-btn${!activeCategory ? ' active' : ''}" data-category="">
            <span class="category-label">All Products</span>
            <span class="item-count">${this.getTotalItemCount()} products</span>
          </button>
        </div>
        ${!window.location.pathname.includes('view-product.html') ? `
        <div id="subcategory-navigation" class="subcategory-navigation">
          <div class="filter-section">
            <label class="subcategory-label">Filter Products:</label>
            <select id="subcategory-dropdown" class="subcategory-dropdown">
              <option value="">Show All</option>
            </select>
          </div>
          <div class="results-info" id="results-info">
            <span id="results-text">Showing all products</span>
          </div>
          <div class="inline-pagination" id="inline-pagination">
            <!-- Pagination will be inserted here -->
          </div>
        </div>
        ` : ''}
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
    }

    // Add click event listeners to navigation buttons
    this.addCategoryEventListeners();
    
    // Ensure active states are properly set after DOM insertion (fix for Continue Shopping navigation)
    // Use multiple attempts with increasing delays to ensure DOM is fully ready
    setTimeout(() => this.setActiveStatesForCategory(activeCategory), 100);
    setTimeout(() => this.setActiveStatesForCategory(activeCategory), 250);
  }

  // Comprehensive function to set active states for a given category
  setActiveStatesForCategory(activeCategory) {
    // Main category highlighting
    this.updateMainCategoryActiveStates(activeCategory);
    
    // Handle subcategory cases
    if (activeCategory && activeCategory.includes('|')) {
      const [mainCategory, subcategory] = activeCategory.split('|');
      
      // Ensure subcategory dropdown exists and is set
      const subcategoryDropdown = document.getElementById('subcategory-dropdown');
      if (subcategoryDropdown) {
        subcategoryDropdown.value = activeCategory;
        
        // Trigger change event to ensure any listeners are notified
        subcategoryDropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Update subcategory active states
      this.updateSubcategoryActiveStates(activeCategory);
    }
    
    // Handle "All Products" case
    if (!activeCategory || activeCategory === '') {
      const allProductsBtn = document.querySelector('.category-nav-btn[data-category=""]');
      if (allProductsBtn) {
        document.querySelectorAll('.category-nav-btn').forEach(btn => btn.classList.remove('active'));
        allProductsBtn.classList.add('active');
      }
      
      // Disable and grey out the subcategory dropdown for "All Products"
      const subcategoryContainer = document.getElementById('subcategory-navigation');
      if (subcategoryContainer) {
        subcategoryContainer.style.display = 'flex'; // Keep container visible for pagination
        const dropdown = document.getElementById('subcategory-dropdown');
        if (dropdown) {
          dropdown.disabled = true; // Disable interaction
          dropdown.innerHTML = '<option value="">No subcategories available</option>';
          dropdown.value = '';
          dropdown.classList.remove('active'); // Remove any active styling
        }
      }
    }
  }

  // Create subcategory buttons for the given main category
  async createSubcategoryButtons(categoryKey) {
    try {
      // Skip creating subcategory navigation on view-product pages
      if (window.location.pathname.includes('view-product.html')) {
        const subcategoryContainer = document.getElementById('subcategory-navigation');
        if (subcategoryContainer) {
          subcategoryContainer.style.display = 'none';
        }
        return;
      }
      
      // Get product data - assuming getProductData is available globally
      let products = [];
      if (typeof getProductData === 'function') {
        products = await getProductData();
      } else if (window.productData) {
        products = window.productData;
      } else {
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
      const subcategoryDropdown = document.getElementById('subcategory-dropdown');
      
      if (!subcategoryContainer || !subcategoryDropdown) return;

      if (subcategories.size > 0) {
        subcategoryContainer.style.display = 'flex';
        
        // Make sure the dropdown and filter section are visible and enabled
        subcategoryDropdown.disabled = false; // Re-enable interaction
        const filterSection = subcategoryContainer.querySelector('.filter-section');
        if (filterSection) {
          filterSection.style.display = 'flex';
        }
        
        // Get current active subcategory from URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentCategory = urlParams.get('category') || '';
        
        // Convert to sorted array and create dropdown options
        const sortedSubcategories = Array.from(subcategories).sort();
        
        // Clear existing options except "Show All"
        subcategoryDropdown.innerHTML = '<option value="">Show All</option>';
        
        // Add subcategory options
        sortedSubcategories.forEach(subcat => {
          const displayName = this.formatSubcategoryName(subcat);
          const subcategoryKey = `${categoryKey}|${subcat.toLowerCase()}`;
          const isSelected = currentCategory === subcategoryKey;
          
          const option = document.createElement('option');
          option.value = subcategoryKey;
          option.textContent = displayName;
          option.selected = isSelected;
          
          subcategoryDropdown.appendChild(option);
        });

        // Ensure the dropdown value is set correctly (force update after DOM changes)
        setTimeout(() => {
          if (currentCategory && currentCategory.includes('|')) {
            subcategoryDropdown.value = currentCategory;
          } else {
            // If we're in a main category (no subcategory), show "Show All" selected
            subcategoryDropdown.value = '';
          }
          // Don't trigger change event here - it interferes with main category selection
          // subcategoryDropdown.dispatchEvent(new Event('change', { bubbles: true }));
        }, 50);

        // Add event listener to dropdown
        this.addSubcategoryDropdownListener();
        
        // Update active states after creating dropdown
        this.updateSubcategoryActiveStates(currentCategory);
      } else {
        subcategoryContainer.style.display = 'none';
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



  // Add event listeners to category buttons
  addCategoryEventListeners() {
    // Desktop/tablet button event listeners
    document.querySelectorAll('.category-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Use currentTarget to get the button, not the clicked element (which might be a span)
        const categoryKeyword = e.currentTarget.getAttribute('data-category');
        this.handleCategoryClick(categoryKeyword);
      });
    });

    // Mobile dropdown event listener
    const mobileCategorySelect = document.getElementById('mobile-category-select');
    
    if (mobileCategorySelect) {
      mobileCategorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        this.handleCategoryClick(selectedCategory);
      });
    }
  }

  // Add event listener to subcategory dropdown
  addSubcategoryDropdownListener() {
    const dropdown = document.getElementById('subcategory-dropdown');
    if (!dropdown) return;

    // Remove existing listener if any to prevent duplicates
    if (this.subcategoryChangeHandler) {
      dropdown.removeEventListener('change', this.subcategoryChangeHandler);
    }
    
    // Create bound handler for proper removal later
    this.subcategoryChangeHandler = (e) => {
      const categoryKeyword = e.target.value;
      
      // For view-product page, navigate to products page
      if (window.location.pathname.includes('view-product.html')) {
        let newUrl;
        if (categoryKeyword) {
          newUrl = `products.html?category=${encodeURIComponent(categoryKeyword)}`;
        } else {
          // When "Show All" is selected, get current main category
          const urlParams = new URLSearchParams(window.location.search);
          const currentCategory = urlParams.get('category') || '';
          const mainCategory = currentCategory.includes('|') ? currentCategory.split('|')[0] : currentCategory;
          newUrl = mainCategory ? `products.html?category=${encodeURIComponent(mainCategory)}` : 'products.html';
        }
        window.location.href = newUrl;
        return;
      }
      
      // For products page, handle subcategory selection
      let finalCategoryKeyword = categoryKeyword;
      
      // If "Show All" is selected (empty value), determine the main category to show
      if (!categoryKeyword) {
        const urlParams = new URLSearchParams(window.location.search);
        const currentCategory = urlParams.get('category') || '';
        // Extract main category from current URL (if we're in a subcategory)
        finalCategoryKeyword = currentCategory.includes('|') ? currentCategory.split('|')[0] : '';
      }
      
      const newUrl = finalCategoryKeyword ? 
        `${window.location.pathname}?category=${encodeURIComponent(finalCategoryKeyword)}` : 
        window.location.pathname;
      history.pushState({ category: finalCategoryKeyword }, "", newUrl);
      
      // Update active states - pass the final category for proper highlighting
      this.updateMainCategoryActiveStates(finalCategoryKeyword);
      
      // Use setTimeout to ensure URL is updated before checking state
      setTimeout(() => {
        this.updateSubcategoryActiveStates(finalCategoryKeyword);
      }, 10);
      
      // Trigger products page functions
      if (typeof loadProductsByCategory === 'function') {
        loadProductsByCategory(finalCategoryKeyword);
      } else {
        console.error('loadProductsByCategory function not found');
      }
    };
    
    dropdown.addEventListener('change', this.subcategoryChangeHandler);
  }

  // Update subcategory active states
  updateSubcategoryActiveStates(activeSubcategory) {
    const dropdown = document.getElementById('subcategory-dropdown');
    if (!dropdown) {
      // Subcategory dropdown doesn't exist (e.g., on view-product pages)
      return;
    }
    
    // Set dropdown value based on the current state
    const urlParams = new URLSearchParams(window.location.search);
    const currentCategory = urlParams.get('category') || '';
    
    if (currentCategory && currentCategory.includes('|')) {
      // We're in a specific subcategory - show that subcategory selected
      dropdown.value = currentCategory;
      dropdown.disabled = false;
      dropdown.classList.add('active');
    } else if (currentCategory && !currentCategory.includes('|')) {
      // We're in a main category - show "Show All" selected
      dropdown.value = '';
      dropdown.disabled = false;
      dropdown.classList.add('active');
    } else {
      // We're in "All Products" - disable the dropdown
      dropdown.value = '';
      dropdown.disabled = true;
      dropdown.innerHTML = '<option value="">No subcategories available</option>';
      dropdown.classList.remove('active');
    }
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
      // Extract main category from keyword (handle subcategories like "faceting rough|ruby")
      const mainCategory = categoryKeyword.includes('|') ? 
        categoryKeyword.split('|')[0] : categoryKeyword;
      
      // Update main category active states
      this.updateMainCategoryActiveStates(categoryKeyword);
      
      // Create/update subcategory buttons for the main category
      this.createSubcategoryButtons(mainCategory);
      
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
      
      // Keep subcategory container visible but disable the dropdown
      const subcategoryContainer = document.getElementById('subcategory-navigation');
      if (subcategoryContainer) {
        subcategoryContainer.style.display = 'flex'; // Keep container visible for pagination
        // Disable and grey out the subcategory dropdown
        const dropdown = document.getElementById('subcategory-dropdown');
        if (dropdown) {
          dropdown.disabled = true; // Disable interaction
          dropdown.innerHTML = '<option value="">No subcategories available</option>';
          dropdown.value = '';
        }
        // Keep the filter section visible but show it's disabled
        const filterSection = subcategoryContainer.querySelector('.filter-section');
        if (filterSection) {
          filterSection.style.display = 'flex';
        }
      }
      
      // Hide mobile subcategory dropdown
      const mobileSubcategorySelect = document.getElementById('mobile-subcategory-select');
      if (mobileSubcategorySelect) {
        mobileSubcategorySelect.style.display = 'none';
        mobileSubcategorySelect.innerHTML = '<option value="">All Subcategories</option>';
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

  // Get item count for a specific category
  // Get total item count across all categories
  getTotalItemCount() {
    return this.products ? this.products.length : 0;
  }

  // Update active states for main category buttons
  updateMainCategoryActiveStates(activeCategory) {
    const buttons = document.querySelectorAll('.category-nav-btn');
    
    buttons.forEach(btn => {
      const btnCategory = btn.getAttribute('data-category');
      
      // Handle subcategory format (e.g., "slabs|tiger eye")
      let categoryToCheck = activeCategory;
      
      if (activeCategory && activeCategory.includes('|')) {
        // Extract main category from subcategory
        categoryToCheck = activeCategory.split('|')[0];
      }
      
      // Remove active class first
      btn.classList.remove('active');
      
      // Add active class based on matching logic (CASE INSENSITIVE)
      let shouldBeActive = false;
      
      // Normalize both strings to lowercase for comparison
      const normalizedBtnCategory = (btnCategory || '').toLowerCase().trim();
      const normalizedCategoryToCheck = (categoryToCheck || '').toLowerCase().trim();
      
      if (normalizedBtnCategory === normalizedCategoryToCheck || 
          (activeCategory && activeCategory.toLowerCase().startsWith(normalizedBtnCategory + '-') && normalizedBtnCategory !== '')) {
        shouldBeActive = true;
      } else if (normalizedBtnCategory === '' && (!activeCategory || activeCategory === '')) {
        shouldBeActive = true;
      }
      
      if (shouldBeActive) {
        btn.classList.add('active');
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

  // Get item count for a specific category
  getItemCount(categoryKey) {
    if (!this.products) return 0;
    
    if (!categoryKey) {
      // For "All Products", count unique product IDs across all categories
      const uniqueProductIds = new Set();
      this.products.forEach(product => {
        if (product["product id"]) {
          uniqueProductIds.add(product["product id"]);
        }
      });
      return uniqueProductIds.size;
    }
    
    const category = this.categories.find(cat => cat.key === categoryKey);
    if (!category) return 0;
    
    // Get unique product IDs for this category
    const uniqueProductIds = new Set();
    this.products.forEach(product => {
      const productCategory = product.category ? product.category.trim().toLowerCase() : '';
      if (productCategory === categoryKey && product["product id"]) {
        uniqueProductIds.add(product["product id"]);
      }
    });
    
    return uniqueProductIds.size;
  }

  // Get total item count
  getTotalItemCount() {
    if (!this.products) return 0;
    
    // Count unique product IDs across all products
    const uniqueProductIds = new Set();
    this.products.forEach(product => {
      if (product["product id"]) {
        uniqueProductIds.add(product["product id"]);
      }
    });
    
    return uniqueProductIds.size;
  }

  // Set active category based on product ID (for view-product pages)
  async setActiveCategoryFromProduct(productId) {
    try {
      // Get product data
      let products = [];
      if (typeof getProductData === 'function') {
        products = await getProductData();
      } else if (window.productData) {
        products = window.productData;
      } else {
        return;
      }

      // Find the product
      const product = products.find(p => p['product id'] === productId);
      if (product && product.category) {
        const mainCategory = product.category.trim().toLowerCase();
        // Wait a bit for DOM to be ready, then set active state
        setTimeout(() => {
          this.updateMainCategoryActiveStates(mainCategory);
        }, 100);
      }
    } catch (error) {
      console.error("Error setting active category from product:", error);
    }
  }

  // Initialize navigation based on current URL
  async initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    let category = urlParams.get('category') || '';
    
    // For view-product page, don't set active category initially - wait for product to load
    if (window.location.pathname.includes('view-product.html')) {
      category = ''; // Start with no active category on view-product page
      // Note: subcategory navigation won't be created at all on view-product pages
      
      // Try to get the product category from URL and set active category
      const productId = urlParams.get('productid');
      if (productId) {
        this.setActiveCategoryFromProduct(productId);
      }
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
