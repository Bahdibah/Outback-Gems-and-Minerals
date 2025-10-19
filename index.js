// Background image rotation
const images = ["images/banners/Banner 1.jpg", "images/banners/Banner 2.jpg", "images/banners/Banner 3.jpg", "images/banners/Banner 4.jpg"];
let current = 0;

setInterval(() => {
  current = (current + 1) % images.length;
  document.getElementById("home").style.backgroundImage = `url('${images[current]}')`;
}, 15000); // Change image every 15 seconds

// #region shipping message rotation script
document.addEventListener("DOMContentLoaded", function () {
  const shippingMessages = document.querySelectorAll('.shipping-message');
  let currentMessage = 0;

  // Only run if shipping messages exist
  if (shippingMessages.length > 1) {
    setInterval(() => {
      // Remove active class from current message
      shippingMessages[currentMessage].classList.remove('active');
      
      // Move to next message
      currentMessage = (currentMessage + 1) % shippingMessages.length;
      
      // Add active class to new message
      shippingMessages[currentMessage].classList.add('active');
    }, 6000); // Change message every 6 seconds (slower)
  }
});
// #endregion

// #region whats new carousel script

document.addEventListener("DOMContentLoaded", function () {
  const productTrack = document.querySelector('.carousel-track');
  const products = document.querySelectorAll('.new-product-card');
  const visibleCount = 3;
  let productIndex = 0;

  //Check carousel has properly loaded to prevent errors
  if (!productTrack || products.length === 0) return;

  // Clone first visibleCount cards and append to the end only if there are enough cards
  if (products.length > visibleCount) {
    for (let i = 0; i < visibleCount; i++) {
      const clone = products[i].cloneNode(true);
      productTrack.appendChild(clone);
    }
  }

  const totalCards = document.querySelectorAll('.new-product-card').length;
  const cardWidth = 100 / totalCards;
  setInterval(() => {
    productIndex++;
    productTrack.style.transition = 'transform 0.7s ease-in-out';
    productTrack.style.transform = `translateX(-${productIndex * (100 / visibleCount)}%)`;

    // Reset position after animation if clone limit reached
    if (productIndex === products.length) {
      setTimeout(() => {
        productTrack.style.transition = 'none';
        productTrack.style.transform = `translateX(0%)`;
        productIndex = 0;
      }, 700); // Match the transition duration
    }
  }, 7000); // Rotate every 7 seconds
});
// #endregion

// Newsletter form validation
document.querySelector('.newsletter-container form').addEventListener('submit', function (e) {
  e.preventDefault();

  const form = this;
  const emailInput = form.querySelector('input[name="email"]');
  const honeypot = form.querySelector('input[name="website"]');
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Honeypot spam protection
  if (honeypot && honeypot.value.trim() !== '') {
    console.log('Spam submission blocked by honeypot');
    // Show fake success message to confuse bots
    alert('Thank you for subscribing!');
    form.reset();
    return;
  }

  // Basic email validation
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  // Submit to Google Apps Script
  fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    mode: 'no-cors'
  }).then(() => {
    alert('Thank you for subscribing!');
    form.reset();
  }).catch(() => {
    alert('There was an error. Please try again.');
  });
});

// Latest Arrivals Showcase
document.addEventListener("DOMContentLoaded", function () {
  const featuredContainer = document.querySelector('.arrival-featured-card');
  const arrivalsGrid = document.querySelector('.arrivals-grid');
  const arrivalCards = document.querySelectorAll('.arrival-card');

  // Add loading message to featured container
  if (featuredContainer) {
    const loadingMsg = document.createElement("div");
    loadingMsg.textContent = "Loading Latest Arrivals...";
    loadingMsg.style.color = "#cc5500";
    loadingMsg.style.fontSize = "1.2rem";
    loadingMsg.style.textAlign = "center";
    loadingMsg.style.padding = "20px";
    featuredContainer.appendChild(loadingMsg);
  }

  getProductData()
    .then(data => {
      // Filter for items specifically marked as "new"
      let newItems = data.filter(product => 
        product.newitem && 
        product.newitem.toLowerCase() === "y" && 
        product["image url"] && 
        product["product name"]
      );
      
      // Fallback to all products if no new items found
      if (newItems.length === 0) {
        newItems = data.filter(product => product["image url"] && product["product name"]);
        console.warn("No items marked as 'new' found, showing all products as fallback");
      }
      
      // Shuffle and select from new items
      const shuffled = newItems.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, arrivalCards.length + 1); // +1 for featured
      
      // Clear loading message and populate featured card
      if (featuredContainer && selectedProducts[0]) {
        const featuredProduct = selectedProducts[0];
        featuredContainer.innerHTML = `
          <div class="featured-image">
            <img src="${featuredProduct["image url"]}" alt="${featuredProduct["product name"]}" loading="lazy">
          </div>
          <div class="featured-content">
            <h3>${featuredProduct["product name"]}</h3>
            <div class="featured-price">${calculatePriceDisplay(data, featuredProduct["product id"])}</div>
            <p class="featured-description">${featuredProduct.description || "Premium quality specimen perfect for collectors."}</p>
            <button class="featured-cta">View Details</button>
          </div>
        `;
        
        const featuredBtn = featuredContainer.querySelector(".featured-cta");
        featuredBtn.addEventListener("click", function() {
          window.location.href = `view-product.html?productid=${encodeURIComponent(featuredProduct["product id"])}`;
        });
      }

      // Populate arrival cards
      arrivalCards.forEach((card, index) => {
        const product = selectedProducts[index + 1]; // +1 to skip featured product
        if (product) {
          card.innerHTML = `
            <div class="card-image">
              <img src="${product["image url"]}" alt="${product["product name"]}" loading="lazy">
              <div class="card-overlay">
                <button class="quick-view-btn">
                  View
                </button>
              </div>
            </div>
            <div class="card-content">
              <h4>${product["product name"]}</h4>
              <div class="card-price">${calculatePriceDisplay(data, product["product id"])}</div>
            </div>
          `;
          
          const quickViewBtn = card.querySelector(".quick-view-btn");
          quickViewBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
          });
        }
      });
    })
    .catch(error => {
      if (featuredContainer) {
        featuredContainer.innerHTML = "<p style='color:#cc5500; text-align:center; padding:20px;'>Failed to load featured product.</p>";
      }
      arrivalCards.forEach(card => {
        card.innerHTML = "<p style='color:#cc5500; text-align:center; padding:20px;'>Failed to load</p>";
      });
      console.error(error);
    });
});

// #region Category Quick View Button Handlers
document.addEventListener("DOMContentLoaded", function () {
  // Handle category navigation buttons
  const categoryButtons = document.querySelectorAll('.quick-view-btn[data-category-link]');
  categoryButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      const category = this.getAttribute('data-category-link');
      window.location.href = `products.html?category=${category}`;
    });
  });

  // Handle product navigation buttons
  const productButtons = document.querySelectorAll('.quick-view-btn[data-product-link]');
  productButtons.forEach(button => {
    button.addEventListener('click', function(event) {
      event.stopPropagation();
      const productId = this.getAttribute('data-product-link');
      window.location.href = `view-product.html?productid=${productId}`;
    });
  });
});
// #endregion
