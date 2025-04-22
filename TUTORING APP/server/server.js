const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Configure MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           // Replace with your MySQL username
  password: 'Nelson26!',   // Replace with your MySQL password
  database: 'tutorconnect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// JWT Secret
const JWT_SECRET = 'tutorconnect-secret-key'; // In production, use environment variable

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Routes

// User Routes
const userRoutes = require('./routes/users');
app.use('/users', userRoutes(pool, bcrypt, jwt, JWT_SECRET, authenticateToken));

// Appointment Routes
const appointmentRoutes = require('./routes/appointments');
app.use('/appointments', authenticateToken, appointmentRoutes(pool));

// Message Routes
const messageRoutes = require('./routes/messages');
app.use('/messages', authenticateToken, messageRoutes(pool));

// Review Routes
const reviewRoutes = require('./routes/reviews');
app.use('/reviews', authenticateToken, reviewRoutes(pool));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
