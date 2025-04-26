// This should be in frontend/js/auth.js
const API_URL = 'http://localhost:5000';

// Function to register a new user
async function registerUser(userData) {
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
      throw new Error(data.error || 'Registration failed');
    }
    
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
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
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
  return userJson ? JSON.parse(userJson) : null;
}

// Function to check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Function to logout user
function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/homepage/welcome.html';
}

// Function to make authenticated API calls
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
  
  const response = await fetch(`${API_URL}${url}`, authOptions);
  
  // If unauthorized (token expired or invalid), logout user
  if (response.status === 401) {
    logoutUser();
    throw new Error('Your session has expired. Please login again.');
  }
  
  return response;
}

// Function to redirect if not logged in
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/homepage/welcome.html';
    return false;
  }
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

