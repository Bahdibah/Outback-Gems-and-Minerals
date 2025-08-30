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

  // Honeypot spam protection
  const contactForm = document.querySelector('form[name="contact-form"]');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      const honeypot = document.getElementById('website');
      
      // If honeypot field is filled, it's likely a bot
      if (honeypot && honeypot.value.trim() !== '') {
        e.preventDefault();
        console.log('Spam submission blocked by honeypot');
        
        // Optional: Show a fake success message to confuse bots
        alert('Thank you for your message!');
        return false;
      }
      
      // Additional bot detection: check submission time
      const formLoadTime = sessionStorage.getItem('formLoadTime');
      const currentTime = Date.now();
      
      if (formLoadTime) {
        const timeDiff = currentTime - parseInt(formLoadTime);
        // If form submitted in less than 3 seconds, likely a bot
        if (timeDiff < 3000) {
          e.preventDefault();
          console.log('Spam submission blocked by timing');
          alert('Please take your time to fill out the form.');
          return false;
        }
      }
      
      // If we get here, it's likely a legitimate submission
      return true;
    });
    
    // Record when the form loads
    sessionStorage.setItem('formLoadTime', Date.now().toString());
  }
});
