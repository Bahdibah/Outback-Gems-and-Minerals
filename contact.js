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
    let mathAnswer = 0;
    let captchaPassed = false;
    
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
      
      // 4. Suspicious email patterns
      if (emailField) {
        const suspiciousEmailPatterns = [
          /^[a-zA-Z]+\d+@/,  // name followed by numbers
          /@\d+/,            // numbers after @
          /noreply|no-reply/i,
          /test@|admin@|info@.*\.tk$/i,
          /\.tk$|\.ml$|\.ga$/i  // suspicious TLDs
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
      
      // If CAPTCHA already passed, submit the form
      if (captchaPassed) {
        // Actually submit the form
        contactForm.removeEventListener('submit', arguments.callee);
        contactForm.submit();
        return;
      }
      
      // Show CAPTCHA modal
      showCaptchaModal();
    });
    
    // CAPTCHA Modal Functions
    function showCaptchaModal() {
      const modal = document.getElementById('captcha-modal');
      const mathQuestion = document.getElementById('math-question');
      const mathInput = document.getElementById('math-input');
      
      // Generate random math problem
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      mathAnswer = num1 + num2;
      
      mathQuestion.textContent = `${num1} + ${num2}`;
      mathInput.value = '';
      mathInput.focus();
      
      modal.style.display = 'flex';
    }
    
    function hideCaptchaModal() {
      const modal = document.getElementById('captcha-modal');
      modal.style.display = 'none';
    }
    
    // CAPTCHA Modal Event Listeners
    const captchaSubmit = document.getElementById('captcha-submit');
    const captchaCancel = document.getElementById('captcha-cancel');
    const mathInput = document.getElementById('math-input');
    
    if (captchaSubmit) {
      captchaSubmit.addEventListener('click', function() {
        const userAnswer = parseInt(mathInput.value);
        
        if (isNaN(userAnswer) || userAnswer !== mathAnswer) {
          alert('Incorrect answer. Please try again.');
          showCaptchaModal(); // Show new question
          return;
        }
        
        // CAPTCHA passed
        captchaPassed = true;
        hideCaptchaModal();
        
        // Submit the form
        contactForm.removeEventListener('submit', arguments.callee);
        contactForm.submit();
      });
    }
    
    if (captchaCancel) {
      captchaCancel.addEventListener('click', function() {
        hideCaptchaModal();
      });
    }
    
    // Allow Enter key to submit CAPTCHA
    if (mathInput) {
      mathInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          captchaSubmit.click();
        }
      });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('captcha-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          hideCaptchaModal();
        }
      });
    }
    
    // Record when the form loads
    sessionStorage.setItem('formLoadTime', Date.now().toString());
  }
});
