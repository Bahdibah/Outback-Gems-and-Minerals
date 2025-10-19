<?php
$errors = [];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Honeypot spam protection
    $honeypot = isset($_POST['website']) ? trim($_POST['website']) : '';
    if (!empty($honeypot)) {
        // This is likely spam - honeypot field was filled
        http_response_code(200); // Return success to confuse bots
        echo "Thank you for your message!";
        exit;
    }
    
    // reCAPTCHA verification
    if (isset($_POST['g-recaptcha-response'])) {
        $recaptcha_secret = '6Lc0lO8rAAAAACFdzgeeR2qgFuW91628Wi6bhsec';
        $recaptcha_response = $_POST['g-recaptcha-response'];
        
        // Verify with Google
        $verify_url = 'https://www.google.com/recaptcha/api/siteverify';
        $verify_data = array(
            'secret' => $recaptcha_secret,
            'response' => $recaptcha_response,
            'remoteip' => $_SERVER['REMOTE_ADDR']
        );
        
        $options = array(
            'http' => array(
                'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                'method'  => 'POST',
                'content' => http_build_query($verify_data)
            )
        );
        $context = stream_context_create($options);
        $verify_response = file_get_contents($verify_url, false, $context);
        $verify_result = json_decode($verify_response, true);
        
        if (!$verify_result['success']) {
            // reCAPTCHA failed
            http_response_code(400);
            echo "reCAPTCHA verification failed. Please try again.";
            exit;
        }
    } else {
        // No reCAPTCHA response provided
        http_response_code(400);
        echo "Please complete the reCAPTCHA verification.";
        exit;
    }
    
    // Get POST data
    $name = isset($_POST['name']) ? strip_tags(trim($_POST['name'])) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $message = isset($_POST['message']) ? strip_tags(trim($_POST['message'])) : '';

    // ENHANCED SPAM DETECTION
    
    // 1. Keyword spam detection
    $spamKeywords = [
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
    
    $messageCheck = strtolower($message);
    foreach ($spamKeywords as $keyword) {
        if (strpos($messageCheck, $keyword) !== false) {
            http_response_code(200);
            echo "Thank you for your message!";
            exit;
        }
    }
    
    // 2. Multiple URL detection
    $urlCount = preg_match_all('/(https?:\/\/[^\s]+)/i', $message);
    if ($urlCount > 1) {
        http_response_code(400);
        echo "Please limit your message to one website link.";
        exit;
    }
    
    // 3. Suspicious email patterns (more targeted)
    $suspiciousEmailPatterns = [
        '/noreply|no-reply/i',
        '/test@|admin@.*\.tk$/i',
        '/\.tk$|\.ml$|\.ga$|\.cf$/i',  // suspicious TLDs only
        '/^[a-z]+\d{6,}@/i',  // Only flag if 6+ consecutive numbers
        '/@\d{3,}/'  // Numbers in domain part
    ];
    
    foreach ($suspiciousEmailPatterns as $pattern) {
        if (preg_match($pattern, $email)) {
            http_response_code(400);
            echo "Please use a valid email address.";
            exit;
        }
    }
    
    // 4. Character repetition check
    if (preg_match('/(.)\1{5,}/', $message)) {
        http_response_code(400);
        echo "Please write a normal message.";
        exit;
    }
    
    // 5. Minimum message length
    if (strlen(trim($message)) < 10) {
        http_response_code(400);
        echo "Please write a more detailed message (minimum 10 characters).";
        exit;
    }
    
    // 6. Name validation
    $fakenames = ['test', 'admin', 'user', 'guest', 'demo', 'example'];
    if (in_array(strtolower($name), $fakenames) || strlen($name) < 2) {
        http_response_code(400);
        echo "Please enter your real name.";
        exit;
    }
    
    // 7. Rate limiting by IP (simple file-based)
    $ip = $_SERVER['REMOTE_ADDR'];
    $rateFile = 'rate_limit.txt';
    $currentTime = time();
    $rateLimit = 5; // Maximum 5 submissions per hour
    $timeWindow = 3600; // 1 hour
    
    if (file_exists($rateFile)) {
        $submissions = json_decode(file_get_contents($rateFile), true) ?: [];
        
        // Clean old submissions
        $submissions = array_filter($submissions, function($timestamp) use ($currentTime, $timeWindow) {
            return ($currentTime - $timestamp) < $timeWindow;
        });
        
        // Count submissions from this IP
        $ipSubmissions = array_filter($submissions, function($timestamp, $submissionIp) use ($ip) {
            return $submissionIp === $ip;
        }, ARRAY_FILTER_USE_BOTH);
        
        if (count($ipSubmissions) >= $rateLimit) {
            http_response_code(429);
            echo "Too many submissions. Please wait before sending another message.";
            exit;
        }
        
        // Add current submission
        $submissions[$ip . '_' . $currentTime] = $currentTime;
    } else {
        $submissions = [$ip . '_' . $currentTime => $currentTime];
    }
    
    file_put_contents($rateFile, json_encode($submissions));

    // Validate form fields
    if (empty($name)) {
        $errors[] = 'Name is empty';
    }

    if (empty($email)) {
        $errors[] = 'Email is empty';
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email is invalid';
    }

    if (empty($message)) {
        $errors[] = 'Message is empty';
    }

    // If no errors, send email
    if (empty($errors)) {
        // Recipient email address 
        $recipient = "support@outbackgems.com.au";

        // Additional headers
        $headers = "From: $name <$email>\r\n";
        $headers .= "Reply-To: $email\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $subject = "Contact Form Submission from $name";
        $body = "Name: $name\nEmail: $email\n\nMessage:\n$message";

        // Send email
        if (mail($recipient, $subject, $body, $headers)) {
            // Redirect back to contact page with success message
            header("Location: contact.html?success=1");
            exit;
        } else {
            // Redirect back to contact page with error message
            header("Location: contact.html?error=1");
            exit;
        }
    } else {
        // Display errors
        echo "The form contains the following errors:<br>";
        foreach ($errors as $error) {
            echo "- $error<br>";
        }
    }
} else {
    // Not a POST request, display a 403 forbidden error
    header("HTTP/1.1 403 Forbidden");
    echo "You are not allowed to access this page.";
}
?>