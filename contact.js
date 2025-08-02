// Background image rotation for contact.html
// This script must be loaded after the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
  const images = [
    "images/banners/Contact Banner 1.jpeg",
    "images/banners/Contact Banner 2.jpeg",
    "images/banners/Contact Banner 3.jpeg",
    "images/banners/Contact Banner 4.jpeg"
  ];
  let current = 0;
  const homeSection = document.getElementById("home");
  if (homeSection) {
    setInterval(() => {
      current = (current + 1) % images.length;
      homeSection.style.backgroundImage = `url('${images[current]}')`;
    }, 15000); // Change image every 15 seconds
  }
});
