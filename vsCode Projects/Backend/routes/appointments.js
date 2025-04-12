// routes/appointments.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// Import models
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Review = require('../models/Review');
const Payment = require('../models/Payment');

// Create appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tutor_id, subject, start_time } = req.body;
    const student_id = req.user.id;
    
    // Check if student and tutor exist
    const student = await User.findById(student_id);
    const tutor = await User.findById(tutor_id);
    
    if (!student || !tutor || tutor.role !== 'tutor') {
      return res.status(400).json({ error: 'Invalid student or tutor ID' });
    }
    
    // Create appointment
    const newAppointment = new Appointment({
      student: student_id,
      tutor: tutor_id,
      subject,
      startTime: new Date(start_time)
    });
    
    await newAppointment.save();
    
    // Populate tutor and student info for the response
    await newAppointment.populate('tutor', 'name email');
    await newAppointment.populate('student', 'name email');
    
    res.status(201).json(newAppointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's appointments
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    let query;
    if (role === 'student') {
      query = { student: userId };
    } else {
      query = { tutor: userId };
    }
    
    // Get appointments with populated user info
    const appointments = await Appointment.find(query)
      .populate('student', 'name email')
      .populate('tutor', 'name email')
      .sort({ startTime: -1 });
    
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add review for appointment
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { rating, comment } = req.body;
    
    // Check if appointment exists and belongs to the user
    const appointment = await Appointment.findOne({ 
      _id: appointmentId,
      student: req.user.id
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or not authorized' });
    }
    
    // Check if review already exists
    const existingReview = await Review.findOne({ appointment: appointmentId });
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this appointment' });
    }
    
    // Create review
    const newReview = new Review({
      appointment: appointmentId,
      rating,
      comment
    });
    
    await newReview.save();
    
    // Update appointment status if needed
    if (appointment.status === 'confirmed') {
      appointment.status = 'completed';
      await appointment.save();
    }
    
    res.status(201).json(newReview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update appointment status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Check authorization (only involved users can update)
    if (appointment.student.toString() !== req.user.id && 
        appointment.tutor.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
    }
    
    // Update status
    appointment.status = status;
    await appointment.save();
    
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;