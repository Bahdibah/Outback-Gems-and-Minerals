function initializeSideMenu() {
  // Accordion expand/collapse
  document.querySelectorAll('.category-expand').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const card = this.closest('.category-card');
      document.querySelectorAll('.category-card').forEach(c => {
        if (c !== card) c.classList.remove('open');
      });
      card.classList.toggle('open');
    });
  });

  // Redirect to products.html with the selected category
  document.querySelectorAll('.side-menu-toggle').forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const categoryKeyword = this.getAttribute('data-category');
      // Redirect to products.html with the category as a query parameter
      window.location.href = `products.html?category=${encodeURIComponent(categoryKeyword)}`;
    });
  });
}