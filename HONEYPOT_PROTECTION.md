# 🍯 Honeypot Anti-Bot Protection System

## Overview
Our website now has comprehensive honeypot protection implemented across all forms to prevent bot submissions and spam.

## Protected Forms

### ✅ **Contact Form** (`contact.html`)
- **Location:** Main contact page
- **Protection:** Honeypot field + timing validation + server-side PHP validation
- **Honeypot Field:** `website` (hidden input)
- **Server Handler:** `form-to-email.php`

### ✅ **Email Notification Modal** (`view-product.html`)  
- **Location:** Product pages - "Notify when available" button
- **Protection:** Honeypot field + client-side validation + server-side PHP validation
- **Honeypot Field:** `notification-website` (hidden input)
- **Server Handler:** `form-to-email.php`

### ✅ **Newsletter Signup** (`index.html`)
- **Location:** Homepage newsletter section
- **Protection:** Honeypot field + client-side validation
- **Honeypot Field:** `newsletter-website` (hidden input)
- **Server Handler:** Google Apps Script

## How It Works

### 1. **Honeypot Fields**
- Hidden input fields that are invisible to human users
- CSS positions them off-screen with `position: absolute; left: -9999px`
- Bots often auto-fill ALL form fields, including hidden ones
- If honeypot field contains any value → submission is blocked

### 2. **Client-Side Protection**
```javascript
// Example from contact.js
const honeypot = document.getElementById('website');
if (honeypot && honeypot.value.trim() !== '') {
  console.log('Spam submission blocked by honeypot');
  alert('Thank you for your message!'); // Fake success to confuse bots
  return false;
}
```

### 3. **Server-Side Protection (PHP)**
```php
// Example from form-to-email.php
$honeypot = isset($_POST['website']) ? trim($_POST['website']) : '';
if (!empty($honeypot)) {
  http_response_code(200); // Return success to confuse bots
  echo "Thank you for your message!";
  exit;
}
```

### 4. **Additional Protections**
- **Timing validation:** Contact form blocks submissions faster than 3 seconds
- **Email validation:** Client and server-side email format validation
- **Input sanitization:** Strip HTML tags and trim whitespace

## Maintenance

### Adding Honeypot to New Forms
1. **HTML:** Add hidden honeypot field
```html
<div class="honeypot-field" aria-hidden="true">
  <label for="website">Website (leave blank):</label>
  <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
</div>
```

2. **CSS:** Ensure honeypot styling exists
```css
.honeypot-field {
  position: absolute !important;
  left: -9999px !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
```

3. **JavaScript:** Add validation
```javascript
const honeypot = form.querySelector('input[name="website"]');
if (honeypot && honeypot.value.trim() !== '') {
  // Block submission
  return false;
}
```

## Google Apps Script Update Needed

The newsletter form submits to Google Apps Script. Add this to your Google Apps Script:

```javascript
function doPost(e) {
  // Honeypot spam protection
  if (e.parameter.website && e.parameter.website.trim() !== '') {
    // Spam submission - return fake success
    return ContentService.createTextOutput('success');
  }
  
  // Continue with normal processing...
  const email = e.parameter.email;
  // ... rest of your code
}
```

## Status
- ✅ Contact form protected
- ✅ Email notification modal protected  
- ✅ Newsletter form protected (client-side)
- ⚠️ Newsletter form needs Google Apps Script update for server-side protection

## Testing
To test honeypot protection:
1. Open browser developer tools
2. Find the hidden honeypot field
3. Add a value to it
4. Submit the form
5. Should show success message but not actually process

Bot submissions should now be significantly reduced! 🎯
