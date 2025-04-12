// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

// Import models
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');

// User registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, school } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      school
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email, role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        school: newUser.school
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1d' }
    );
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tutors with filters
router.get('/tutors', async (req, res) => {
  try {
    const { school, subject, rating } = req.query;
    
    // Base query for tutors
    let query = { role: 'tutor' };
    
    // Add filter for school if provided
    if (school) {
      query.school = school;
    }
    
    let tutors = await User.find(query).select('-password');
    
    // If rating filter is provided, we need to filter tutors by their average rating
    if (rating) {
      const minRating = parseFloat(rating);
      
      // For each tutor, calculate their average rating
      const tutorsWithRating = [];
      
      for (const tutor of tutors) {
        // Find all appointments for this tutor
        const appointments = await Appointment.find({ tutor: tutor._id });
        
        if (appointments.length > 0) {
          // Get all reviews for these appointments
          const appointmentIds = appointments.map(app => app._id);
          const reviews = await Review.find({ appointment: { $in: appointmentIds } });
          
          if (reviews.length > 0) {
            // Calculate average rating
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            const avgRating = totalRating / reviews.length;
            
            // Add to result if rating meets minimum
            if (avgRating >= minRating) {
              tutorsWithRating.push({
                ...tutor.toObject(),
                avgRating
              });
            }
          }
        }
      }
      
      tutors = tutorsWithRating;
    }
    
    res.json(tutors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific tutor by ID
router.get('/tutors/:id', async (req, res) => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor' }).select('-password');
    
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }
    
    // Get tutor's appointments
    const appointments = await Appointment.find({ tutor: tutor._id }).countDocuments();
    
    // Get tutor's reviews
    const tutorAppointments = await Appointment.find({ tutor: tutor._id });
    const appointmentIds = tutorAppointments.map(app => app._id);
    const reviews = await Review.find({ appointment: { $in: appointmentIds } });
    
    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      avgRating = totalRating / reviews.length;
    }
    
    res.json({
      ...tutor.toObject(),
      appointments,
      reviews: reviews.length,
      avgRating
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;