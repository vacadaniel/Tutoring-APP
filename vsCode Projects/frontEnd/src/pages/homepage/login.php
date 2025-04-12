<?php
// This is a simple login handler that redirects to the appropriate dashboard
// In a real implementation, this would validate credentials against the backend API

// Start session
session_start();

// Check if form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get form data
    $username = $_POST['username'];
    $password = $_POST['password'];
    $remember = isset($_POST['remember']) ? true : false;
    
    // In a real implementation, you would validate credentials against your API
    // For demonstration, we'll use a simple check
    
    // Define API endpoint (would call your Node.js backend)
    $apiUrl = 'http://localhost:5000/users/login';
    
    // In a real implementation, you would make an API call like this:
    /*
    $data = array(
        'email' => $username,
        'password' => $password
    );
    
    $options = array(
        'http' => array(
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data)
        )
    );
    
    $context  = stream_context_create($options);
    $result = file_get_contents($apiUrl, false, $context);
    
    if ($result === FALSE) {
        // Handle error
        header('Location: ../homepage/welcome.html?error=connection');
        exit();
    }
    
    $response = json_decode($result, true);
    
    if (isset($response['token'])) {
        // Successful login
        $_SESSION['token'] = $response['token'];
        $_SESSION['user'] = $response['user'];
        
        // Set cookie if remember me is checked
        if ($remember) {
            setcookie('token', $response['token'], time() + (86400 * 30), "/"); // 30 days
        }
        
        // Redirect based on user role
        if ($response['user']['role'] === 'student') {
            header('Location: ../dashboard/dashboard.html');
        } else {
            header('Location: ../dashboard/tutor-dashboard.html');
        }
        exit();
    } else {
        // Failed login
        header('Location: ../homepage/welcome.html?error=invalid');
        exit();
    }
    */
    
    // For demonstration purposes, we'll use hardcoded credentials
    // In a real implementation, remove this and use the API call above
    
    // Demo student account
    if ($username === 'alex@example.com' && $password === 'password123') {
        $_SESSION['user'] = array(
            'id' => 'student1',
            'name' => 'Alex Johnson',
            'email' => 'alex@example.com',
            'role' => 'student',
            'school' => 'State University'
        );
        
        // Set cookie if remember me is checked
        if ($remember) {
            setcookie('user', 'alex@example.com', time() + (86400 * 30), "/"); // 30 days
        }
        
        // Redirect to student dashboard
        header('Location: ../dashboard/dashboard.html');
        exit();
    }
    
    // Demo tutor account
    else if ($username === 'morgan@example.com' && $password === 'password123') {
        $_SESSION['user'] = array(
            'id' => 'tutor1',
            'name' => 'Dr. Morgan Taylor',
            'email' => 'morgan@example.com',
            'role' => 'tutor',
            'school' => 'State University'
        );
        
        // Set cookie if remember me is checked
        if ($remember) {
            setcookie('user', 'morgan@example.com', time() + (86400 * 30), "/"); // 30 days
        }
        
        // Redirect to tutor dashboard
        header('Location: ../dashboard/tutor-dashboard.html');
        exit();
    }
    
    // Invalid credentials
    else {
        header('Location: ../homepage/welcome.html?error=invalid');
        exit();
    }
} else {
    // If not a POST request, redirect to the welcome page
    header('Location: ../homepage/welcome.html');
    exit();
}
?>