// Background image rotation for contact.html
// This script must be loaded after the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
  // Check for success/error messages in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === '1') {
    alert('Thank you! Your message has been sent successfully. We\'ll get back to you soon!');
    // Remove the query parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('error') === '1') {
    alert('Sorry, there was an error sending your message. Please try again or email us directly at support@outbackgems.com.au');
    // Remove the query parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
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
      e.preventDefault(); // Always prevent initial submission
      
      const honeypot = document.getElementById('website');
      const messageField = document.querySelector('[name="message"]');
      const nameField = document.querySelector('[name="name"]');
      const emailField = document.querySelector('[name="email"]');
      
      // SPAM DETECTION METHODS (Pre-CAPTCHA checks)
      
      // 1. Honeypot check
      if (honeypot && honeypot.value.trim() !== '') {
        console.log('Spam submission blocked by honeypot');
        alert('Thank you for your message!');
        return false;
      }
      
      // 2. Keyword spam detection
      const spamKeywords = [
        'exclusive offer for your website',
        'limited offer for your website',
        'increase your website traffic',
        'seo services',
        'boost your ranking',
        'website promotion',
        'digital marketing',
        'backlinks',
        'guest post',
        'link building',
        'increase sales',
        'make money online',
        'work from home',
        'bitcoin',
        'cryptocurrency',
        'investment opportunity',
        'guaranteed results',
        'cheap price',
        'special discount',
        'limited time'
      ];
      
      if (messageField) {
        const message = messageField.value.toLowerCase();
        const spamFound = spamKeywords.some(keyword => message.includes(keyword));
        if (spamFound) {
          console.log('Spam submission blocked by keyword filter');
          alert('Thank you for your message!');
          return false;
        }
      }
      
      // 3. Multiple URL detection
      if (messageField) {
        const urlPattern = /(https?:\/\/[^\s]+)/gi;
        const urls = messageField.value.match(urlPattern) || [];
        if (urls.length > 1) {
          alert('Please limit your message to one website link.');
          return false;
        }
      }
      
      // 4. Suspicious email patterns (more targeted)
      if (emailField) {
        const suspiciousEmailPatterns = [
          /noreply|no-reply/i,
          /test@|admin@.*\.tk$/i,
          /\.tk$|\.ml$|\.ga$|\.cf$/i,  // suspicious TLDs only
          /^[a-z]+\d{6,}@/i,  // Only flag if 6+ consecutive numbers (like spam123456@)
          /@\d{3,}/  // Numbers in domain part (like @123spam.com)
        ];
        
        const isSuspicious = suspiciousEmailPatterns.some(pattern => 
          pattern.test(emailField.value)
        );
        
        if (isSuspicious) {
          alert('Please use a valid email address.');
          return false;
        }
      }
      
      // 5. Character repetition check
      if (messageField) {
        const message = messageField.value;
        // Check for excessive character repetition
        const repetitionPattern = /(.)\1{5,}/g;
        if (repetitionPattern.test(message)) {
          alert('Please write a normal message.');
          return false;
        }
      }
      
      // 6. Minimum message length
      if (messageField && messageField.value.trim().length < 10) {
        alert('Please write a more detailed message (minimum 10 characters).');
        return false;
      }
      
      // 7. Name validation
      if (nameField) {
        const name = nameField.value.trim();
        // Block obviously fake names
        const fakenames = ['test', 'admin', 'user', 'guest', 'demo', 'example'];
        if (fakenames.includes(name.toLowerCase()) || name.length < 2) {
          alert('Please enter your real name.');
          return false;
        }
      }
      
      // 8. Timing check
      const formLoadTime = sessionStorage.getItem('formLoadTime');
      const currentTime = Date.now();
      
      if (formLoadTime) {
        const timeDiff = currentTime - parseInt(formLoadTime);
        // If form submitted in less than 3 seconds, likely a bot
        if (timeDiff < 3000) {
          console.log('Spam submission blocked by timing');
          alert('Thank you for your message!');
          return false;
        }
        
        // If form submitted too quickly after page load (less than 1 second)
        if (timeDiff < 1000) {
          console.log('Spam submission blocked by instant submission');
          alert('Thank you for your message!');
          return false;
        }
      }
      
      // Show reCAPTCHA modal for verification
      showRecaptchaModal();
    });
    
    // reCAPTCHA Modal Functions
    function showRecaptchaModal() {
      const modal = document.getElementById('recaptcha-modal');
      if (modal) {
        modal.style.display = 'flex';
        // Reset reCAPTCHA if it was previously completed
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.reset();
        }
      }
    }
    
    function hideRecaptchaModal() {
      const modal = document.getElementById('recaptcha-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
    
    // reCAPTCHA Modal Event Listeners
    const recaptchaSubmit = document.getElementById('recaptcha-submit');
    const recaptchaCancel = document.getElementById('recaptcha-cancel');
    
    if (recaptchaSubmit) {
      recaptchaSubmit.addEventListener('click', function() {
        // Check if reCAPTCHA is completed
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
          alert('Please complete the reCAPTCHA verification.');
          return;
        }
        
        // reCAPTCHA completed, hide modal and submit form
        hideRecaptchaModal();
        
        // Submit the form
        contactForm.removeEventListener('submit', arguments.callee);
        contactForm.submit();
      });
    }
    
    if (recaptchaCancel) {
      recaptchaCancel.addEventListener('click', function() {
        hideRecaptchaModal();
      });
    }
    
    // Close modal when clicking outside
    const recaptchaModal = document.getElementById('recaptcha-modal');
    if (recaptchaModal) {
      recaptchaModal.addEventListener('click', function(e) {
        if (e.target === recaptchaModal) {
          hideRecaptchaModal();
        }
      });
    }
    
    // Record when the form loads
    sessionStorage.setItem('formLoadTime', Date.now().toString());
  }
});
