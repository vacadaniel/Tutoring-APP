// Enhanced auth.js with better debugging and fixed paths
const API_URL = 'http://localhost:5000';

// Function to register a new user
async function registerUser(userData) {
  console.log('Registering user:', userData.email);
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Registration failed:', data.error);
      throw new Error(data.error || 'Registration failed');
    }
    
    console.log('Registration successful, storing auth data');
    
    // Save token and user info to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Function to login a user
async function loginUser(credentials) {
  console.log('Attempting login for:', credentials.email);
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    // Log the response status
    console.log('Login response status:', response.status);
    
    // Parse the JSON response
    const data = await response.json();
    console.log('Login response data received');
    
    if (!response.ok) {
      console.error('Login failed:', data.error);
      throw new Error(data.error || 'Login failed');
    }
    
    console.log('Login successful, storing auth data');
    
    // Save token and user info to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Function to get the current authenticated user
function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  console.log('Raw user data from localStorage:', userJson);
  
  if (!userJson) {
    console.log('No user found in localStorage');
    return null;
  }
  
  try {
    const userData = JSON.parse(userJson);
    console.log('Parsed user data:', userData);
    return userData;
  } catch (error) {
    console.error('Error parsing user JSON:', error);
    return null;
  }
}

// Function to check if user is logged in
function isLoggedIn() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const isLoggedIn = !!token && !!user;
  console.log('Checking login status:', isLoggedIn, 'Token exists:', !!token, 'User exists:', !!user);
  
  if (token && user) {
    try {
      // Make sure user is valid JSON
      const userData = JSON.parse(user);
      console.log('User data exists with role:', userData.role);
      return true;
    } catch (e) {
      console.error('Error parsing user data:', e);
      return false;
    }
  }
  
  return false;
}

// Function to logout user
function logoutUser() {
  console.log('Logging out user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Instead of using an absolute path, use a relative path
  // This makes it work regardless of where the app is deployed
  console.log('Redirecting to welcome page');
  window.location.href = '../homepage/welcome.html';
}

// Function to make authenticated API calls
async function authFetch(url, options = {}) {
  console.log('Making authenticated request to:', url);
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token found');
    throw new Error('No authentication token found');
  }
  
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json', // Add this default
    },
  };
  
  console.log('Request headers:', authOptions.headers);
  
  try {
    const response = await fetch(`${API_URL}${url}`, authOptions);
    console.log('Response status:', response.status);
    
    // If unauthorized (token expired or invalid), logout user
    if (response.status === 401) {
      console.error('Unauthorized request - token may be expired');
      logoutUser();
      throw new Error('Your session has expired. Please login again.');
    }
    
    return response;
  } catch (error) {
    console.error('Error in authFetch:', error);
    throw error;
  }
}

// Function to redirect if not logged in
function requireAuth() {
  console.log('Checking auth requirement');
  if (!isLoggedIn()) {
    console.log('Auth required but user not logged in, redirecting');
    window.location.href = '../homepage/welcome.html';
    return false;
  }
  console.log('User is authenticated');
  return true;
}

// Export all functions
window.Auth = {
  registerUser,
  loginUser,
  getCurrentUser,
  isLoggedIn,
  logoutUser,
  authFetch,
  requireAuth
};

// Function to update navigation based on authentication status
function updateNavigation() {
  const isLoggedIn = Auth.isLoggedIn();
  const navElement = document.querySelector('nav ul');
  
  if (!navElement) {
    console.warn('Navigation element not found');
    return;
  }
  
  let navHTML = '';
  
  if (isLoggedIn) {
    const user = Auth.getCurrentUser();
    const isDashboard = window.location.href.includes('dashboard');
    const dashboardPath = user.role === 'student' ? 
      '../dashboard/student-dashboard.html' : 
      '../dashboard/tutor-dashboard.html';
    
    navHTML = `
      <li><a href="../homepage/welcome.html">Home</a></li>
      <li><a href="${dashboardPath}">Dashboard</a></li>
      <li><a href="../dashboard/tutors.html">Find Tutors</a></li>
      <li><a href="#" class="btn-secondary" id="logout-btn">Logout</a></li>
    `;
  } else {
    navHTML = `
      <li><a href="../homepage/welcome.html">Home</a></li>
      <li><a href="../aboutpage/about.html">About</a></li>
      <li><a href="../dashboard/tutors.html">Find Tutors</a></li>
      <li><a href="../dashboard/become-tutor.html" class="btn-secondary">Become a Tutor</a></li>
    `;
  }
  
  navElement.innerHTML = navHTML;
  
  // If user is logged in, attach logout event handler
  if (isLoggedIn) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
          Auth.logoutUser();
        }
      });
    }
  }
}

// Export the function with other Auth functions
window.Auth.updateNavigation = updateNavigation;

console.log('Auth module initialized');