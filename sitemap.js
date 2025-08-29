
// Load inventory data and generate sitemap organized by categories and subcategories
async function generateSitemap() {
  try {
    const response = await fetch('inventory.json');
    const products = await response.json();
    
    // Remove duplicates based on product id
    const seen = new Set();
    const uniqueProducts = products.filter(product => {
      if (seen.has(product["product id"])) return false;
      seen.add(product["product id"]);
      return true;
    });

    // Group products by category and subcategory
    const categorizedProducts = {};
    
    uniqueProducts.forEach(product => {
      const category = product.category || "Other";
      const subCategory = product["sub category"] || "Uncategorized";
      
      if (!categorizedProducts[category]) {
        categorizedProducts[category] = {};
      }
      
      if (!categorizedProducts[category][subCategory]) {
        categorizedProducts[category][subCategory] = [];
      }
      
      categorizedProducts[category][subCategory].push(product);
    });

    // Generate HTML for the sitemap
    generateSitemapHTML(categorizedProducts);
    
  } catch (error) {
    console.error('Error loading inventory:', error);
  }
}

function generateSitemapHTML(categorizedProducts) {
  const container = document.getElementById('dynamic-categories');
  if (!container) return;

  // Sort categories for consistent display
  const sortedCategories = Object.keys(categorizedProducts).sort();
  
  sortedCategories.forEach(category => {
    // Create category section
    const categorySection = document.createElement('div');
    categorySection.className = 'sitemap-section';
    
    // Make category title a clickable link
    const categoryTitle = document.createElement('h2');
    const categoryLink = document.createElement('a');
    categoryLink.href = `products.html?category=${encodeURIComponent(category.toLowerCase())}`;
    categoryLink.textContent = category;
    categoryTitle.appendChild(categoryLink);
    categorySection.appendChild(categoryTitle);

    // Sort subcategories within this category
    const subcategories = categorizedProducts[category];
    const sortedSubcategories = Object.keys(subcategories).sort();
    
    sortedSubcategories.forEach(subCategory => {
      // Create subcategory subsection
      const subCategoryDiv = document.createElement('div');
      subCategoryDiv.className = 'sitemap-subcategory';
      
      // Make subcategory title a clickable link using pipe format
      const subCategoryTitle = document.createElement('h3');
      const subCategoryLink = document.createElement('a');
      const combinedCategory = `${category.toLowerCase()}|${subCategory.toLowerCase()}`;
      subCategoryLink.href = `products.html?category=${encodeURIComponent(combinedCategory)}`;
      subCategoryLink.textContent = subCategory;
      subCategoryTitle.appendChild(subCategoryLink);
      subCategoryDiv.appendChild(subCategoryTitle);
      
      // Create product list for this subcategory
      const productList = document.createElement('ul');
      productList.className = 'sitemap-list sitemap-sublist';
      
      // Sort products within subcategory by name
      const products = subcategories[subCategory].sort((a, b) => 
        (a["product name"] || "").localeCompare(b["product name"] || "")
      );
      
      products.forEach(product => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
        link.textContent = product["product name"] || "Unnamed Product";
        listItem.appendChild(link);
        productList.appendChild(listItem);
      });
      
      subCategoryDiv.appendChild(productList);
      categorySection.appendChild(subCategoryDiv);
    });
    
    container.appendChild(categorySection);
  });
}

// Initialize sitemap when page loads
document.addEventListener('DOMContentLoaded', generateSitemap);




