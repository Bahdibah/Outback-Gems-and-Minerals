# Google reCAPTCHA Setup Instructions

## Step 1: Get Your reCAPTCHA Keys

1. Go to https://www.google.com/recaptcha/admin/create
2. Sign in with your Google account
3. Fill out the form:
   - **Label**: "Outback Gems Contact Form" (or any name you prefer)
   - **reCAPTCHA type**: Choose "reCAPTCHA v2" → "I'm not a robot" Checkbox
   - **Domains**: Add your website domains:
     - outbackgems.com.au
     - www.outbackgems.com.au
     - (add any other domains you use for testing)
4. Accept the reCAPTCHA Terms of Service
5. Click "Submit"

## Step 2: Update Your Contact Page

Once you have your keys, you need to update the contact.html file:

1. Find this line in contact.html:
   ```html
   <div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY_HERE"></div>
   ```

2. Replace "YOUR_SITE_KEY_HERE" with your actual Site Key (the public key)

## Step 3: Update Your Backend

You'll also need to verify the reCAPTCHA on your server side in form-to-email.php:

Add this code to your PHP form handler:

```php
// reCAPTCHA verification
if (isset($_POST['g-recaptcha-response'])) {
    $recaptcha_secret = 'YOUR_SECRET_KEY_HERE'; // Replace with your secret key
    $recaptcha_response = $_POST['g-recaptcha-response'];
    
    // Verify with Google
    $verify_url = 'https://www.google.com/recaptcha/api/siteverify';
    $verify_data = array(
        'secret' => $recaptcha_secret,
        'response' => $recaptcha_response,
        'remoteip' => $_SERVER['REMOTE_ADDR']
    );
    
    $verify_response = file_get_contents($verify_url . '?' . http_build_query($verify_data));
    $verify_result = json_decode($verify_response, true);
    
    if (!$verify_result['success']) {
        // reCAPTCHA failed
        header('Location: contact.html?error=captcha');
        exit;
    }
}
```

## Benefits of Google reCAPTCHA vs Math Captcha

- ✅ **Much more effective** against bots and automated spam
- ✅ **Better user experience** - often just requires a single click
- ✅ **Adaptive difficulty** - Google adjusts based on user behavior
- ✅ **Machine learning powered** - constantly improving against new threats
- ✅ **Accessible** - works with screen readers and assistive technology
- ✅ **Mobile friendly** - works well on all devices

## Notes

- The math captcha has been completely removed
- All existing spam protection (honeypot, keyword filtering, etc.) is still active
- reCAPTCHA adds an additional layer of protection
- The form will not submit without completing the reCAPTCHA