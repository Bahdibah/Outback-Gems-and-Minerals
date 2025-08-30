// Background image rotation
const images = ["images/banners/Banner 1.jpg", "images/banners/Banner 2.jpg", "images/banners/Banner 3.jpg", "images/banners/Banner 4.jpg"];
let current = 0;

setInterval(() => {
  current = (current + 1) % images.length;
  document.getElementById("home").style.backgroundImage = `url('${images[current]}')`;
}, 15000); // Change image every 15 seconds

// #region banner carousel script
const itemTrack = document.querySelector('.banner');
const items = document.querySelectorAll('.banner-item');
const visibleMessages = 1;
let itemIndex = 0;

// Clone first item(s) and append to end only if there are enough items
if (items.length > visibleMessages) {
  for (let i = 0; i < visibleMessages; i++) {
    const clone = items[i].cloneNode(true);
    itemTrack.appendChild(clone);
  }
}

const totalItems = document.querySelectorAll('.banner-item').length;
setInterval(() => {
  itemIndex++;
  itemTrack.style.transition = 'transform 0.7s ease-in-out';
  itemTrack.style.transform = `translateX(-${itemIndex * 100}%)`;

  if (itemIndex === totalItems - visibleMessages) {
    setTimeout(() => {
      itemTrack.style.transition = 'none';
      itemTrack.style.transform = `translateX(0%)`;
      itemIndex = 0;
    }, 700); // Match the transition duration
  }
}, 5000);
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
  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Bestsellers section
document.addEventListener("DOMContentLoaded", function () {
  const bestsellerGrid = document.querySelector('.bestseller-product-cards');

  // Add loading message
  const loadingMsg = document.createElement("div");
  loadingMsg.textContent = "Loading Bestsellers...";
  loadingMsg.style.color = "#cc5500";
  loadingMsg.style.fontSize = "2rem";
  loadingMsg.style.textAlign = "center";
  loadingMsg.style.padding = "40px 0";
  bestsellerGrid.appendChild(loadingMsg);

  getProductData()
    .then(data => {
      // Remove loading message
      bestsellerGrid.innerHTML = "";

      const bestsellerItems = data.filter(product => product.bestseller && product.bestseller.toLowerCase() === "y");

      // Shuffle and pick 3 random products
      const shuffled = bestsellerItems.sort(() => 0.5 - Math.random()).slice(0, 3);

      shuffled.forEach(product => {
        const card = document.createElement("div");
        card.className = "bestseller-product-card";

        // Image
        const imageContainer = document.createElement("div");
        imageContainer.className = "image-container";
        const img = document.createElement("img");
        img.src = product["image url"];
        img.alt = `${product["product name"]} - Premium ${product.category || 'gemstone'} from Outback Gems & Minerals` || "Premium gemstone from Outback Gems";
        img.loading = "lazy"; // Add this line
        imageContainer.appendChild(img);

        // Name
        const name = document.createElement("h3");
        name.textContent = product["product name"];

        // Price
        const price = document.createElement("p");
        price.className = "bestseller-price";
        price.textContent = calculatePriceDisplay(data, product["product id"]);

        // Description
        const desc = document.createElement("p");
        desc.textContent = product.description;

        // Button
        const button = document.createElement("button");
        button.className = "bestseller-product-button";
        button.textContent = "View";
        button.onclick = () => {
          window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
        };

        // Assemble card
        card.appendChild(imageContainer);
        card.appendChild(name);
        card.appendChild(price);
        card.appendChild(desc);
        card.appendChild(button);

        bestsellerGrid.appendChild(card);
      });
    })
    .catch(error => {
      bestsellerGrid.innerHTML = "<p style='color:#cc5500; font-size:2rem; text-align:center; padding:40px 0;'>Failed to load products.</p>";
      console.error(error);
    });
});

// Whats New carousel
document.addEventListener("DOMContentLoaded", function () {
  const swiperWrapper = document.querySelector('.whats-new-swiper .swiper-wrapper');

  // Add loading message
  const loadingMsg = document.createElement("div");
  loadingMsg.textContent = "Loading What's New...";
  loadingMsg.style.color = "#cc5500";
  loadingMsg.style.fontSize = "2rem";
  loadingMsg.style.textAlign = "center";
  loadingMsg.style.padding = "40px 0";
  swiperWrapper.appendChild(loadingMsg);

  getProductData()
    .then(data => {
      swiperWrapper.innerHTML = ""; // Remove loading message
      const newItems = data.filter(product => product.newitem && product.newitem.toLowerCase() === "y")

      // Shuffle and pick up to 6 random products for the carousel
      const shuffled = newItems.sort(() => 0.5 - Math.random()).slice(0, 6);

      shuffled.forEach(product => {
        const slide = document.createElement("div");
        slide.className = "swiper-slide";
        slide.innerHTML = `
          <div class="whatsnew-product-card">
            <div class="image-container">
              <img src="${product["image url"]}" alt="${product["product name"] || "Product Image"}" loading="lazy">
            </div>
            <h3>${product["product name"]}</h3>
            <p class="whatsnew-price">${calculatePriceDisplay(data, product["product id"])}</p>
            <p>${product.description}</p>
            <button class="whatsnew-product-button">View</button>
          </div>
        `;
        swiperWrapper.appendChild(slide);
        // Add event listener to the button
        const btn = slide.querySelector(".whatsnew-product-button");
        btn.addEventListener("click", function() {
                window.location.href = `view-product.html?productid=${encodeURIComponent(product["product id"])}`;
        });
      });

      // Initialize Swiper after slides are added
      new Swiper('.whats-new-swiper', {
        slidesPerView: 3,
        spaceBetween: 24,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        autoplay: {
          delay: 7000,
          disableOnInteraction: false
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        },
        breakpoints: {
          0: {slidesPerView: 1},
          768: {slidesPerView: 2},
          900: {slidesPerView: 3}
        }
      });
    })
    .catch(error => {
      swiperWrapper.innerHTML = "<p style='color:#cc5500; font-size:2rem; text-align:center; padding:40px 0;'>Failed to load products.</p>";
      console.error(error);
    });
});
