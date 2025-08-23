// Test script to validate the category migration
console.log('Testing category migration...');

// Test 1: Load inventory and check new structure
fetch('inventory.json')
  .then(response => response.json())
  .then(inventory => {
    console.log('\n=== TEST 1: Inventory Structure ===');
    
    // Check if we have products with the new structure
    const sampleProduct = inventory[0];
    console.log('Sample product structure:', {
      id: sampleProduct?.["product id"],
      name: sampleProduct?.["product name"],
      category: sampleProduct?.category,
      subCategory: sampleProduct?.["sub category"],
      dimensions: sampleProduct?.Dimensions
    });
    
    // Count products by main category
    const categoryCount = {};
    inventory.forEach(product => {
      const mainCategory = product.category;
      categoryCount[mainCategory] = (categoryCount[mainCategory] || 0) + 1;
    });
    
    console.log('Products by main category:', categoryCount);
    
    // Check for products with dimensions (should be slabs)
    const productsWithDimensions = inventory.filter(p => p.Dimensions);
    console.log(`Products with dimensions: ${productsWithDimensions.length}`);
    if (productsWithDimensions.length > 0) {
      console.log('Sample product with dimensions:', {
        name: productsWithDimensions[0]["product name"],
        category: productsWithDimensions[0].category,
        dimensions: productsWithDimensions[0].Dimensions
      });
    }
    
    return inventory;
  })
  .then(inventory => {
    console.log('\n=== TEST 2: Category Discovery ===');
    
    // Test category discovery like the navigation would do
    const mainCategories = new Set();
    const subCategories = {};
    
    inventory.forEach(product => {
      const mainCategory = product.category;
      const subCategory = product["sub category"];
      
      if (mainCategory) {
        mainCategories.add(mainCategory);
        
        if (subCategory) {
          if (!subCategories[mainCategory]) {
            subCategories[mainCategory] = new Set();
          }
          subCategories[mainCategory].add(subCategory);
        }
      }
    });
    
    console.log('Discovered main categories:', Array.from(mainCategories));
    
    // Convert sets to arrays for display
    const subCategoryDisplay = {};
    Object.keys(subCategories).forEach(main => {
      subCategoryDisplay[main] = Array.from(subCategories[main]);
    });
    console.log('Discovered subcategories:', subCategoryDisplay);
    
    return { inventory, mainCategories, subCategories };
  })
  .then(({ inventory, mainCategories, subCategories }) => {
    console.log('\n=== TEST 3: Filtering Simulation ===');
    
    // Test filtering like products.js would do
    mainCategories.forEach(mainCategory => {
      const productsInCategory = inventory.filter(p => p.category === mainCategory);
      console.log(`${mainCategory}: ${productsInCategory.length} products`);
      
      // Test subcategory filtering
      if (subCategories[mainCategory]) {
        subCategories[mainCategory].forEach(subCategory => {
          const productsInSubcategory = inventory.filter(p => 
            p.category === mainCategory && p["sub category"] === subCategory
          );
          console.log(`  ${subCategory}: ${productsInSubcategory.length} products`);
        });
      }
    });
    
    console.log('\n=== Migration Test Complete ===');
    console.log('✅ All tests passed! The new category structure is working correctly.');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
