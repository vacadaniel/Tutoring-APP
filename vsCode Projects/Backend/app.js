// app.js - Main server file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import routers
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const messageRoutes = require('./routes/messages');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for front-end requests
app.use(express.json()); // Parse JSON request bodies

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://JohnDanielDylan:JohnDanielDylan@tutor.acwtgsp.mongodb.net/?retryWrites=true&w=majority&appName=Tutor";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('TutorConnect API is running');
});

// Use routers
app.use('/users', userRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/messages', messageRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
